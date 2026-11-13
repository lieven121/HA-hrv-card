<!-- A collapsible editor section. -->
<script setup lang="ts">
defineProps<{ title: string; hint?: string; open?: boolean }>();
</script>

<template>
  <details class="sec" :open="open">
    <summary>{{ title }}<span v-if="hint" class="hint-s">{{ hint }}</span></summary>
    <div class="body"><slot /></div>
  </details>
</template>

<style>
.sec { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
.sec > summary {
  list-style: none; cursor: pointer; padding: 12px 16px; font-weight: 500;
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  color: var(--primary-text-color);
}
.sec > summary::-webkit-details-marker { display: none; }
.sec > summary::after { content: "▾"; color: var(--secondary-text-color); transition: transform .2s; }
.sec:not([open]) > summary::after { transform: rotate(-90deg); }
.sec .hint-s { font-weight: 400; font-size: 0.8rem; color: var(--secondary-text-color); margin-left: auto; }
.body { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 14px; }
</style>
