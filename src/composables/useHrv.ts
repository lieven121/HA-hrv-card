import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";
import { strings, type Strings } from "../i18n";
import { airflow, type Airflow } from "../logic/airflow";
import { fanState, type FanState } from "../logic/fan";
import { formatTemp } from "../logic/format";
import { heatPumpState } from "../logic/heatpump";
import { isOn, readSource, toNumber, type Reading } from "../logic/sources";
import type { Action, HomeAssistant, ModeKey, ResolvedConfig, SourceConfig, SourceKey } from "../types";

export interface Temps {
  outdoor: number | null;
  supply: number | null;
  extract: number | null;
  exhaust: number | null;
}

/** Everything the card shows, derived from hass + config on every update. */
export interface HrvState {
  temps: Temps;
  hz: number | null;
  bypass: boolean;
  filter: boolean;
  mode: ModeKey | null;
  action: Action;
  target: number | null;
  /** mode entity says "off": streams turn grey, fans stop */
  unitOff: boolean;
  air: Airflow;
  fans: { supply: FanState; exhaust: FanState };
}

export interface HrvContext {
  config: ComputedRef<ResolvedConfig>;
  t: ComputedRef<Strings>;
  hass(): HomeAssistant;
  read(key: SourceKey): Reading | null;
  fmtTemp(v: number | null, key: SourceKey): string;
  /** entity opened by the title and status chips */
  mainEntity: ComputedRef<string>;
  state: ComputedRef<HrvState>;
  /** open Home Assistant's more-info dialog for a source key or source */
  moreInfo(ev: Event, target: SourceKey | SourceConfig | undefined): void;
}

const KEY: InjectionKey<HrvContext> = Symbol("hrv");

export function provideHrv(props: { hass: HomeAssistant; config: ResolvedConfig }): HrvContext {
  const hass = () => props.hass;
  const config = computed(() => props.config);
  const t = computed(() => strings(config.value.language, hass().locale?.language || hass().language));

  const read = (key: SourceKey) => readSource(hass(), config.value.entities[key]);
  const num = (key: SourceKey) => toNumber(read(key));
  const on = (key: SourceKey) => isOn(read(key));

  const tempUnit = () => config.value.temperature_unit || "°C";
  function fmtTemp(v: number | null, key: SourceKey): string {
    const r = read(key);
    // an attribute (e.g. current_temperature) has no unit of its own
    const unit = r && !r.source.attribute && r.entity.attributes.unit_of_measurement || tempUnit();
    return formatTemp(v, config.value.decimals, unit);
  }

  const mainEntity = computed(() => {
    const e = config.value.entity;
    return typeof e === "string" ? e : e?.entity ?? "";
  });

  const state = computed<HrvState>(() => {
    const c = config.value;
    const temps: Temps = {
      outdoor: num("outdoor_temp"),
      supply: num("supply_temp"),
      extract: num("extract_temp"),
      exhaust: num("exhaust_temp"),
    };
    const hz = num("compressor");
    const bypass = on("bypass");
    const target = num("target_temp");
    const { mode, action } = heatPumpState({
      modeValue: read("heat_pump_mode")?.value,
      actionValue: read("heat_pump_action")?.value,
      defrost: on("defrost"),
      target, hz,
      supply: temps.supply,
      extract: temps.extract,
      states: c.heat_pump_states,
      deadband: c.auto_deadband,
    });
    const unitOff = mode === "off";
    const air = airflow({
      ...temps, hz, bypass, action, unitOff,
      effSensor: num("efficiency"),
      efficiency: c.efficiency,
    });

    // unit off → fans stand still and show "Off", whatever the fan entities report
    const fan = (key: "supply_fan" | "exhaust_fan"): FanState => unitOff
      ? { dur: 0, label: t.value.fanOff }
      : fanState(read(key), {
        speeds: c[`${key}_speeds`] ?? c.fan_speeds ?? [],
        levels: c.fan_levels,
        offLabel: t.value.fanOff,
      });

    return {
      temps, hz, bypass, filter: on("filter"), mode, action, target, unitOff, air,
      fans: { supply: fan("supply_fan"), exhaust: fan("exhaust_fan") },
    };
  });

  function moreInfo(ev: Event, target: SourceKey | SourceConfig | undefined) {
    // a string without a dot is a source key, otherwise an entity id
    const src = typeof target === "string" && !target.includes(".")
      ? config.value.entities[target as SourceKey]
      : target;
    const entityId = typeof src === "string" ? src : src?.entity;
    if (!entityId || !(ev.currentTarget instanceof EventTarget)) return;
    ev.currentTarget.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId }, bubbles: true, composed: true,
    }));
  }

  const ctx: HrvContext = { config, t, hass, read, fmtTemp, mainEntity, state, moreInfo };
  provide(KEY, ctx);
  return ctx;
}

export function useHrv(): HrvContext {
  const ctx = inject(KEY);
  if (!ctx) throw new Error("useHrv() used outside of CardContent");
  return ctx;
}
