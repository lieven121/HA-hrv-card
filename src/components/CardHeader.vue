<!-- Title (opens the main entity) and the status chips: mode/action, target, bypass, filter. -->
<script setup lang="ts">
import { computed } from "vue";
import { useHrv } from "../composables/useHrv";
import { modeText } from "../logic/heatpump";

const { config, t, hass, state, mainEntity, moreInfo } = useHrv();

const title = computed(() =>
  config.value.name || (mainEntity.value && hass().states[mainEntity.value]?.attributes.friendly_name) || "");
const status = computed(() => modeText(t.value, state.value.mode, state.value.action));
const showTarget = computed(() =>
  state.value.target != null && state.value.mode !== "off" && state.value.mode !== "fan_only");
const clickable = computed(() => !!(mainEntity.value || config.value.entities.heat_pump_mode));

const openMain = (ev: Event) => moreInfo(ev, mainEntity.value || "heat_pump_mode");
</script>

<template>
  <div class="head">
    <button v-if="mainEntity" class="title-btn" @click="openMain">
      <span class="title">{{ title }}</span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.58 13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
    </button>
    <span v-else class="title">{{ title }}</span>
    <div class="chips" :class="{ click: clickable }" @click="openMain">
      <span class="chip" :class="state.action">{{ status }}</span>
      <span v-if="showTarget" class="chip target">
        {{ t.target }} {{ state.target!.toFixed(config.decimals) }} {{ config.temperature_unit || "°C" }}
      </span>
      <span v-if="state.bypass" class="chip info">{{ t.bypass }}</span>
      <span v-if="state.filter" class="chip warn">{{ t.filter }}</span>
    </div>
  </div>
</template>

<style>
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.title { font-size: 1.15rem; font-weight: 500; color: var(--hrv-fg); }
.title-btn {
  all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;
  border-radius: 6px; padding: 2px 4px 2px 0; min-width: 0;
}
.title-btn .chev { width: 22px; height: 22px; fill: var(--hrv-muted); flex: none; transition: transform .15s; }
.title-btn:hover .chev { transform: translateX(2px); fill: var(--hrv-fg); }
.title-btn:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }

.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em;
  padding: 3px 10px; border-radius: 999px;
  color: var(--chip, var(--hrv-muted));
  background: color-mix(in srgb, var(--chip, var(--hrv-muted)) 14%, transparent);
  display: inline-flex; align-items: center; gap: 5px;
}
.chip::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.chip.heating { --chip: var(--hrv-hot); }
.chip.cooling { --chip: var(--hrv-cold); }
.chip.defrost { --chip: var(--hrv-defrost); }
.chip.drying { --chip: #14b8a6; }
.chip.target::before { border-radius: 50%; background: none; border: 2px solid currentColor; width: 5px; height: 5px; }
.chip.warn { --chip: var(--hrv-warn); }
.chip.info { --chip: var(--hrv-cold); }
</style>
