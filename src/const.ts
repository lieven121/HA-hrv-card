import type { Action, CardConfig, ModeKey, ResolvedConfig, SourceKey } from "./types";

export const CARD_TYPE = "hrv-card";
export const EDITOR_TYPE = "hrv-card-editor";

export type SourceGroup = "temps" | "fans" | "hp" | "status";

/** Every value the card can read, with its editor label and section. */
export const SOURCES: { key: SourceKey; label: string; group: SourceGroup }[] = [
  { key: "outdoor_temp", label: "Outdoor air (fresh air in)", group: "temps" },
  { key: "extract_temp", label: "Extract air (from the house)", group: "temps" },
  { key: "supply_temp", label: "Supply air (into the house)", group: "temps" },
  { key: "exhaust_temp", label: "Exhaust air (to outside)", group: "temps" },
  { key: "supply_fan", label: "Supply fan speed", group: "fans" },
  { key: "exhaust_fan", label: "Exhaust fan speed", group: "fans" },
  { key: "compressor", label: "Compressor frequency (Hz)", group: "hp" },
  { key: "heat_pump_mode", label: "Mode (heat / cool / auto / dry / fan only / off)", group: "hp" },
  { key: "target_temp", label: "Set temperature (auto mode compares it with the extract air)", group: "hp" },
  { key: "heat_pump_action", label: "Current action (optional, e.g. hvac_action)", group: "hp" },
  { key: "defrost", label: "Defrost active (optional)", group: "hp" },
  { key: "efficiency", label: "Exchanger efficiency (% or 0–1)", group: "status" },
  { key: "bypass", label: "Bypass open", group: "status" },
  { key: "filter", label: "Filter alarm", group: "status" },
];

/** Default values recognised per mode, checked in this order (exact match first, then "contains"). */
export const MODE_DEFAULTS: Record<ModeKey, string[]> = {
  defrost: ["defrost", "defrosting"],
  fan_only: ["fan_only", "fan only", "fan", "ventilation"],
  dry: ["dry", "drying"],
  auto: ["auto", "heat_cool"],
  heat: ["heat", "heating"],
  cool: ["cool", "cooling"],
  off: ["off", "standby"],
};
export const MODE_KEYS = Object.keys(MODE_DEFAULTS) as ModeKey[];

export const ACTIVE_ACTIONS = new Set<Action>(["heating", "cooling", "drying", "defrost"]);

/** Fan values that mean "stopped", in the supported languages. */
export const OFF_STATES = new Set(["off", "0", "stop", "stopped", "uit", "arrêt", "aus"]);

export const DEFAULT_EFFICIENCY = 0.8;
export const DEFAULT_DEADBAND = 0.5;

export function resolveConfig(config: CardConfig): ResolvedConfig {
  return {
    efficiency: DEFAULT_EFFICIENCY,
    decimals: 1,
    show_header: true,
    ...config,
    entities: { ...(config.entities ?? {}) },
    extra: config.extra ?? [],
  };
}
