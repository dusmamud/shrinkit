/**
 * Safety guards for image dimensions.
 * Browsers impose real canvas memory limits; decoding or allocating a
 * gigantic image can crash the tab. These guards keep the tool honest:
 * warn early, refuse clearly, never silently produce garbage.
 * Pure functions — fully unit-testable.
 */

/** Refuse images larger than this (in megapixels) — decoding risks a tab crash. */
export const MAX_INPUT_MEGAPIXELS = 120;

/** Warn (but still allow) above this threshold. */
export const WARN_INPUT_MEGAPIXELS = 40;

/** Largest single side we will attempt to decode, in pixels. */
export const MAX_INPUT_SIDE = 16000;

/** Largest output side we will render, in pixels. */
export const MAX_OUTPUT_SIDE = 12000;

export type LimitCheck =
  { ok: true; warn: boolean } | { ok: false; reason: "too-large" | "invalid-dimensions" };

/**
 * Check decoded input dimensions against the safety limits.
 * Returns `{ ok: true, warn }` when processing may continue
 * (`warn: true` means "this will be slow / memory-hungry"),
 * or `{ ok: false, reason }` when we must refuse.
 */
export function checkInputDimensions(width: number, height: number): LimitCheck {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, reason: "invalid-dimensions" };
  }
  if (width > MAX_INPUT_SIDE || height > MAX_INPUT_SIDE) {
    return { ok: false, reason: "too-large" };
  }
  const megapixels = (width * height) / 1_000_000;
  if (megapixels > MAX_INPUT_MEGAPIXELS) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true, warn: megapixels > WARN_INPUT_MEGAPIXELS };
}

/** Check requested output dimensions before allocating the canvas. */
export function checkOutputDimensions(width: number, height: number): LimitCheck {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    return { ok: false, reason: "invalid-dimensions" };
  }
  if (width > MAX_OUTPUT_SIDE || height > MAX_OUTPUT_SIDE) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true, warn: false };
}
