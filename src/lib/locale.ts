import { DEFAULT_LOCALE, isLocale, locales, type Locale } from "./locales";

/** Resolve the locale for a page from Astro's params / URL. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/**
 * Prefix a path with the locale, unless it is the default locale
 * (prefixDefaultLocale: false).
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean === "/" ? "/" : clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

/** Canonical URL for a page in every locale (for hreflang alternates). */
export function alternates(site: string, path: string): { locale: Locale; href: string }[] {
  return locales.map((locale) => ({
    locale,
    href: `${site}${localizedPath(path, locale)}`,
  }));
}
