<!-- The extra tiles: entity/attribute, name, icon, unit and decimals per tile. -->
<script setup lang="ts">
import { cleanTile, move } from "./config";
import { computeLabel, TILE_SCHEMA } from "./schema";
import { useEditor } from "./useEditor";

const { cfg, hass, commit } = useEditor();

function change(fn: () => void) {
  fn();
  commit();
}

function onChanged(i: number, ev: CustomEvent<{ value: Record<string, unknown> }>) {
  ev.stopPropagation();
  cfg.value.extra[i] = cleanTile(ev.detail.value);
  commit();
}

const list = () => cfg.value.extra;
</script>

<template>
  <div class="xlist">
    <div v-if="!cfg.extra.length" class="empty">No extra tiles yet.</div>
    <div v-for="(x, i) in cfg.extra" :key="i" class="xrow">
      <div class="xhead">
        <span>Tile {{ i + 1 }}</span>
        <span class="btns">
          <button class="ic" aria-label="Move up" title="Move up" :disabled="i === 0" @click="change(() => move(list(), i, -1))">↑</button>
          <button class="ic" aria-label="Move down" title="Move down" :disabled="i === cfg.extra.length - 1" @click="change(() => move(list(), i, 1))">↓</button>
          <button class="ic" aria-label="Remove" title="Remove" @click="change(() => list().splice(i, 1))">✕</button>
        </span>
      </div>
      <ha-form
        .hass="hass()" .schema="TILE_SCHEMA" .data="{ ...x }" .computeLabel="computeLabel"
        @value-changed="onChanged(i, $event)"
      />
    </div>
    <div class="actions">
      <button class="act" @click="change(() => list().push({ entity: '' }))">Add tile</button>
    </div>
  </div>
</template>

<style>
.xlist { display: flex; flex-direction: column; gap: 10px; }
.xrow { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.xhead { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--secondary-text-color); }
</style>
