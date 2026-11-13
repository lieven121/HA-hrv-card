/*
 * A fake `hass` object for the dev page: two ventilation units (one heating in
 * winter, one cooling in summer with the bypass open) whose values drift a little
 * every couple of seconds.
 */
import type { HassEntity, HomeAssistant } from "../src/types";

interface Unit {
  prefix: string;
  mode: string;
  action?: string;
  target: number;
  outdoor: number;
  extract: number;
  supply: number;
  exhaust: number;
  hz: number;
  supplyFan: string;
  exhaustFan: number;
  bypass: boolean;
  filter: boolean;
  power: number;
  humidity: number;
}

const units: Unit[] = [
  {
    prefix: "hrv", mode: "heat", action: "heating", target: 22, outdoor: 3.2, extract: 21.3, supply: 27.8, exhaust: -1.4,
    hz: 48, supplyFan: "medium", exhaustFan: 2, bypass: false, filter: false, power: 412, humidity: 46,
  },
  {
    prefix: "hrv_summer", mode: "cool", target: 22, outdoor: 29.5, extract: 24.8, supply: 17.9, exhaust: 33.1,
    hz: 36, supplyFan: "65", exhaustFan: 70, bypass: true, filter: true, power: 655, humidity: 58,
  },
];

const jitter = (v: number, spread: number) => +(v + (Math.random() - 0.5) * spread).toFixed(1);

function step(u: Unit) {
  u.outdoor = jitter(u.outdoor, 0.2);
  u.extract = jitter(u.extract, 0.1);
  u.supply = jitter(u.supply, 0.3);
  u.exhaust = jitter(u.exhaust, 0.3);
  u.hz = Math.max(20, Math.min(90, Math.round(jitter(u.hz, 6))));
  u.power = Math.round(jitter(u.power, 30));
}

function entity(entity_id: string, state: string | number | boolean, attributes: HassEntity["attributes"] = {}): HassEntity {
  const s = typeof state === "boolean" ? (state ? "on" : "off") : String(state);
  return { entity_id, state: s, attributes };
}

function states(): HomeAssistant["states"] {
  const out: HomeAssistant["states"] = {};
  const add = (e: HassEntity) => { out[e.entity_id] = e; };
  for (const u of units) {
    const p = u.prefix;
    const C = { unit_of_measurement: "°C" };
    add(entity(`climate.${p}`, u.mode, {
      friendly_name: p === "hrv" ? "Ventilatie" : "Ventilation (summer)",
      hvac_modes: ["off", "heat", "cool", "auto", "dry", "fan_only"],
      current_temperature: u.extract, temperature: u.target, current_humidity: u.humidity,
      fan_mode: u.supplyFan, fan_modes: ["low", "medium", "high", "boost"],
      ...(u.action ? { hvac_action: u.action } : {}),
    }));
    add(entity(`sensor.${p}_outdoor_temperature`, u.outdoor, C));
    add(entity(`sensor.${p}_supply_temperature`, u.supply, C));
    add(entity(`sensor.${p}_exhaust_temperature`, u.exhaust, C));
    add(entity(`sensor.${p}_supply_fan`, u.supplyFan, { unit_of_measurement: "%" }));
    add(entity(`sensor.${p}_exhaust_fan`, u.exhaustFan, p === "hrv" ? {} : { unit_of_measurement: "%" }));
    add(entity(`sensor.${p}_compressor_frequency`, u.hz, { unit_of_measurement: "Hz" }));
    add(entity(`binary_sensor.${p}_bypass`, u.bypass));
    add(entity(`binary_sensor.${p}_filter_alarm`, u.filter));
    add(entity(`sensor.${p}_power`, u.power, { unit_of_measurement: "W", friendly_name: "Power" }));
    add(entity(`sensor.${p}_energy_today`, (u.power / 110).toFixed(2), { unit_of_measurement: "kWh", friendly_name: "Energy today" }));
  }
  return out;
}

/** Calls `onUpdate` with a fresh hass object now and every `intervalMs`, like HA does on state changes. */
export function startMockHass(onUpdate: (hass: HomeAssistant) => void, intervalMs = 2000): () => void {
  const emit = () => onUpdate({ states: states(), locale: { language: "nl" } });
  emit();
  const timer = setInterval(() => { units.forEach(step); emit(); }, intervalMs);
  return () => clearInterval(timer);
}
