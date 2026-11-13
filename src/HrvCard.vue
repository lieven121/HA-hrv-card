<!-- Root of the <hrv-card> custom element (see elements.ts). -->
<script setup lang="ts">
import CardContent from "./components/CardContent.vue";
import type { HomeAssistant, ResolvedConfig } from "./types";

defineProps<{ hass?: HomeAssistant; config?: ResolvedConfig }>();
</script>

<template>
  <CardContent v-if="hass && config" :hass="hass" :config="config" />
</template>

<style>
/* Theme tokens; the --hrv-*-color variables can be set from a Home Assistant theme. */
:host {
  --hrv-fg: var(--primary-text-color, #1d2125);
  --hrv-muted: var(--secondary-text-color, #6a7178);
  --hrv-casing: var(--hrv-casing-color, #a5acb4);
  --hrv-line: var(--hrv-line-color, #c3c8ce);
  --hrv-machine: var(--hrv-machine-color, #9ca3ab);
  --hrv-hot: #ef4444;
  --hrv-cold: #38bdf8;
  --hrv-defrost: #a78bfa;
  --hrv-warn: var(--warning-color, #f59e0b);
  --hrv-flow-off: var(--hrv-flow-off-color, var(--hrv-casing));
  display: block;
}
ha-card { display: block; padding: 16px; overflow: hidden; }
/* only used outside Home Assistant (dev preview); the real ha-card styles itself from the theme */
ha-card:not(:defined) {
  background: var(--ha-card-background, var(--card-background-color, #fff));
  border-radius: var(--ha-card-border-radius, 12px);
  border: 1px solid var(--divider-color, #e3e6ea);
  color: var(--hrv-fg);
}
.click { cursor: pointer; }

@media (prefers-reduced-motion: reduce) {
  .flow, .fan .rotor, .ref, .comp-g.run, .coil rect.glow { animation: none !important; }
}
</style>
