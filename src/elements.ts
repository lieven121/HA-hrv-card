/*
 * Vue custom elements, extended with the methods Home Assistant expects on a
 * Lovelace card. HA sets `hass` as a property and calls `setConfig()`; both end
 * up as props of the root Vue component.
 *
 * Don't declare class fields here: with useDefineForClassFields they would
 * shadow the prop accessors that defineCustomElement puts on the prototype.
 */
import { defineCustomElement } from "vue";
import { EDITOR_TYPE, resolveConfig } from "./const";
import HrvCardEditorVue from "./editor/HrvCardEditor.vue";
import HrvCardVue from "./HrvCard.vue";
import type { CardConfig } from "./types";

export class HrvCardElement extends defineCustomElement(HrvCardVue) {
  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(): CardConfig {
    return { name: "Ventilation", efficiency: 0.8, entities: {}, fan_speeds: [], extra: [] };
  }

  setConfig(config: CardConfig): void {
    if (!config) throw new Error("hrv-card: invalid configuration");
    this.config = resolveConfig(config);
  }

  getCardSize(): number {
    return 6 + Math.ceil((this.config?.extra.length ?? 0) / 3);
  }
}

export class HrvCardEditorElement extends defineCustomElement(HrvCardEditorVue) {
  setConfig(config: CardConfig): void {
    this.config = config ?? {};
  }
}
