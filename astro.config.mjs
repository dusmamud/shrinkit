// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { locales } from "./src/lib/locales.ts";

// NOTE: update `site` to your real Pages domain before deploying.
export default defineConfig({
  site: "https://shrinkit.pages.dev",
  output: "static",
  i18n: {
    defaultLocale: "en",
    locales: [...locales],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [
      tailwindcss(),
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
      }),
    ],
    worker: {
      format: "es",
    },
  },
});
