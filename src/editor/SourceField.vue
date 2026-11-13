<!-- Entity + optional attribute picker for one source. -->
<script setup lang="ts">
import { computed } from "vue";
import { normSource } from "../logic/sources";
import type { Source, SourceKey } from "../types";
import { setSource } from "./config";
import { computeLabel, SOURCE_SCHEMA } from "./schema";
import { useEditor } from "./useEditor";

const props = defineProps<{ sourceKey: SourceKey; label: string }>();
const { cfg, hass, commit } = useEditor();

const data = computed(() => {
  const s = normSource(cfg.value.entities[props.sourceKey]);
  return { entity: s?.entity || "", attribute: s?.attribute || "" };
});

function onChanged(ev: CustomEvent<{ value: Partial<Source> }>) {
  ev.stopPropagation();
  setSource(cfg.value.entities, props.sourceKey, ev.detail.value);
  commit();
}
</script>

<template>
  <div>
    <div class="src-label">{{ label }}</div>
    <ha-form
      .hass="hass()" .schema="SOURCE_SCHEMA" .data="data" .computeLabel="computeLabel"
      @value-changed="onChanged"
    />
  </div>
</template>
