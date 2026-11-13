export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    unit_of_measurement?: string;
    icon?: string;
  };
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  locale?: { language?: string };
}

/** Where a value comes from: an entity's state, or one of its attributes. */
export interface Source {
  entity: string;
  attribute?: string;
}

/** In YAML a source is either "sensor.x" or { entity: "climate.x", attribute: "fan_mode" }. */
export type SourceConfig = string | Partial<Source>;

export type SourceKey =
  | "outdoor_temp" | "extract_temp" | "supply_temp" | "exhaust_temp"
  | "supply_fan" | "exhaust_fan"
  | "compressor" | "heat_pump_mode" | "target_temp" | "heat_pump_action" | "defrost"
  | "efficiency" | "bypass" | "filter";

export type SourceMap = Partial<Record<SourceKey, SourceConfig>>;

export type Language = "auto" | "en" | "nl" | "fr" | "de";

export type ModeKey = "defrost" | "fan_only" | "dry" | "auto" | "heat" | "cool" | "off";

export type Action = "heating" | "cooling" | "drying" | "defrost" | "idle" | "off";

/** One fan step: the value the entity reports and what the card shows for it. */
export interface FanSpeed {
  state: string;
  label?: string;
}

export interface ExtraTile {
  entity: string;
  attribute?: string;
  name?: string;
  icon?: string;
  unit?: string;
  decimals?: number | string;
}

/** Comma-separated values per mode; `heating`/`cooling` are older spellings of `heat`/`cool`. */
export type HeatPumpStates = Partial<Record<ModeKey | "heating" | "cooling", string>>;

export interface CardConfig {
  type?: string;
  name?: string;
  /** main entity, opened when tapping the title or the status chips */
  entity?: string | { entity?: string };
  language?: Language;
  efficiency?: number;
  decimals?: number;
  show_header?: boolean;
  temperature_unit?: string;
  entities?: SourceMap;
  fan_speeds?: FanSpeed[];
  supply_fan_speeds?: FanSpeed[];
  exhaust_fan_speeds?: FanSpeed[];
  fan_levels?: number;
  heat_pump_states?: HeatPumpStates;
  auto_deadband?: number;
  extra?: ExtraTile[];
}

export interface ResolvedConfig extends CardConfig {
  efficiency: number;
  decimals: number;
  show_header: boolean;
  entities: SourceMap;
  extra: ExtraTile[];
}
