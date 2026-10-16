// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { locales } from "./src/lib/locales.ts";

// NOTE: update `site` to your real Pages domain before deploying.
export default defineConfig({
  site: "https://shrinkit.dusrel.com",
  output: "static",
  i18n: {
    defaultLocale: "en",
    locales: [...locales],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react(), sitemap()],
  server: { port: 7860, host: true },
  vite: {
    plugins: [
      tailwindcss(),
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
      }),
    ],
    optimizeDeps: {
      include: ["piexifjs", "exifr", "pica", "gifenc", "jszip"],
    },
    build: {
      rolldownOptions: {
        output: {
          // One shared lazy chunk for the HEIC decoder: the main app and
          // the tools pages all import it, and without this Rolldown
          // emits a separate 2 MB copy per entry.
          manualChunks: (id) => {
            if (id.includes("libheif-js")) return "heic-decoder";
          },
        },
      },
    },
    worker: {
      format: "es",
    },
  },
});
