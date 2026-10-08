/**
 * Unit conversion logic for the resize tool.
 * Pure functions — no DOM, fully unit-testable.
 */

export type SizeUnit = "percent" | "pixels" | "cm" | "inches";

/** Centimeters per inch — exact by definition. */
export const CM_PER_INCH = 2.54;

export interface OriginalSize {
  width: number;
  height: number;
}

export interface TargetSize {
  width: number;
  height: number;
}

/**
 * Convert a user-entered width/height pair in the given unit into
 * concrete output pixels, based on the original image dimensions and DPI.
 *
 * - percent: value/100 × original dimension
 * - pixels: value used directly
 * - cm / inches: value × DPI (= pixels per inch); cm is converted to inches first
 *
 * Every output dimension is clamped to at least 1px and rounded.
 * Throws RangeError when inputs are invalid so the UI can show a clear error.
 */
export function toPixels(
  widthValue: number,
  heightValue: number,
  unit: SizeUnit,
  dpi: number,
  original: OriginalSize,
): TargetSize {
  if (!Number.isFinite(widthValue) || !Number.isFinite(heightValue)) {
    throw new RangeError("Width and height must be numbers.");
  }
  if (widthValue <= 0 || heightValue <= 0) {
    throw new RangeError("Width and height must be greater than zero.");
  }
  if (original.width <= 0 || original.height <= 0) {
    throw new RangeError("Original image dimensions are invalid.");
  }

  let width: number;
  let height: number;

  switch (unit) {
    case "percent":
      width = (original.width * widthValue) / 100;
      height = (original.height * heightValue) / 100;
      break;
    case "pixels":
      width = widthValue;
      height = heightValue;
      break;
    case "inches":
      if (!Number.isFinite(dpi) || dpi <= 0) {
        throw new RangeError("DPI must be greater than zero for inch units.");
      }
      width = widthValue * dpi;
      height = heightValue * dpi;
      break;
    case "cm":
      if (!Number.isFinite(dpi) || dpi <= 0) {
        throw new RangeError("DPI must be greater than zero for cm units.");
      }
      width = (widthValue / CM_PER_INCH) * dpi;
      height = (heightValue / CM_PER_INCH) * dpi;
      break;
    default:
      throw new RangeError(`Unknown size unit: ${String(unit)}`);
  }

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    throw new RangeError("Computed dimensions are out of range.");
  }
  return { width: w, height: h };
}

/**
 * What percentage a target dimension is of the original.
 * Used for the "50% of original" style hints in the UI.
 */
export function percentOf(target: number, original: number): number {
  if (original <= 0) return 0;
  return Math.round((target / original) * 1000) / 10;
}
