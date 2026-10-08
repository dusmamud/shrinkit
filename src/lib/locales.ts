/**
 * Single source of truth for the site's locale list.
 *
 * NOTE: components/pages must import from HERE, never from
 * `astro.config.mjs` — importing the config file into the app graph pulls
 * Astro's build-time internals into the bundle.
 */
export const locales = ["en", "es", "pt"] as const;

export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? "");
}
