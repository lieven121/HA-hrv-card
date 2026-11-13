<!--
  The unit as a diagram: fresh air enters left-top and leaves right-bottom (supply),
  extract air enters right-top and leaves left-bottom (exhaust), crossing in the
  heat exchanger. The streams are coloured by temperature along their length.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useHrv } from "../composables/useHrv";
import { tempColor } from "../logic/color";
import { clamp } from "../logic/format";
import type { SourceKey } from "../types";
import DiagramCoil from "./DiagramCoil.vue";
import DiagramFan from "./DiagramFan.vue";

const { t, state, fmtTemp, moreInfo } = useHrv();

const FRESH_PATH = "M20 150 H255 Q265 150 272 157 L368 253 Q375 260 385 260 H620";
const EXTRACT_PATH = "M620 150 H385 Q375 150 368 157 L272 253 Q265 260 255 260 H20";
const FRESH_OFFSETS = [0, 0.40, 0.61, 0.73, 0.84, 1];
const EXTRACT_OFFSETS = [0, 0.39, 0.60, 0.73, 0.84, 1];

const colors = computed(() => {
  const { temps, air, unitOff } = state.value;
  // unit off → air streams turn grey; everything else keeps its colour
  const col = (v: number | null) => (unitOff ? "var(--hrv-flow-off)" : tempColor(v));
  return {
    outdoor: col(temps.outdoor), supply: col(temps.supply),
    extract: col(temps.extract), exhaust: col(temps.exhaust),
    freshMid: col(air.freshMid), extractMid: col(air.extractMid),
  };
});

const freshStops = computed(() => {
  const c = colors.value;
  return [c.outdoor, c.outdoor, c.freshMid, c.freshMid, c.supply, c.supply];
});
const extractStops = computed(() => {
  const c = colors.value;
  return [c.extract, c.extract, c.extractMid, c.extractMid, c.exhaust, c.exhaust];
});

const effText = computed(() => {
  const { unitOff, bypass, air } = state.value;
  if (unitOff) return "";
  if (bypass) return t.value.bypass.toLowerCase();
  return air.effShown != null ? `${Math.round(clamp(air.effShown, 0, 1) * 100)}%` : "";
});

/** dots on the streams move with the fan that drives them */
const flowStyle = (dur: number) => (dur ? { "--d": `${(dur * 0.55).toFixed(2)}s` } : undefined);

const refClass = (color: string) => `ref ${color}${state.value.air.reverse ? " rev" : ""}`;
const refStyle = computed(() => ({ "--rd": `${state.value.air.refDuration.toFixed(2)}s` }));

const hzText = computed(() => {
  const hz = state.value.hz;
  return hz == null ? "" : hz > 0 ? `${Math.round(hz)} Hz` : t.value.fanOff;
});

const LABELS: { key: SourceKey; caption: "outdoor" | "exhaust" | "extract" | "supply"; x: number; top: boolean }[] = [
  { key: "outdoor_temp", caption: "outdoor", x: 12, top: true },
  { key: "exhaust_temp", caption: "exhaust", x: 12, top: false },
  { key: "extract_temp", caption: "extract", x: 628, top: true },
  { key: "supply_temp", caption: "supply", x: 628, top: false },
];
const temp = (caption: (typeof LABELS)[number]["caption"]) => state.value.temps[caption];
</script>

