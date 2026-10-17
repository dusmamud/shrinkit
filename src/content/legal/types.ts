/**
 * Structured content for long-form legal documents (Privacy Policy, Terms).
 *
 * Prose lives here as plain strings (not Paraglide keys) because these
 * documents are thousands of words long and the English version governs.
 * Word counts are measured over these strings only, excluding code.
 */
export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

export interface LegalSection {
  /** Anchor id used by the table of contents. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  lastUpdated: string;
  /** Plain-language summary shown at the top, before the full detail. */
  summary: string[];
  sections: LegalSection[];
}
