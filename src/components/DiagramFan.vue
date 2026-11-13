<!-- A fan in the diagram, spinning at the fan's speed, with its label underneath. -->
<script setup lang="ts">
import type { FanState } from "../logic/fan";

defineProps<{ x: number; y: number; fan: FanState }>();
defineEmits<{ open: [ev: Event] }>();

const BLADE = "M0 0 C-4 -8 -7 -18 1 -22 C9 -25 14 -14 8 -6 C5 -2 2 0 0 0Z";
</script>

<template>
  <g class="fan click" :transform="`translate(${x} ${y})`" @click="$emit('open', $event)">
    <circle class="ring" r="30" />
    <g class="rotor" :class="{ off: !fan.dur }" :style="fan.dur ? { '--d': `${fan.dur.toFixed(2)}s` } : undefined">
      <circle r="24" fill="transparent" />
      <path v-for="deg in [0, 120, 240]" :key="deg" :d="BLADE" :transform="deg ? `rotate(${deg})` : undefined" />
      <circle r="5.5" class="hub" />
    </g>
  </g>
  <text class="small click" :x="x" :y="y + 50" text-anchor="middle" @click="$emit('open', $event)">{{ fan.label }}</text>
</template>

<style>
.fan .rotor {
  fill: var(--hrv-machine);
  transform-box: fill-box; transform-origin: 50% 50%;
  animation: spin var(--d, 1s) linear infinite;
}
.fan .rotor.off { animation-play-state: paused; }
.fan .ring { fill: none; stroke: var(--hrv-line); stroke-width: 1.5; }
.fan .hub { fill: var(--hrv-machine); stroke: var(--card-background-color, #fff); stroke-width: 2; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
