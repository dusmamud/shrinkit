import { describe, expect, it } from "vitest";
import {
  toPixels,
  percentOf,
  CM_PER_INCH,
  getDefaultDimensionsForUnit,
  calculateProportionalDimension,
} from "../../src/lib/image/units";

describe("toPixels", () => {
  const original = { width: 1920, height: 1080 };

  it("scales by percent", () => {
    expect(toPixels(50, 50, "percent", 72, original)).toEqual({
      width: 960,
      height: 540,
    });
    expect(toPixels(70, 70, "percent", 72, original)).toEqual({
      width: 1344,
      height: 756,
    });
  });

  it("uses pixels directly", () => {
    expect(toPixels(800, 450, "pixels", 72, original)).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("converts inches via DPI", () => {
    // 2in × 1in at 300dpi → 600×300px
    expect(toPixels(2, 1, "inches", 300, original)).toEqual({
      width: 600,
      height: 300,
    });
  });

  it("converts centimeters via DPI", () => {
    // 2.54cm = 1 inch → at 96dpi → 96px
    const r = toPixels(2.54, 2.54, "cm", 96, original);
    expect(r).toEqual({ width: 96, height: 96 });
    expect(CM_PER_INCH).toBe(2.54);
  });

  it("clamps fractional results to whole pixels, minimum 1", () => {
    expect(toPixels(0.01, 0.01, "percent", 72, original)).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("rejects non-positive values", () => {
    expect(() => toPixels(0, 50, "percent", 72, original)).toThrow(RangeError);
    expect(() => toPixels(-5, 50, "pixels", 72, original)).toThrow(RangeError);
    expect(() => toPixels(NaN, 50, "percent", 72, original)).toThrow(RangeError);
  });

  it("rejects bad DPI for physical units", () => {
    expect(() => toPixels(5, 5, "inches", 0, original)).toThrow(RangeError);
    expect(() => toPixels(5, 5, "cm", -72, original)).toThrow(RangeError);
  });

  it("rejects invalid originals and unknown units", () => {
    expect(() => toPixels(50, 50, "percent", 72, { width: 0, height: 10 })).toThrow(RangeError);
    expect(() => toPixels(50, 50, "lightyears" as never, 72, original)).toThrow(RangeError);
  });
});

describe("percentOf", () => {
  it("computes the percentage of the original", () => {
    expect(percentOf(960, 1920)).toBe(50);
    expect(percentOf(1344, 1920)).toBe(70);
  });
  it("returns 0 for degenerate originals", () => {
    expect(percentOf(100, 0)).toBe(0);
  });
});

describe("roundToTwoDecimals & unit defaults & proportional math", () => {
  const original = { width: 1920, height: 1080 };

  it("getDefaultDimensionsForUnit matches reduceimages.com logic", () => {
    expect(getDefaultDimensionsForUnit("percent", original)).toEqual({ width: "70", height: "70" });
    expect(getDefaultDimensionsForUnit("pixels", original)).toEqual({
      width: "1920",
      height: "1080",
    });
    // at 72 DPI: 1920 / 72 = 26.67 inches, 1080 / 72 = 15 inches
    expect(getDefaultDimensionsForUnit("inches", original, 72)).toEqual({
      width: "26.67",
      height: "15",
    });
    // at 72 DPI: dots_per_cm = 72 / 2.54 = 28.346...
    // 1920 / 28.346... = 67.73 cm, 1080 / 28.346... = 38.1 cm
    expect(getDefaultDimensionsForUnit("cm", original, 72)).toEqual({
      width: "67.73",
      height: "38.1",
    });
  });

  it("calculateProportionalDimension keeps aspect ratio exact", () => {
    // percent: width 50 -> height 50
    expect(calculateProportionalDimension("width", 50, "percent", original)).toBe(50);
    expect(calculateProportionalDimension("height", 30, "percent", original)).toBe(30);

    // pixels: width 960 -> height 540
    expect(calculateProportionalDimension("width", 960, "pixels", original)).toBe(540);
    // pixels: height 540 -> width 960
    expect(calculateProportionalDimension("height", 540, "pixels", original)).toBe(960);

    // inches / cm: width 13.33 -> height 7.5
    expect(calculateProportionalDimension("width", 13.335, "inches", original)).toBe(7.5);
  });
});
