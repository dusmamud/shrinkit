import { describe, it, expect } from "vitest";
import {
  stripBlobMetadata,
  stripJpegMetadata,
  stripPngMetadata,
  stripWebpMetadata,
} from "../../src/lib/image/strip";

function u8(arr: number[]): Uint8Array {
  return Uint8Array.from(arr);
}

function jpegSeg(marker: number, payload: number[]): number[] {
  const len = payload.length + 2;
  return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
}

function pngChunk(type: string, data: number[]): number[] {
  const out: number[] = [];
  const len = data.length;
  out.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff);
  for (const c of type) out.push(c.charCodeAt(0));
  out.push(...data);
  out.push(0, 0, 0, 0); // CRC unchecked by the stripper (copied verbatim)
  return out;
}

function webpChunk(type: string, data: number[]): number[] {
  const out: number[] = [];
  for (const c of type) out.push(c.charCodeAt(0));
  const len = data.length;
  out.push(len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff);
  out.push(...data);
  if (len % 2 === 1) out.push(0); // even padding
  return out;
}

describe("stripJpegMetadata", () => {
  it("drops APP1/APP2/COM, keeps APP0 + DQT/SOF/DHT + entropy data", () => {
    const jpeg = u8([
      0xff,
      0xd8, // SOI
      ...jpegSeg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]), // APP0 JFIF
      ...jpegSeg(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x01]), // APP1 Exif
      ...jpegSeg(0xe2, [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f]), // APP2 ICC
      ...jpegSeg(0xfe, [0x68, 0x69]), // COM "hi"
      ...jpegSeg(0xed, [0x50, 0x68, 0x6f, 0x74]), // APP13 Photoshop/IPTC
      ...jpegSeg(0xdb, [0x00, 0x01]), // DQT — decoder needs this
      ...jpegSeg(0xc0, [0x08, 0x00, 0x01, 0x00, 0x01]), // SOF0 — decoder needs this
      ...jpegSeg(0xc4, [0x00, 0x01]), // DHT — decoder needs this
      0xff,
      0xda,
      0x00,
      0x08,
      0x01,
      0x01,
      0x00,
      0x00, // SOS header
      0xff,
      0x00,
      0xab,
      0xff,
      0xd9, // entropy (incl. stuffed FF00 + fake EOI) + real EOI
    ]);
    const out = stripJpegMetadata(jpeg);
    const hex = Buffer.from(out).toString("hex");
    expect(hex.startsWith("ffd8")).toBe(true);
    expect(hex).toContain("ffe0"); // APP0 kept
    expect(hex).toContain("ffdb"); // DQT kept (dropping it corrupts the file)
    expect(hex).toContain("ffc0"); // SOF0 kept
    expect(hex).toContain("ffc4"); // DHT kept
    expect(hex).not.toContain("ffe1"); // APP1 dropped
    expect(hex).not.toContain("ffe2"); // APP2 dropped
    expect(hex).not.toContain("ffed"); // APP13 dropped
    expect(hex).not.toContain("fffe"); // COM dropped
    expect(hex.endsWith("ffd9")).toBe(true);
    // Entropy data after SOS is copied verbatim (stuffed FF00 + bytes intact).
    expect(hex).toContain("ff00ab");
  });

  it("returns non-JPEG / truncated input untouched", () => {
    const notJpeg = u8([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegMetadata(notJpeg)).toBe(notJpeg);
    const truncated = u8([0xff, 0xd8, 0xff, 0xe1, 0x00]); // cut length field
    expect(stripJpegMetadata(truncated)).toBe(truncated);
  });
});

