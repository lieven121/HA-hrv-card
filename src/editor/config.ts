/*
 * Pure helpers behind the visual editor: the editable copy of the config, the
 * cleaned-up config that is sent back to Home Assistant, and the form mappings.
 */
import { DEFAULT_DEADBAND, DEFAULT_EFFICIENCY, MODE_KEYS } from "../const";
import { normSource } from "../logic/sources";
import type { CardConfig, ExtraTile, FanSpeed, HomeAssistant, Language, ModeKey, SourceKey, SourceMap } from "../types";

/** The config while editing: lists always present, possibly with empty rows. */
export interface EditorConfig extends CardConfig {
  entities: SourceMap;
  fan_speeds: FanSpeed[];
  extra: ExtraTile[];
}

export function toEditorConfig(config: CardConfig | undefined): EditorConfig {
  const c = JSON.parse(JSON.stringify(config ?? {})) as CardConfig;
  return { ...c, entities: c.entities ?? {}, fan_speeds: c.fan_speeds ?? [], extra: c.extra ?? [] };
}

/** Drop empty sources, empty fan steps and empty lists; sources without attribute become plain strings. */
export function tidyConfig(config: EditorConfig): CardConfig {
  const cfg = JSON.parse(JSON.stringify(config)) as EditorConfig;
  for (const [k, v] of Object.entries(cfg.entities) as [SourceKey, SourceMap[SourceKey]][]) {
    const s = normSource(v);
    if (!s) delete cfg.entities[k];
    else cfg.entities[k] = s.attribute ? { entity: s.entity, attribute: s.attribute } : s.entity;
  }
  if (!cfg.entity) delete cfg.entity;
  if (!cfg.name) delete cfg.name;
  const out: CardConfig = cfg;
  const speeds = cfg.fan_speeds.filter((s) => s.state !== "" || s.label !== "");
  if (speeds.length) out.fan_speeds = speeds; else delete out.fan_speeds;
  if (!cfg.extra.length) delete out.extra;
  return out;
}

/** Point `key` at a new entity/attribute; picking another entity clears the attribute. */
export function setSource(entities: SourceMap, key: SourceKey, v: { entity?: string; attribute?: string }): void {
  const prev = normSource(entities[key]);
  const attribute = prev?.entity && v.entity !== prev.entity ? "" : v.attribute;
  entities[key] = v.entity ? { entity: v.entity, attribute: attribute || undefined } : "";
}

export interface GeneralForm {
  name: string;
  entity: string;
  language: Language;
  decimals: number;
  efficiency: number;
  show_header: boolean;
}

export function generalForm(c: EditorConfig): GeneralForm {
  return {
    name: c.name || "",
    entity: typeof c.entity === "string" ? c.entity : c.entity?.entity || "",
    language: c.language || "auto",
    decimals: c.decimals ?? 1,
    efficiency: c.efficiency ?? DEFAULT_EFFICIENCY,
    show_header: c.show_header !== false,
  };
}

export type StatesForm = Partial<Record<ModeKey, string>> & { auto_deadband?: number | string };

export function statesForm(c: EditorConfig): StatesForm {
  const hs = c.heat_pump_states ?? {};
  const legacy = (k: ModeKey) => (k === "heat" ? hs.heating : k === "cool" ? hs.cooling : "");
  return {
    ...Object.fromEntries(MODE_KEYS.map((k) => [k, hs[k] || legacy(k) || ""])),
    auto_deadband: c.auto_deadband ?? DEFAULT_DEADBAND,
  };
}

/** Store only the modes that were filled in, and the dead band when it isn't the default. */
export function applyStatesForm(c: EditorConfig, v: StatesForm): void {
  const out: Partial<Record<ModeKey, string>> = {};
  for (const k of MODE_KEYS) if (v[k]) out[k] = v[k];
  if (Object.keys(out).length) c.heat_pump_states = out; else delete c.heat_pump_states;
  if (v.auto_deadband !== "" && v.auto_deadband != null && Number(v.auto_deadband) !== DEFAULT_DEADBAND) {
    c.auto_deadband = Number(v.auto_deadband);
  } else delete c.auto_deadband;
}

/** Tile form values without the emptied fields. */
export function cleanTile(v: Record<string, unknown>): ExtraTile {
  const clean: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) if (val !== "" && val != null) clean[k] = val;
  return clean as unknown as ExtraTile;
}

/**
 * Fill the fan steps from the fan entity's list of options (fan_modes, preset_modes,
 * options…), keeping labels already entered. Returns a message for the user.
 */
export function importSpeeds(hass: HomeAssistant | undefined, c: EditorConfig): string {
  const src = normSource(c.entities.supply_fan) || normSource(c.entities.exhaust_fan);
  if (!src || !hass) return "Pick a supply fan entity first.";
  const st = hass.states[src.entity];
  if (!st) return `${src.entity} was not found.`;
  const a = st.attributes || {};
  const candidates = [src.attribute && `${src.attribute}s`, "fan_modes", "preset_modes", "options", "speed_list"]
    .filter((k): k is string => !!k);
  const key = candidates.find((k) => Array.isArray(a[k]) && (a[k] as unknown[]).length);
  if (!key) return `No list of values found on ${src.entity}. Add the steps by hand.`;
  const values = a[key] as unknown[];
  const old = Object.fromEntries(c.fan_speeds.map((s) => [String(s.state).toLowerCase(), s.label]));
  c.fan_speeds.splice(0, c.fan_speeds.length,
    ...values.map((v) => ({ state: String(v), label: old[String(v).toLowerCase()] || "" })));
  return `Imported ${values.length} values from ${key}. Check the order (slowest first) and fill in the labels.`;
}

/** Swap item i with its neighbour (`dir` −1 = up, +1 = down). */
export function move<T>(list: T[], i: number, dir: -1 | 1): void {
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}
