<!-- Ordered list of fan steps (value → label), slowest first. -->
<script setup lang="ts">
import { ref } from "vue";
import { importSpeeds, move } from "./config";
import { useEditor } from "./useEditor";

const { cfg, hass, commit } = useEditor();
const message = ref("");

function change(fn: () => void) {
  fn();
  message.value = "";
  commit();
}

function setField(i: number, field: "state" | "label", ev: Event) {
  cfg.value.fan_speeds[i][field] = (ev.target as HTMLInputElement).value.trim();
  commit();
}

const list = () => cfg.value.fan_speeds;
const add = () => change(() => list().push({ state: "", label: "" }));
const remove = (i: number) => change(() => list().splice(i, 1));
const doImport = () => {
  message.value = importSpeeds(hass(), cfg.value);
  commit();
};
</script>

<template>
  <div class="speeds">
    <div class="src-label">Fan speed steps</div>
    <div class="hint">
      List the values your fan entity reports, from slowest to fastest. The position sets how fast the fan spins.
      The label is what the card shows, so use it to translate. Steps named "off" or "0" stop the fan.
    </div>
    <div v-if="!cfg.fan_speeds.length" class="empty">
      No steps yet: percentages and common words (low, medium, high) work without them.
    </div>
    <div v-for="(s, i) in cfg.fan_speeds" :key="i" class="srow">
      <span class="idx">{{ i + 1 }}</span>
      <input :value="s.state" placeholder="Value, e.g. low" :aria-label="`Value ${i + 1}`" @change="setField(i, 'state', $event)">
      <input :value="s.label || ''" placeholder="Label shown" :aria-label="`Label ${i + 1}`" @change="setField(i, 'label', $event)">
      <span class="btns">
        <button class="ic" title="Move up" aria-label="Move up" :disabled="i === 0" @click="change(() => move(list(), i, -1))">↑</button>
        <button class="ic" title="Move down" aria-label="Move down" :disabled="i === cfg.fan_speeds.length - 1" @click="change(() => move(list(), i, 1))">↓</button>
        <button class="ic" title="Remove" aria-label="Remove" @click="remove(i)">✕</button>
      </span>
    </div>
    <div class="actions">
      <button class="act" @click="add">Add step</button>
      <button class="act" @click="doImport">Import values from supply fan</button>
    </div>
    <div v-if="message" class="hint">{{ message }}</div>
  </div>
</template>

<style>
.speeds { display: flex; flex-direction: column; gap: 6px; }
.srow { display: grid; grid-template-columns: 22px minmax(0,1fr) minmax(0,1fr) auto; gap: 6px; align-items: center; }
.srow .idx { color: var(--secondary-text-color); font-variant-numeric: tabular-nums; text-align: right; font-size: 0.85rem; }
.srow input {
  box-sizing: border-box; font: inherit; min-width: 0; padding: 8px 10px; border-radius: 6px;
  border: 1px solid var(--divider-color, #ccc);
  background: var(--secondary-background-color, var(--card-background-color, #fff));
  color: var(--primary-text-color);
}
.srow input:focus { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: -1px; }
</style>
