import * as messages from "../paraglide/messages.js";
import type { Locale } from "./locales";

export type MessageKey = keyof typeof messages;

/**
 * Call a Paraglide message with an explicit locale.
 *
 * Explicit beats ambient here: every page is statically generated for
 * exactly one locale, and the React island receives its locale as a prop,
 * so there is no global language tag that could be wrong (or race between
 * concurrent static renders).
 */
export function t(
  locale: Locale,
  key: MessageKey,
  inputs: Record<string, string | number> = {},
): string {
  const fn = messages[key] as unknown as (
    inputs: Record<string, string | number>,
    options: { locale: Locale },
  ) => string;
  return fn(inputs, { locale });
}
