import { describe, expect, it } from "vitest";
import {
  checkInputDimensions,
  checkOutputDimensions,
  MAX_INPUT_MEGAPIXELS,
  WARN_INPUT_MEGAPIXELS,
} from "../../src/lib/image/limits";

describe("checkInputDimensions", () => {
  it("accepts normal photos without warnings", () => {
    expect(checkInputDimensions(1920, 1080)).toEqual({ ok: true, warn: false });
    expect(checkInputDimensions(4000, 3000)).toEqual({ ok: true, warn: false });
  });

  it("warns on very large but processable images", () => {
    // 8000×6000 = 48MP > 40MP warn threshold, < 120MP max
    const r = checkInputDimensions(8000, 6000);
    expect(r).toEqual({ ok: true, warn: true });
    expect(WARN_INPUT_MEGAPIXELS).toBeLessThan(MAX_INPUT_MEGAPIXELS);
  });

  it("refuses gigantic images", () => {
    expect(checkInputDimensions(20000, 20000).ok).toBe(false);
    const r = checkInputDimensions(20000, 20000);
    expect(r).toEqual({ ok: false, reason: "too-large" });
  });

  it("refuses invalid dimensions", () => {
    expect(checkInputDimensions(0, 100)).toEqual({
      ok: false,
      reason: "invalid-dimensions",
    });
    expect(checkInputDimensions(NaN, 100).ok).toBe(false);
  });
});

describe("checkOutputDimensions", () => {
  it("accepts sane outputs", () => {
    expect(checkOutputDimensions(960, 540)).toEqual({ ok: true, warn: false });
    expect(checkOutputDimensions(1, 1).ok).toBe(true);
  });
  it("refuses out-of-range outputs", () => {
    expect(checkOutputDimensions(0, 100).ok).toBe(false);
    expect(checkOutputDimensions(1.5, 100).ok).toBe(false);
    expect(checkOutputDimensions(20000, 100)).toEqual({
      ok: false,
      reason: "too-large",
    });
  });
});
