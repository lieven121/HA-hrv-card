import type { ExtraTile } from "../types";
import { isNumeric, type Reading } from "./sources";

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function formatTemp(v: number | null, decimals: number, unit: string): string {
  return v == null ? "—" : `${v.toFixed(decimals)} ${unit}`;
}

/** Value + unit of an extra tile. Numbers get the configured decimals, or 0/1 depending on size. */
export function tileValue(tile: ExtraTile, r: Reading | null): string {
  let v = r && r.value != null ? String(r.value) : "—";
  const n = parseFloat(v);
  if (r && !Number.isNaN(n) && isNumeric(v)) {
    const d = tile.decimals != null && tile.decimals !== ""
      ? Number(tile.decimals)
      : Math.abs(n) >= 100 || Number.isInteger(n) ? 0 : 1;
    v = n.toFixed(d);
  }
  // an attribute has no unit of its own, so the entity's unit would be wrong
  const unit = tile.unit != null && tile.unit !== ""
    ? tile.unit
    : tile.attribute ? "" : r?.entity.attributes.unit_of_measurement || "";
  return unit ? `${v} ${unit}` : v;
}

export function tileName(tile: ExtraTile, r: Reading | null): string {
  return tile.name
    || (tile.attribute ? capitalize(tile.attribute.replace(/_/g, " ")) : r?.entity.attributes.friendly_name)
    || tile.entity
    || "";
}