<template>
  <svg viewBox="0 0 640 400" role="img" aria-label="Heat recovery ventilation diagram">
    <defs>
      <linearGradient id="g-fresh" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="620" y2="0">
        <stop v-for="(o, i) in FRESH_OFFSETS" :key="i" :offset="o" :style="{ stopColor: freshStops[i] }" />
      </linearGradient>
      <linearGradient id="g-extract" gradientUnits="userSpaceOnUse" x1="620" y1="0" x2="20" y2="0">
        <stop v-for="(o, i) in EXTRACT_OFFSETS" :key="i" :offset="o" :style="{ stopColor: extractStops[i] }" />
      </linearGradient>
    </defs>

    <rect class="casing" x="90" y="30" width="460" height="360" rx="14" />

    <!-- refrigerant loop -->
    <path class="pipe" d="M145 286 V346 H298" />
    <path class="pipe" d="M342 346 H495 V286" />
    <path :class="refClass(state.air.refExhaust)" :style="refStyle" d="M298 346 H145 V286" />
    <path :class="refClass(state.air.refSupply)" :style="refStyle" d="M342 346 H495 V286" />
    <g class="comp-g click" :class="{ run: state.air.compressorRunning }" @click="moreInfo($event, 'compressor')">
      <rect class="comp" x="298" y="320" width="44" height="56" rx="9" />
      <rect class="comp" x="345" y="352" width="28" height="22" rx="10" />
    </g>
    <g class="click" @click="moreInfo($event, 'compressor')">
      <text class="small" x="320" y="308" text-anchor="middle">{{ hzText }}</text>
    </g>

    <!-- heat exchanger -->
    <rect class="hx" :class="{ bypass: state.bypass }" x="267" y="152" width="106" height="106" rx="12" transform="rotate(45 320 205)" />
    <text class="eff" x="320" y="174" text-anchor="middle">{{ effText }}</text>

    <!-- air streams (arrows sit under the moving dots) -->
    <path class="stream" stroke="url(#g-extract)" :d="EXTRACT_PATH" />
    <path class="stream" stroke="url(#g-fresh)" :d="FRESH_PATH" />
    <polygon class="arrow" :style="{ fill: colors.outdoor }" points="98,138 120,150 98,162" />
    <polygon class="arrow" :style="{ fill: colors.extract }" points="542,138 520,150 542,162" />
    <polygon class="arrow" :style="{ fill: colors.exhaust }" points="114,248 92,260 114,272" />
    <polygon class="arrow" :style="{ fill: colors.supply }" points="526,248 548,260 526,272" />
    <path class="flow" :class="{ off: !state.fans.exhaust.dur }" :style="flowStyle(state.fans.exhaust.dur)" :d="EXTRACT_PATH" />
    <path class="flow" :class="{ off: !state.fans.supply.dur }" :style="flowStyle(state.fans.supply.dur)" :d="FRESH_PATH" />

    <!-- coils: exhaust side left, supply side right -->
    <DiagramCoil :x="118" :state="state.air.exhaustCoil" />
    <DiagramCoil :x="468" :state="state.air.supplyCoil" />

    <!-- fans -->
    <DiagramFan :x="150" :y="78" :fan="state.fans.supply" @open="moreInfo($event, 'supply_fan')" />
    <DiagramFan :x="490" :y="78" :fan="state.fans.exhaust" @open="moreInfo($event, 'exhaust_fan')" />

    <!-- temperatures -->
    <g v-for="l in LABELS" :key="l.key" class="click" @click="moreInfo($event, l.key)">
      <text class="cap" :x="l.x" :y="l.top ? 106 : 312" :text-anchor="l.x > 320 ? 'end' : undefined">{{ t[l.caption] }}</text>
      <text class="val" :x="l.x" :y="l.top ? 132 : 294" :text-anchor="l.x > 320 ? 'end' : undefined">{{ fmtTemp(temp(l.caption), l.key) }}</text>
    </g>
  </svg>
</template>

<style>
svg { width: 100%; height: auto; display: block; overflow: visible; }
text { fill: var(--hrv-fg); font-family: inherit; }
.cap { fill: var(--hrv-muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.val { font-size: 21px; font-variant-numeric: tabular-nums; }
.small { font-size: 15px; fill: var(--hrv-fg); }
.eff { font-size: 12px; fill: var(--hrv-muted); font-variant-numeric: tabular-nums; }
.click:hover .val { text-decoration: underline; text-decoration-thickness: 1px; }

.casing { fill: none; stroke: var(--hrv-casing); stroke-width: 2.5; }
.hx { fill: none; stroke: var(--hrv-casing); stroke-width: 2.5; transition: stroke-dasharray .3s; }
.hx.bypass { stroke-dasharray: 6 6; opacity: .6; }

.stream { fill: none; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; }
.flow {
  fill: none; stroke: rgba(255,255,255,.85); stroke-width: 5; stroke-linecap: round;
  stroke-dasharray: 0.1 24;
  animation: flow var(--d, 1s) linear infinite;
}
.flow.off { animation-play-state: paused; opacity: 0; }
@keyframes flow { to { stroke-dashoffset: -24.1; } }
stop { transition: stop-color 1.2s ease; }
.arrow { transition: fill 1.2s ease; }

.pipe { fill: none; stroke: var(--hrv-line); stroke-width: 3; stroke-linejoin: round; }
.ref { fill: none; stroke: currentColor; stroke-width: 3; stroke-dasharray: 6 8; stroke-linejoin: round; opacity: 0; transition: opacity .6s; animation: ref var(--rd, 1s) linear infinite; }
.ref.hot { color: var(--hrv-hot); opacity: 1; }
.ref.cold { color: var(--hrv-cold); opacity: 1; }
.ref.rev { animation-direction: reverse; }
@keyframes ref { to { stroke-dashoffset: -14; } }

.comp { fill: var(--hrv-machine); }
.comp-g.run { animation: hum .09s linear infinite alternate; }
@keyframes hum { from { transform: translateX(-0.4px); } to { transform: translateX(0.4px); } }
</style>
