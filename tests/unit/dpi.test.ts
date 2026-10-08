import { describe, expect, it } from "vitest";
import piexif from "piexifjs";
import {
  crc32,
  injectPngDpi,
  injectJpegDpi,
  preserveJpegExif,
  dataUrlToBytes,
  bytesToDataUrl,
} from "../../src/lib/image/dpi";

// 1×1 RGB PNG (no pHYs chunk), generated for these tests.
const PNG_1X1_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
// 8×8 baseline JPEG, generated with ffmpeg for these tests.
const JPEG_8X8_B64 =
  "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgKCgsKCw0NDQ0NDRAPEBAQEBAQEBAQEBASEhIVFRUSEhIQEBISFBQVFRcXFxUVFRUXFxkZGR4eHBwjIyQrKzP/xABoAAEAAAAAAAAAAAAAAAAAAAAFAQEBAAAAAAAAAAAAAAAAAAACAxAAAgICAgMBAAAAAAAAAAAAAgEDBRESBACzhDUTEQACAAYBAgcBAAAAAAAAAAABAhITEQQDBQCxFJGCNyMyBhUh/8AAEQgACAAIAwESAAISAAMSAP/aAAwDAQACEQMRAD8ANjXKq6sZIsxTDBXPgvInpO45Cm02ZCKMkH6IsAaFJ5S6lafMr/U8R9NP0O0GnqZJuTtZZOCP+45U6ZLnw+9ABHBU0pXi+jfLcefqeUXIcmyt9fcBTdw3K5sUCgMMa3aWsbIJTlAtlCxJYMiMTVKib+oXj1HP/9k=";

function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

interface PngChunk {
  name: string;
  data: Uint8Array;
}

/** Parse PNG chunks (after the 8-byte signature). */
function parsePngChunks(png: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let pos = 8;
  while (pos + 8 <= png.length) {
    const len = (png[pos] << 24) | (png[pos + 1] << 16) | (png[pos + 2] << 8) | png[pos + 3];
    const name = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    chunks.push({ name, data: png.slice(pos + 8, pos + 8 + len) });
    pos += 12 + len;
    if (name === "IEND") break;
  }
  return chunks;
}

describe("crc32", () => {
  it("matches the IEEE reference vector", () => {
    const data = new TextEncoder().encode("123456789");
    expect(crc32(data)).toBe(0xcbf43926);
  });
});

describe("injectPngDpi", () => {
  it("inserts a correct pHYs chunk right after IHDR", () => {
    const out = injectPngDpi(b64ToBytes(PNG_1X1_B64), 72);
    const chunks = parsePngChunks(out);
    expect(chunks[0].name).toBe("IHDR");
    expect(chunks[1].name).toBe("pHYs");
    const phys = chunks[1].data;
    expect(phys.length).toBe(9);
    const view = new DataView(phys.buffer, phys.byteOffset, phys.byteLength);
    // 72 dpi / 0.0254 m per inch = 2834.64… → 2835 px/m
    expect(view.getUint32(0)).toBe(2835);
    expect(view.getUint32(4)).toBe(2835);
    expect(phys[8]).toBe(1); // unit: metre
  });

  it("replaces an existing pHYs instead of duplicating it", () => {
    const once = injectPngDpi(b64ToBytes(PNG_1X1_B64), 72);
    const twice = injectPngDpi(once, 300);
    const chunks = parsePngChunks(twice);
    expect(chunks.filter((c) => c.name === "pHYs")).toHaveLength(1);
    const view = new DataView(chunks[1].data.buffer, chunks[1].data.byteOffset, 4);
    expect(view.getUint32(0)).toBe(Math.round(300 / 0.0254));
  });

  it("leaves non-PNG input untouched", () => {
    const jpeg = b64ToBytes(JPEG_8X8_B64);
    expect(injectPngDpi(jpeg, 72)).toBe(jpeg);
  });

  it("leaves invalid DPI untouched", () => {
    const png = b64ToBytes(PNG_1X1_B64);
    expect(injectPngDpi(png, 0)).toBe(png);
    expect(injectPngDpi(png, NaN)).toBe(png);
  });

  it("keeps the PNG decodable (IHDR/IDAT/IEND intact)", () => {
    const out = injectPngDpi(b64ToBytes(PNG_1X1_B64), 150);
    const names = parsePngChunks(out).map((c) => c.name);
    expect(names).toEqual(["IHDR", "pHYs", "IDAT", "IEND"]);
  });
});

describe("injectJpegDpi", () => {
  it("writes a real EXIF APP1 segment with the requested DPI", async () => {
    const out = await injectJpegDpi(b64ToBytes(JPEG_8X8_B64), 150);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    const ascii = new TextDecoder("latin1").decode(out.slice(0, 64));
    expect(ascii).toContain("Exif");
    const exif = piexif.load(bytesToDataUrl(out, "jpeg")) as {
      "0th": Record<number, unknown>;
    };
    expect(exif["0th"][piexif.ImageIFD.XResolution]).toEqual([150, 1]);
    expect(exif["0th"][piexif.ImageIFD.YResolution]).toEqual([150, 1]);
    expect(exif["0th"][piexif.ImageIFD.ResolutionUnit]).toBe(2);
  });

  it("rounds fractional DPI to whole numbers", async () => {
    const out = await injectJpegDpi(b64ToBytes(JPEG_8X8_B64), 72.6);
    const exif = piexif.load(bytesToDataUrl(out, "jpeg")) as {
      "0th": Record<number, unknown>;
    };
    expect(exif["0th"][piexif.ImageIFD.XResolution]).toEqual([73, 1]);
  });

  it("leaves non-JPEG input untouched", async () => {
    const png = b64ToBytes(PNG_1X1_B64);
    expect(await injectJpegDpi(png, 72)).toBe(png);
  });
});

describe("preserveJpegExif", () => {
  it("falls back to DPI injection when the source has no EXIF", async () => {
    const src = b64ToBytes(JPEG_8X8_B64);
    const out = await preserveJpegExif(src, src, 200);
    const exif = piexif.load(bytesToDataUrl(out, "jpeg")) as {
      "0th": Record<number, unknown>;
    };
    expect(exif["0th"][piexif.ImageIFD.XResolution]).toEqual([200, 1]);
  });

  it("copies source EXIF with orientation reset to 1", async () => {
    // Build a source JPEG carrying EXIF with orientation 6.
    const base = bytesToDataUrl(b64ToBytes(JPEG_8X8_B64), "jpeg");
    const exifStr = piexif.dump({
      "0th": { [piexif.ImageIFD.Orientation]: 6 },
    });
    const src = dataUrlToBytes(piexif.insert(exifStr, base));
    const out = await preserveJpegExif(src, b64ToBytes(JPEG_8X8_B64), 96);
    const exif = piexif.load(bytesToDataUrl(out, "jpeg")) as {
      "0th": Record<number, unknown>;
    };
    expect(exif["0th"][piexif.ImageIFD.Orientation]).toBe(1);
    expect(exif["0th"][piexif.ImageIFD.XResolution]).toEqual([96, 1]);
  });

  it("leaves non-JPEG destinations untouched", async () => {
    const png = b64ToBytes(PNG_1X1_B64);
    const src = b64ToBytes(JPEG_8X8_B64);
    expect(await preserveJpegExif(src, png, 72)).toBe(png);
  });
});
