<!-- Root of the <hrv-card-editor> custom element (see elements.ts). -->
<script setup lang="ts">
import { computed, ref, useHost, watch } from "vue";
import { SOURCES, type SourceGroup } from "../const";
import type { CardConfig, HomeAssistant } from "../types";
import { applyStatesForm, generalForm, statesForm, tidyConfig, toEditorConfig, type GeneralForm, type StatesForm } from "./config";
import EditorSection from "./EditorSection.vue";
import ExtraTilesEditor from "./ExtraTilesEditor.vue";
import FanSpeedsEditor from "./FanSpeedsEditor.vue";
import { computeLabel, FAN_LEVELS_SCHEMA, GENERAL_SCHEMA, STATES_SCHEMA } from "./schema";
import SourceField from "./SourceField.vue";
import { provideEditor, useHaForm } from "./useEditor";

const props = defineProps<{ hass?: HomeAssistant; config?: CardConfig }>();
const host = useHost();
const ready = useHaForm();

// Editable copy. It may hold empty rows (a new fan step, a new tile) that the
// emitted config leaves out, so our own change coming back from HA is ignored.
const cfg = ref(toEditorConfig(props.config));
let lastEmitted = "";
watch(() => props.config, (c) => {
  if (JSON.stringify(c) !== lastEmitted) cfg.value = toEditorConfig(c);
});

function commit() {
  const config = tidyConfig(cfg.value);
  lastEmitted = JSON.stringify(config);
  host?.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
}
provideEditor({ cfg, hass: () => props.hass, commit });

const sources = (group: SourceGroup) => SOURCES.filter((s) => s.group === group);

function onGeneral(ev: CustomEvent<{ value: GeneralForm }>) {
  ev.stopPropagation();
  Object.assign(cfg.value, ev.detail.value);
  commit();
}

const fanLevels = computed(() => ({ fan_levels: cfg.value.fan_levels || "" }));
function onFanLevels(ev: CustomEvent<{ value: { fan_levels?: number | string } }>) {
  ev.stopPropagation();
  const n = Number(ev.detail.value.fan_levels);
  if (n) cfg.value.fan_levels = n; else delete cfg.value.fan_levels;
  commit();
}

function onStates(ev: CustomEvent<{ value: StatesForm }>) {
  ev.stopPropagation();
  applyStatesForm(cfg.value, ev.detail.value);
  commit();
}
</script>

<template>
  <div v-if="ready && hass">
    <EditorSection title="General" open>
      <ha-form
        .hass="hass" .schema="GENERAL_SCHEMA" .data="generalForm(cfg)" .computeLabel="computeLabel"
        @value-changed="onGeneral"
      />
    </EditorSection>

    <EditorSection title="Air temperatures" hint="4 sensors">
      <SourceField v-for="s in sources('temps')" :key="s.key" :source-key="s.key" :label="s.label" />
    </EditorSection>

    <EditorSection title="Fans" hint="speed & labels">
      <SourceField v-for="s in sources('fans')" :key="s.key" :source-key="s.key" :label="s.label" />
      <FanSpeedsEditor />
      <ha-form
        .hass="hass" .schema="FAN_LEVELS_SCHEMA" .data="fanLevels" .computeLabel="computeLabel"
        @value-changed="onFanLevels"
      />
    </EditorSection>

    <EditorSection title="Heat pump">
      <SourceField v-for="s in sources('hp')" :key="s.key" :source-key="s.key" :label="s.label" />
      <div class="hint">
        In auto the card heats when the set temperature is above the extract air and cools when it is below,
        within the dead band. If you set a current action entity, it takes priority. Below, list the values your
        mode entity uses for each mode, separated by commas. Leave a field empty to use the standard Home Assistant
        values (heat, cool, auto, dry, fan_only, off).
      </div>
      <ha-form
        .hass="hass" .schema="STATES_SCHEMA" .data="statesForm(cfg)" .computeLabel="computeLabel"
        @value-changed="onStates"
      />
    </EditorSection>

    <EditorSection title="Bypass, filter & efficiency" hint="optional">
      <SourceField v-for="s in sources('status')" :key="s.key" :source-key="s.key" :label="s.label" />
    </EditorSection>

    <EditorSection title="Extra tiles" hint="power, energy, …">
      <ExtraTilesEditor />
    </EditorSection>
  </div>
</template>

<style>
:host { display: block; }
.src-label { font-size: 0.85rem; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; }
.hint { font-size: 0.8rem; color: var(--secondary-text-color); line-height: 1.45; }
.empty { font-size: 0.85rem; color: var(--secondary-text-color); font-style: italic; }
.btns { display: flex; gap: 2px; }
button.ic, button.act {
  font: inherit; cursor: pointer; border-radius: 6px; color: var(--primary-text-color);
  background: transparent; border: 1px solid transparent;
}
button.ic { width: 30px; height: 30px; padding: 0; color: var(--secondary-text-color); }
button.ic:hover:not(:disabled) { background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--primary-text-color); }
button.ic:disabled { opacity: .3; cursor: default; }
button.act { padding: 7px 12px; border-color: var(--divider-color, #ccc); color: var(--primary-color, #03a9f4); font-weight: 500; }
button.act:hover { background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent); }
button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
