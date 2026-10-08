import { describe, expect, it } from "vitest";
import { toPixels, percentOf, CM_PER_INCH } from "../../src/lib/image/units";

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
