<!-- A heat-pump coil: glows red as condenser, blue as evaporator. -->
<script setup lang="ts">
import type { CoilState } from "../logic/airflow";

const props = defineProps<{ x: number; state: CoilState }>();

const fins = Array.from({ length: 7 }, (_, i) => props.x + 6 + i * 7);
</script>

<template>
  <g class="coil" :class="state">
    <rect class="glow" :x="x" y="234" width="54" height="52" rx="6" />
    <line v-for="fx in fins" :key="fx" :x1="fx" y1="238" :x2="fx" y2="282" />
    <rect class="box" :x="x" y="234" width="54" height="52" rx="6" />
  </g>
</template>

<style>
.coil { color: var(--hrv-casing); }
.coil rect.box { fill: none; stroke: currentColor; stroke-width: 2; transition: stroke .6s; }
.coil rect.glow { fill: currentColor; opacity: 0; transition: opacity .6s; }
.coil line { stroke: currentColor; stroke-width: 1.6; opacity: .9; }
.coil.hot { color: var(--hrv-hot); }
.coil.cold { color: var(--hrv-cold); }
.coil.hot rect.glow, .coil.cold rect.glow { animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .10; } 50% { opacity: .28; } }
</style>
