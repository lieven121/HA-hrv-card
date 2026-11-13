<script setup lang="ts">
import { provideHrv } from "../composables/useHrv";
import type { HomeAssistant, ResolvedConfig } from "../types";
import CardHeader from "./CardHeader.vue";
import ExtraTiles from "./ExtraTiles.vue";
import HrvDiagram from "./HrvDiagram.vue";

const props = defineProps<{ hass: HomeAssistant; config: ResolvedConfig }>();
provideHrv(props);
</script>

<template>
  <ha-card>
    <CardHeader v-if="config.show_header !== false" />
    <HrvDiagram />
    <ExtraTiles />
  </ha-card>
</template>
