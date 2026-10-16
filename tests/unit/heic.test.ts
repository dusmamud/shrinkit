import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeHeicToPixels, isHeicBytes } from "../../src/lib/image/heic";

/** Minimal ISO-BMFF buffer: size + "ftyp" + major brand + minor + 1 compatible brand. */
function ftyp(major: string, compatible: string[] = []): Uint8Array {
  const bytes = new Uint8Array(16 + compatible.length * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, bytes.length);
  for (let i = 0; i < 4; i++) bytes[4 + i] = "ftyp".charCodeAt(i);
  for (let i = 0; i < 4; i++) bytes[8 + i] = major.charCodeAt(i);
  view.setUint32(12, 0);
  compatible.forEach((brand, j) => {
    for (let i = 0; i < 4; i++) bytes[16 + j * 4 + i] = brand.charCodeAt(i);
  });
  return bytes;
}

describe("isHeicBytes", () => {
  it("matches HEIC major brands (heic / hevc / heix)", () => {
    expect(isHeicBytes(ftyp("heic"))).toBe(true);
    expect(isHeicBytes(ftyp("hevc"))).toBe(true);
    expect(isHeicBytes(ftyp("heix"))).toBe(true);
  });

  it("matches HEIC in the compatible-brands list", () => {
    expect(isHeicBytes(ftyp("mif1", ["heic"]))).toBe(true);
  });

  it("does NOT match AVIF (same ftyp box, different brand — decodes natively)", () => {
    expect(isHeicBytes(ftyp("avif"))).toBe(false);
    expect(isHeicBytes(ftyp("avif", ["mif1"]))).toBe(false);
  });

  it("does NOT match JPEG / PNG / truncated input", () => {
    expect(isHeicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      false,
    );
    expect(isHeicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      false,
    );
    expect(isHeicBytes(new Uint8Array([0, 0, 0]))).toBe(false);
    expect(isHeicBytes(new Uint8Array([]))).toBe(false);
  });

  it("matches a real HEIC file", () => {
    const sample = readFileSync(path.resolve(__dirname, "fixtures/sample.heic"));
    expect(isHeicBytes(new Uint8Array(sample))).toBe(true);
  });
});

describe("decodeHeicToPixels", () => {
  it("decodes a real HEIC photo to RGBA pixels", async () => {
    const sample = readFileSync(path.resolve(__dirname, "fixtures/sample.heic"));
    const { width, height, data } = await decodeHeicToPixels(new Uint8Array(sample));
    expect(width).toBe(1440);
    expect(height).toBe(960);
    expect(data.length).toBe(1440 * 960 * 4);
    // Opaque photo: alpha channel fully 255, and pixels are not all black.
    let opaque = 0;
    let nonBlack = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 255) opaque++;
    }
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) nonBlack++;
    }
    expect(opaque).toBe(1440 * 960);
    expect(nonBlack).toBeGreaterThan(0);
  }, 60_000);

  it("rejects non-HEIC input", async () => {
    await expect(
      decodeHeicToPixels(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])),
    ).rejects.toThrow();
  }, 60_000);
});