describe("stripPngMetadata", () => {
  it("keeps only IHDR/IDAT/IEND, drops pHYs/iCCP/text/eXIf", () => {
    const png = u8([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...pngChunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
      ...pngChunk("pHYs", [0, 0, 0, 1, 0, 0, 0, 1, 1]),
      ...pngChunk("iCCP", [1, 2, 3]),
      ...pngChunk("tEXt", [1, 2, 3]),
      ...pngChunk("eXIf", [1, 2, 3]),
      ...pngChunk("IDAT", [9, 9, 9]),
      ...pngChunk("IEND", []),
    ]);
    const out = stripPngMetadata(png);
    const text = Buffer.from(out).toString("latin1");
    expect(text).toContain("IHDR");
    expect(text).toContain("IDAT");
    expect(text).toContain("IEND");
    expect(text).not.toContain("pHYs");
    expect(text).not.toContain("iCCP");
    expect(text).not.toContain("tEXt");
    expect(text).not.toContain("eXIf");
  });

  it("returns non-PNG / truncated input untouched", () => {
    const notPng = u8([0xff, 0xd8, 0xff, 0xe0]);
    expect(stripPngMetadata(notPng)).toBe(notPng);
    const truncated = u8([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(stripPngMetadata(truncated)).toBe(truncated);
  });
});

describe("stripBlobMetadata", () => {
  it("strips a JPEG blob by magic bytes and keeps its type", async () => {
    const jpeg = new Blob(
      [
        Uint8Array.from([
          0xff,
          0xd8,
          ...jpegSeg(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]),
          ...jpegSeg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]),
          0xff,
          0xda,
          0x00,
          0x08,
          0x01,
          0x01,
          0x00,
          0x00,
          0x01,
          0xff,
          0xd9,
        ]),
      ],
      { type: "image/jpeg" },
    );
    const out = await stripBlobMetadata(jpeg);
    expect(out.type).toBe("image/jpeg");
    const hex = Buffer.from(await out.arrayBuffer()).toString("hex");
    expect(hex).not.toContain("ffe1");
    expect(hex).toContain("ffe0");
    expect(hex.endsWith("ffd9")).toBe(true);
  });

  it("returns unknown-format blobs untouched", async () => {
    const gif = new Blob([Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], {
      type: "image/gif",
    });
    expect(await stripBlobMetadata(gif)).toBe(gif);
  });
});

describe("stripWebpMetadata", () => {
  it("drops ICCP/EXIF/XMP, clears VP8X flags, fixes RIFF size", () => {
    const body = [
      ...webpChunk("VP8X", [0x2c, 0, 0, 0, 0, 0, 0, 0, 0, 0]), // flags: ICC+EXIF+XMP
      ...webpChunk("ICCP", [1, 2, 3, 4]),
      ...webpChunk("EXIF", [1, 2]),
      ...webpChunk("XMP ", [1, 2, 3]),
      ...webpChunk("VP8 ", [5, 6, 7]),
    ];
    const riffSize = 4 + body.length;
    const webp = u8([
      0x52,
      0x49,
      0x46,
      0x46,
      riffSize & 0xff,
      (riffSize >> 8) & 0xff,
      (riffSize >> 16) & 0xff,
      (riffSize >> 24) & 0xff,
      0x57,
      0x45,
      0x42,
      0x50,
      ...body,
    ]);
    const out = stripWebpMetadata(webp);
    const text = Buffer.from(out).toString("latin1");
    expect(text).toContain("VP8X");
    expect(text).toContain("VP8 ");
    expect(text).not.toContain("ICCP");
    expect(text).not.toContain("EXIF");
    expect(text).not.toContain("XMP ");
    // VP8X flags byte cleared of ICC/EXIF/XMP bits.
    const vp8xAt = Buffer.from(out).indexOf("VP8X");
    expect(out[vp8xAt + 8] & 0x2c).toBe(0);
    // RIFF size field equals file length - 8.
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(view.getUint32(4, true)).toBe(out.length - 8);
  });

  it("returns non-WebP / truncated input untouched", () => {
    const notWebp = u8([0xff, 0xd8, 0xff, 0xe0]);
    expect(stripWebpMetadata(notWebp)).toBe(notWebp);
    const truncated = u8([0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56]);
    expect(stripWebpMetadata(truncated)).toBe(truncated);
  });
});
