import { OFF_STATES } from "../const";
import type { FanSpeed } from "../types";
import { capitalize } from "./format";
import { isNumeric } from "./sources";

export interface FanState {
  /** seconds per rotor turn; 0 = standing still */
  dur: number;
  label: string;
}

export interface FanOptions {
  /** configured steps, slowest → fastest */
  speeds: FanSpeed[];
  /** number of levels when the fan reports 1…n instead of a percentage */
  levels?: number;
  offLabel: string;
}

const WORDS: [string, number][] = [
  ["boost", 0.38], ["max", 0.38], ["turbo", 0.38], ["high", 0.55],
  ["medium", 0.95], ["mid", 0.95], ["normal", 0.95], ["auto", 0.95], ["home", 0.95],
  ["low", 1.6], ["eco", 1.6], ["away", 2.2], ["min", 2.2],
];

/** How fast to spin a fan and what to write under it, from whatever the fan entity reports. */
export function fanState(reading: { value: unknown } | null, { speeds, levels, offLabel }: FanOptions): FanState {
  if (!reading) return { dur: 0, label: "" };
  if (reading.value == null) return { dur: 0, label: "—" };
  const raw = String(reading.value);
  const low = raw.toLowerCase();
  if (low === "unavailable" || low === "unknown") return { dur: 0, label: "—" };

  // 1. user-defined steps (ordered slowest → fastest, with optional translation)
  const list = speeds.filter((s) => s && s.state != null && String(s.state) !== "");
  const hit = list.find((s) => String(s.state).toLowerCase() === low);
  if (hit) {
    const label = hit.label || capitalize(raw);
    if (OFF_STATES.has(low)) return { dur: 0, label };
    const active = list.filter((s) => !OFF_STATES.has(String(s.state).toLowerCase()));
    const f = (active.indexOf(hit) + 1) / active.length;
    return { dur: 2.2 - 1.85 * f, label };
  }

  // 2. numeric: percentage or level
  const n = parseFloat(raw);
  if (!Number.isNaN(n) && isNumeric(raw)) {
    if (n <= 0) return { dur: 0, label: offLabel };
    if (levels) return { dur: 2.2 - 1.85 * Math.min(n / levels, 1), label: `${n}/${levels}` };
    return { dur: 2.4 - 2.05 * Math.min(n / 100, 1), label: `${Math.round(n)}%` };
  }

  // 3. common words
  if (OFF_STATES.has(low)) return { dur: 0, label: offLabel };
  const m = WORDS.find(([k]) => low.includes(k));
  return { dur: m ? m[1] : 1, label: capitalize(raw) };
}
