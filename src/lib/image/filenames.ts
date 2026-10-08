/**
 * Output filename logic. Pure functions — no DOM, fully unit-testable.
 */

export type OutputFormat = "jpeg" | "png" | "gif" | "webp";

/** MIME type for each supported output format. */
export const FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/** File extension for each supported output format. */
export const FORMAT_EXTENSION: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
};

/** Extensions the tool accepts as input (matched against the file name). */
export const ACCEPTED_INPUT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "avif",
] as const;

export type AcceptedInputExtension = (typeof ACCEPTED_INPUT_EXTENSIONS)[number];

/**
 * Strip the directory (if any) and the last extension from a file name,
 * returning the "base" name used for the output file.
 * Falls back to "image" for empty/degenerate names.
 */
export function basenameWithoutExtension(fileName: string): string {
  const justFile = fileName.split(/[\\/]/).pop() ?? "";
  const dot = justFile.lastIndexOf(".");
  const raw = dot > 0 ? justFile.slice(0, dot) : justFile;
  // A leading-dot name (".jpg") is not a usable base name.
  const base = raw.replace(/^\.+/, "").trim();
  return base.length > 0 ? base : "image";
}

/**
 * Build the output file name: original base name + the new extension.
 * Mirrors the behaviour users expect from desktop tools
 * ("photo.jpg" → resize as PNG → "photo.png").
 */
export function outputFileName(inputFileName: string, format: OutputFormat): string {
  return `${basenameWithoutExtension(inputFileName)}.${FORMAT_EXTENSION[format]}`;
}

/**
 * Check whether a file name looks like a supported image input.
 * This is a first-pass filter only — the decoder is the real authority,
 * and corrupt files are reported after the decode attempt fails.
 */
export function isSupportedInputFileName(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return (ACCEPTED_INPUT_EXTENSIONS as readonly string[]).includes(ext);
}

/** Human-readable byte formatting: "114.11 KB", "2.40 MB", … */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}

/** Percentage of bytes saved: positive means the output is smaller. */
export function percentSaved(originalBytes: number, outputBytes: number): number {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) return 0;
  return Math.round(((originalBytes - outputBytes) / originalBytes) * 1000) / 10;
}
