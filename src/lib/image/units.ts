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

/** Round to two decimal places (matching reduceimages.com) */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Return default width/height values when switching units (matching reduceimages.com: setWidthAndHeightForNewUnits).
 */
export function getDefaultDimensionsForUnit(
  unit: SizeUnit,
  original: OriginalSize,
  dpi = 72,
): { width: string; height: string } {
  if (unit === "percent") {
    return { width: "70", height: "70" };
  }
  if (unit === "pixels") {
    return {
      width: String(Math.max(1, Math.round(original.width))),
      height: String(Math.max(1, Math.round(original.height))),
    };
  }
  const effectiveDpi = Number.isFinite(dpi) && dpi > 0 ? dpi : 72;
  if (unit === "cm") {
    const dotsPerCm = effectiveDpi / CM_PER_INCH;
    return {
      width: String(roundToTwoDecimals(original.width / dotsPerCm)),
      height: String(roundToTwoDecimals(original.height / dotsPerCm)),
    };
  }
  if (unit === "inches") {
    return {
      width: String(roundToTwoDecimals(original.width / effectiveDpi)),
      height: String(roundToTwoDecimals(original.height / effectiveDpi)),
    };
  }
  return { width: "70", height: "70" };
}

/**
 * Proportional dimension calculation when aspect ratio is locked (matching reduceimages.com: updateWidthHeight).
 */
export function calculateProportionalDimension(
  changedField: "width" | "height",
  newValue: number,
  unit: SizeUnit,
  original: OriginalSize,
): number {
  if (unit === "percent") {
    return newValue;
  }
  if (unit === "pixels") {
    if (changedField === "width") {
      return Math.max(1, Math.round((original.height * newValue) / original.width));
    }
    return Math.max(1, Math.round((original.width * newValue) / original.height));
  }
  if (changedField === "width") {
    return Math.max(0.01, roundToTwoDecimals((original.height * newValue) / original.width));
  }
  return Math.max(0.01, roundToTwoDecimals((original.width * newValue) / original.height));
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

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Largest centered rectangle of the source that matches the target aspect
 * ratio — the "crop" resize mode. Nothing outside this rect survives, so
 * the output fills the target box exactly with no distortion.
 * Pure math, no DOM — fully unit-testable.
 */
export function cropRect(srcW: number, srcH: number, targetW: number, targetH: number): CropRect {
  if (srcW <= 0 || srcH <= 0 || targetW <= 0 || targetH <= 0) {
    throw new RangeError("Dimensions must be greater than zero.");
  }
  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;
  let w: number;
  let h: number;
  if (srcAspect > targetAspect) {
    // Source is wider than the target: trim the left/right edges.
    h = srcH;
    w = srcH * targetAspect;
  } else {
    // Source is taller than (or equal to) the target: trim top/bottom.
    w = srcW;
    h = srcW / targetAspect;
  }
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  return {
    x: Math.max(0, Math.round((srcW - width) / 2)),
    y: Math.max(0, Math.round((srcH - height) / 2)),
    width,
    height,
  };
}

/**
 * Largest dimensions that fit INSIDE the target box while preserving the
 * source aspect ratio — the "fit" resize mode. The output is letterboxed
 * (background colour, or transparency for formats that support it).
 * Pure math, no DOM — fully unit-testable.
 */
export function fitDims(srcW: number, srcH: number, targetW: number, targetH: number): TargetSize {
  if (srcW <= 0 || srcH <= 0 || targetW <= 0 || targetH <= 0) {
    throw new RangeError("Dimensions must be greater than zero.");
  }
  const scale = Math.min(targetW / srcW, targetH / srcH);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}
