import type { HassEntity, HomeAssistant, Source, SourceConfig } from "../types";

export interface Reading {
  /** the state, or the configured attribute */
  value: unknown;
  entity: HassEntity;
  source: Source;
}

export function normSource(v: SourceConfig | null | undefined): Source | null {
  if (!v) return null;
  if (typeof v === "string") return { entity: v };
  return v.entity ? (v as Source) : null;
}

export function readSource(hass: HomeAssistant | undefined, v: SourceConfig | null | undefined): Reading | null {
  const source = normSource(v);
  if (!source || !hass) return null;
  const entity = hass.states[source.entity];
  if (!entity) return null;
  const value = source.attribute ? (entity.attributes ?? {})[source.attribute] : entity.state;
  return { value, entity, source };
}

/** A plain number like "21.5" or "-3" (not "21.5 °C" or "1e3"). */
export const isNumeric = (s: string) => /^-?[\d.]+$/.test(s.trim());

export function toNumber(r: Reading | null): number | null {
  if (!r || r.value == null) return null;
  const v = parseFloat(String(r.value));
  return Number.isNaN(v) ? null : v;
}

export function isOn(r: Reading | null): boolean {
  if (!r || r.value == null) return false;
  if (r.value === true) return true;
  const s = String(r.value).toLowerCase();
  if (["on", "open", "true", "active", "problem", "yes"].includes(s)) return true;
  const n = parseFloat(s);
  return !Number.isNaN(n) && n > 0;
}
