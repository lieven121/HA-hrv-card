/*
 * HRV Card – custom Lovelace card for a heat-recovery ventilation unit with a heat pump.
 * Entry point of the bundle: registers the card + editor elements and announces
 * the card to the "Add card" picker.
 */
import { CARD_TYPE, EDITOR_TYPE } from "./const";
import { HrvCardEditorElement, HrvCardElement } from "./elements";

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, HrvCardElement);
if (!customElements.get(EDITOR_TYPE)) customElements.define(EDITOR_TYPE, HrvCardEditorElement);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "HRV Card",
    description: "Heat recovery ventilation with heat pump: animated air flow, fans and heat-pump coils.",
    preview: true,
  });
}

console.info(`%c HRV-CARD %c v${__VERSION__} `, "background:#22c55e;color:#fff", "");
