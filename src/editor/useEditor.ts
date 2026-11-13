import { inject, onMounted, provide, ref, type InjectionKey, type Ref } from "vue";
import type { HomeAssistant } from "../types";
import type { EditorConfig } from "./config";

/** Shared by the editor sections: they change `cfg` in place, then call commit(). */
export interface EditorContext {
  cfg: Ref<EditorConfig>;
  hass(): HomeAssistant | undefined;
  commit(): void;
}

const KEY: InjectionKey<EditorContext> = Symbol("hrv-editor");

export const provideEditor = (ctx: EditorContext) => provide(KEY, ctx);

export function useEditor(): EditorContext {
  const ctx = inject(KEY);
  if (!ctx) throw new Error("useEditor() used outside of the editor");
  return ctx;
}

/** ha-form and the entity picker are lazy-loaded in HA; force-load them, then flip `ready`. */
export function useHaForm(): Ref<boolean> {
  const ready = ref(!!customElements.get("ha-form"));
  onMounted(async () => {
    if (customElements.get("ha-form") && customElements.get("ha-entity-picker")) {
      ready.value = true;
      return;
    }
    try {
      const w = window as Window & { loadCardHelpers?: () => Promise<{ createCardElement(c: object): HTMLElement }> };
      if (w.loadCardHelpers) {
        const helpers = await w.loadCardHelpers();
        const card = helpers.createCardElement({ type: "entities", entities: [] });
        const ctor = card?.constructor as { getConfigElement?: () => Promise<unknown> } | undefined;
        await ctor?.getConfigElement?.();
      }
    } catch {
      /* ignore: ha-form may still show up on its own */
    }
    await customElements.whenDefined("ha-form");
    ready.value = true;
  });
  return ready;
}
