import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json";

export default defineConfig({
  plugins: [
    vue({
      // Every SFC is compiled in custom-element mode, so its <style> is injected
      // into the card's shadow root instead of being extracted to a CSS file.
      customElement: true,
      template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("ha-") } },
    }),
  ],
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    // library mode leaves process.env alone; Vue's esm build needs it replaced
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    __VUE_OPTIONS_API__: "false",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
  },
  build: {
    lib: { entry: "src/main.ts", formats: ["es"], fileName: () => "hrv-card.js" },
    target: "es2021",
    sourcemap: false,
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
