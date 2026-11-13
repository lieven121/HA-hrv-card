import { ACTIVE_ACTIONS, DEFAULT_DEADBAND, MODE_DEFAULTS, MODE_KEYS } from "../const";
import type { Strings } from "../i18n";
import type { Action, HeatPumpStates, ModeKey } from "../types";

const LEGACY: Partial<Record<ModeKey, "heating" | "cooling">> = { heat: "heating", cool: "cooling" };

/** Lower-case values that mean `mode`: the user's comma-separated list, or the defaults. */
export function modeTokens(states: HeatPumpStates, mode: ModeKey): string[] {
  const legacy = LEGACY[mode];
  const v = states[mode] != null && states[mode] !== "" ? states[mode] : legacy ? states[legacy] : undefined;
  return (v ? String(v).split(",") : MODE_DEFAULTS[mode]).map((x) => x.trim().toLowerCase()).filter(Boolean);
}

/** Mode from the mode entity's value; null when there is no (usable) value. */
export function resolveMode(value: unknown, states: HeatPumpStates = {}): ModeKey | null {
  if (value == null) return null;
  const s = String(value).toLowerCase();
  if (s === "unavailable" || s === "unknown") return null;
  return MODE_KEYS.find((k) => modeTokens(states, k).includes(s))
    ?? MODE_KEYS.find((k) => modeTokens(states, k).some((x) => s.includes(x)))
    ?? "off";
}

/** Action from an hvac_action-like value. */
export function parseAction(value: unknown): Action | null {
  if (value == null) return null;
  const s = String(value).toLowerCase();
  if (s.includes("defrost")) return "defrost";
  if (s.includes("heat")) return "heating";
  if (s.includes("cool")) return "cooling";
  if (s.includes("dry")) return "drying";
  return s === "off" ? "off" : "idle";
}

export interface HeatPumpInput {
  /** raw value of the mode entity (undefined when not configured) */
  modeValue?: unknown;
  /** raw value of the current-action entity */
  actionValue?: unknown;
  defrost: boolean;
  target: number | null;
  /** compressor frequency; null when unknown */
  hz: number | null;
  supply: number | null;
  extract: number | null;
  states?: HeatPumpStates;
  deadband?: number;
}

/**
 * What the heat pump is doing. A defrost sensor wins, then an explicit action
 * entity; otherwise the action follows from the mode, the compressor and the
 * temperatures.
 */
export function heatPumpState(i: HeatPumpInput): { mode: ModeKey | null; action: Action } {
  const mode = resolveMode(i.modeValue, i.states);
  const running = i.hz == null || i.hz > 0;
  const fromEntity = i.defrost ? "defrost" : parseAction(i.actionValue);
  if (fromEntity) return { mode, action: fromEntity };

  let action: Action;
  switch (mode) {
    case "heat": action = running ? "heating" : "idle"; break;
    case "cool": action = running ? "cooling" : "idle"; break;
    case "dry": action = running ? "drying" : "idle"; break;
    case "defrost": action = "defrost"; break;
    case "fan_only": action = "idle"; break;
    case "off": action = "off"; break;
    case "auto": {
      // auto: the set temperature decides; extract air = room temperature
      const db = Number(i.deadband ?? DEFAULT_DEADBAND);
      const { target, supply, extract } = i;
      if (!running) action = "idle";
      else if (target != null && extract != null) action = target > extract + db ? "heating" : target < extract - db ? "cooling" : "idle";
      else if (supply != null && extract != null) action = supply >= extract ? "heating" : "cooling";
      else action = "idle";
      break;
    }
    default: // no mode entity: compressor and temperatures decide
      action = i.hz == null || i.hz <= 0 ? "idle"
        : i.supply != null && i.extract != null && i.supply < i.extract ? "cooling" : "heating";
  }
  return { mode, action };
}

export const isActive = (action: Action) => ACTIVE_ACTIONS.has(action);

/** Text of the status chip, e.g. "Heating" or "Auto · Cooling". */
export function modeText(t: Strings, mode: ModeKey | null, action: Action): string {
  if (mode == null) return action === "idle" || action === "off" ? t.hpOff : t.act[action];
  if (mode === "off" || mode === "fan_only") return t.mode[mode];
  const natural: Partial<Record<ModeKey, Action>> = { heat: "heating", cool: "cooling", dry: "drying", defrost: "defrost" };
  if (natural[mode] === action) return t.act[action];
  return `${t.mode[mode]} · ${t.act[action]}`;
}
