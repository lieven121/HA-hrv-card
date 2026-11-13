<!-- Optional tiles under the diagram (power, humidity, …), one per `extra` entry. -->
<script setup lang="ts">
import { computed } from "vue";
import { useHrv } from "../composables/useHrv";
import { tileName, tileValue } from "../logic/format";
import { readSource } from "../logic/sources";

const { config, hass, moreInfo } = useHrv();

// outside Home Assistant (dev page) there is no ha-icon; show a dot instead
const hasHaIcon = !!customElements.get("ha-icon");

const tiles = computed(() => config.value.extra.map((x) => {
  const r = readSource(hass(), x);
  return {
    x,
    value: tileValue(x, r),
    name: tileName(x, r),
    icon: x.icon || (r?.entity.attributes.icon as string | undefined) || "mdi:information-outline",
  };
}));
</script>

<template>
  <div v-if="tiles.length" class="extras">
    <button v-for="(tile, i) in tiles" :key="i" class="tile" :title="tile.x.entity" @click="moreInfo($event, tile.x)">
      <ha-icon v-if="hasHaIcon" :icon="tile.icon" />
      <span v-else class="ico" />
      <span class="txt"><span class="v">{{ tile.value }}</span><span class="n">{{ tile.name }}</span></span>
    </button>
  </div>
</template>

<style>
.extras { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; margin-top: 12px; }
.tile {
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px;
  background: color-mix(in srgb, var(--hrv-fg) 5%, transparent);
  min-width: 0;
}
.tile:hover { background: color-mix(in srgb, var(--hrv-fg) 9%, transparent); }
.tile:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
.tile ha-icon, .tile .ico { --mdc-icon-size: 20px; color: var(--hrv-muted); flex: none; width: 20px; height: 20px; display: inline-flex; }
.tile .ico::before { content: ""; width: 8px; height: 8px; margin: auto; border-radius: 50%; background: currentColor; }
.tile .txt { display: flex; flex-direction: column; min-width: 0; }
.tile .v { font-size: 1rem; font-weight: 500; color: var(--hrv-fg); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .n { font-size: 0.75rem; color: var(--hrv-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
