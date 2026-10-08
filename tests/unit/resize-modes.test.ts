import { describe, expect, it } from "vitest";
import { cropRect, fitDims } from "../../src/lib/image/units";

describe("cropRect", () => {
  it("keeps the full frame when aspects already match", () => {
    // 1920×1080 target 960×540 — same 16:9 aspect.
    expect(cropRect(1920, 1080, 960, 540)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it("trims the sides when the source is wider than the target", () => {
    // 1920×1080 (16:9) → 1:1 target: crop to 1080×1080 centered.
    expect(cropRect(1920, 1080, 500, 500)).toEqual({ x: 420, y: 0, width: 1080, height: 1080 });
  });

  it("trims top/bottom when the source is taller than the target", () => {
    // 1080×1920 (9:16) → 16:9 target: crop to 1080×608 centered (607.5 rounds to 608).
    const r = cropRect(1080, 1920, 1600, 900);
    expect(r.width).toBe(1080);
    expect(r.height).toBe(608);
    expect(r.x).toBe(0);
    expect(r.y).toBe(Math.round((1920 - 608) / 2));
  });

  it("always stays inside the source bounds", () => {
    const r = cropRect(333, 777, 100, 100);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(333);
    expect(r.y + r.height).toBeLessThanOrEqual(777);
  });

  it("matches the target aspect ratio", () => {
    const r = cropRect(1920, 1080, 800, 450);
    expect(r.width / r.height).toBeCloseTo(800 / 450, 2);
  });

  it("rejects non-positive dimensions", () => {
    expect(() => cropRect(0, 100, 50, 50)).toThrow(RangeError);
    expect(() => cropRect(100, 100, 50, 0)).toThrow(RangeError);
  });
});

describe("fitDims", () => {
  it("fits a landscape source inside the box", () => {
    // 1920×1080 into 800×800 → 800×450.
    expect(fitDims(1920, 1080, 800, 800)).toEqual({ width: 800, height: 450 });
  });

  it("fits a portrait source inside the box", () => {
    // 1080×1920 into 800×800 → 450×800.
    expect(fitDims(1080, 1920, 800, 800)).toEqual({ width: 450, height: 800 });
  });

  it("upscales when the source is smaller than the box", () => {
    expect(fitDims(400, 300, 800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("never exceeds the target box", () => {
    const f = fitDims(333, 777, 500, 500);
    expect(f.width).toBeLessThanOrEqual(500);
    expect(f.height).toBeLessThanOrEqual(500);
  });

  it("preserves the source aspect ratio", () => {
    const f = fitDims(1920, 1080, 500, 500);
    expect(f.width / f.height).toBeCloseTo(16 / 9, 2);
  });

  it("rejects non-positive dimensions", () => {
    expect(() => fitDims(100, 0, 50, 50)).toThrow(RangeError);
    expect(() => fitDims(100, 100, -50, 50)).toThrow(RangeError);
  });
});
