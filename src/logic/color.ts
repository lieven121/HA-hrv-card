type Rgb = [number, number, number];

/** °C → colour stops, cold (indigo) to hot (red); colours in between are interpolated. */
const TEMP_SCALE: [number, Rgb][] = [
  [-10, [99, 102, 241]],
  [0, [59, 130, 246]],
  [8, [14, 165, 233]],
  [14, [20, 184, 166]],
  [18, [34, 197, 94]],
  [21, [163, 201, 47]],
  [24, [245, 176, 40]],
  [28, [249, 115, 22]],
  [34, [239, 68, 68]],
  [40, [220, 38, 38]],
];

const rgb = (c: Rgb) => `rgb(${c.join(",")})`;

export function tempColor(t: number | null | undefined): string {
  if (t == null || Number.isNaN(t)) return "rgb(160,166,174)";
  if (t <= TEMP_SCALE[0][0]) return rgb(TEMP_SCALE[0][1]);
  for (let i = 1; i < TEMP_SCALE.length; i++) {
    const [t1, c1] = TEMP_SCALE[i];
    if (t <= t1) {
      const [t0, c0] = TEMP_SCALE[i - 1];
      const f = (t - t0) / (t1 - t0);
      return rgb(c0.map((c, k) => Math.round(c + (c1[k] - c) * f)) as Rgb);
    }
  }
  return rgb(TEMP_SCALE[TEMP_SCALE.length - 1][1]);
}
