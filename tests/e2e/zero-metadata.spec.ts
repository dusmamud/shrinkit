import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { gotoApp } from "./helpers";

/**
 * Zero-metadata regression spec.
 *
 * Rule: ShrinkIt outputs carry NO metadata at all — no EXIF, no ICC, no
 * DPI record, no text chunks. The pipeline decodes to pixels first, and
 * src/lib/image/strip.ts removes every metadata segment/chunk the encoder
 * adds (JPEG APP1/APP2, PNG pHYs/iCCP, WebP ICCP, ...).
 *
 * Fixtures (tests/e2e/fixtures/) are hostile: every one carries a shared
 * SECRET string in its metadata, so a leak is caught by both the structural
 * parsers below AND a raw secret scan:
 * - gps.jpg: JPEG with EXIF (Make/Model/GPS/Artist/UserComment + thumbnail),
 *   XMP APP1, APP13 Photoshop/IPTC, APP2 ICC, COM segment.
 * - meta.png: PNG with eXIf + tEXt + iTXt + zTXt + iCCP + pHYs.
 * - meta.webp: WebP with EXIF + ICC profile.
 * - meta.gif: GIF with a Comment Extension carrying the secret.
 * - plain.bmp: clean control (BMP has no metadata standard).
 * Crafted with PIL + JPEG segment surgery (see git history for the script).
 */

const here = import.meta.dirname;
const gps = path.resolve(here, "fixtures/gps.jpg");
const metaPng = path.resolve(here, "fixtures/meta.png");
const metaWebp = path.resolve(here, "fixtures/meta.webp");
const metaGif = path.resolve(here, "fixtures/meta.gif");
const plainBmp = path.resolve(here, "fixtures/plain.bmp");

/** The shared secret embedded in every fixture's metadata. */
const SECRET = Buffer.from("SECRET");

/* ---------------- format parsers (byte-level, no EXIF library) ---------------- */

/** JPEG segment markers up to SOS (entropy data after SOS is opaque). */
function jpegMarkers(bytes: Buffer): number[] {
  const markers: number[] = [];
  let pos = 2; // skip SOI
  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) break;
    let p = pos;
    while (p < bytes.length && bytes[p] === 0xff) p++;
    if (p >= bytes.length) break;
    const marker = bytes[p];
    markers.push(marker);
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos = p + 1;
      continue;
    }
    if (p + 3 > bytes.length) break;
    const len = (bytes[p + 1] << 8) | bytes[p + 2];
    // Segment spans (p-1) .. (p+1+len): FF + marker + len bytes.
    pos = p + 1 + len;
  }
  return markers;
}

/** PNG chunk names in order. */
function pngChunks(bytes: Buffer): string[] {
  const names: string[] = [];
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const len = bytes.readUInt32BE(pos);
    names.push(bytes.toString("ascii", pos + 4, pos + 8));
    pos += 12 + len;
    if (names[names.length - 1] === "IEND") break;
  }
  return names;
}

/** WebP RIFF chunk names + the VP8X flags byte (0 when no VP8X). */
function webpChunks(bytes: Buffer): { names: string[]; vp8xFlags: number } {
  const names: string[] = [];
  let vp8xFlags = 0;
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const type = bytes.toString("ascii", pos, pos + 4);
    const size = bytes.readUInt32LE(pos + 4);
    names.push(type);
    if (type === "VP8X" && size >= 1) vp8xFlags = bytes[pos + 8];
    pos += 8 + size + (size % 2);
  }
  return { names, vp8xFlags };
}

/** GIF extension labels: "comment" or "app:<11-byte app id>". */
function gifExtensions(bytes: Buffer): string[] {
  const found: string[] = [];
  let pos = 6 + 7; // header + logical screen descriptor
  const packed = bytes[10];
  if (packed & 0x80) pos += 3 * 2 ** ((packed & 0x07) + 1); // global colour table
  while (pos < bytes.length) {
    const introducer = bytes[pos];
    if (introducer === 0x3b) break; // trailer
    if (introducer === 0x21) {
      const label = bytes[pos + 1];
      if (label === 0xfe) found.push("comment");
      if (label === 0xff) {
        const appId = bytes.toString("ascii", pos + 3, pos + 14);
        found.push(`app:${appId}`);
      }
      // Skip sub-blocks until the 0x00 terminator.
      pos += 2;
      while (pos < bytes.length && bytes[pos] !== 0x00) pos += 1 + bytes[pos];
      pos += 1;
      continue;
    }
    if (introducer === 0x2c) {
      // Image descriptor: 10 bytes + LZW min code + data sub-blocks.
      pos += 10;
      pos += 1;
      while (pos < bytes.length && bytes[pos] !== 0x00) pos += 1 + bytes[pos];
      pos += 1;
      continue;
    }
    break; // unknown block — stop rather than misparse
  }
  return found;
}

/* ---------------- shared assertions ---------------- */

function expectNoSecret(bytes: Buffer) {
  expect(bytes.includes(SECRET)).toBe(false);
}

function expectCleanJpeg(bytes: Buffer) {
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  const markers = jpegMarkers(bytes);
  expect(markers).toContain(0xe0); // APP0 JFIF (format header, not metadata)
  expect(markers).toContain(0xda); // SOS
  for (const forbidden of [0xe1, 0xe2, 0xed, 0xee, 0xfe]) {
    expect(markers).not.toContain(forbidden);
  }
  expectNoSecret(bytes);
}

function expectCleanPng(bytes: Buffer) {
  expect(bytes.toString("ascii", 1, 4)).toBe("PNG");
  const chunks = pngChunks(bytes);
  expect(chunks[0]).toBe("IHDR");
  expect(chunks[chunks.length - 1]).toBe("IEND");
  for (const chunk of chunks) {
    expect(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]).toContain(chunk);
  }
  expectNoSecret(bytes);
}

function expectCleanWebp(bytes: Buffer) {
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  const { names, vp8xFlags } = webpChunks(bytes);
  for (const chunk of names) {
    expect(["VP8 ", "VP8L", "VP8X", "ALPH"]).toContain(chunk);
  }
  // VP8X flag bits 0x20 (ICC) / 0x08 (EXIF) / 0x04 (XMP) must be clear.
  expect(vp8xFlags & 0x2c).toBe(0);
  expectNoSecret(bytes);
}

function expectCleanGif(bytes: Buffer) {
  expect(bytes.toString("ascii", 0, 6)).toMatch(/^GIF8[79]a$/);
  const exts = gifExtensions(bytes);
  expect(exts).not.toContain("comment");
  for (const ext of exts) {
    expect(ext).not.toMatch(/^app:(XMP Data|ICCRGBG1)/);
  }
  expectNoSecret(bytes);
}

/* ---------------- drivers ---------------- */

/** The output must not just parse — it must decode in the browser. */
async function expectDecodes(page: Page, bytes: Buffer) {
  const dims = await page.evaluate(
    async (arr: number[]) => {
      try {
        const bmp = await createImageBitmap(new Blob([new Uint8Array(arr)]));
        const out = { width: bmp.width, height: bmp.height };
        bmp.close();
        return out;
      } catch {
        return null;
      }
    },
    [...bytes],
  );
  // A stripped-but-corrupt file (e.g. missing DQT/SOF/DHT) fails to decode.
  expect(dims).not.toBeNull();
  expect(dims!.width).toBeGreaterThan(0);
  expect(dims!.height).toBeGreaterThan(0);
}

async function processMain(page: Page, file: string, format: string): Promise<Buffer> {
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(file);
  await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId("format-select").selectOption(format);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout: 90_000 });
  const btn = panel.getByRole("button", { name: "Download image" }).first();
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const dlPromise = page.waitForEvent("download", { timeout: 30_000 });
  await btn.click();
  const download = await dlPromise;
  const outPath = `/tmp/zero-meta-${Date.now()}`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  await expectDecodes(page, bytes);
  return bytes;
}

async function process50kb(page: Page, file: string): Promise<Buffer> {
  await page.goto("http://localhost:7860/tools/compress-to-50kb");
  await page.locator('input[type="file"]').first().setInputFiles(file);
  const dl = page.getByRole("link", { name: "Download Compressed Image" });
  await expect(dl).toBeVisible({ timeout: 90_000 });
  const dlPromise = page.waitForEvent("download", { timeout: 30_000 });
  await dl.click();
  const download = await dlPromise;
  const outPath = `/tmp/zero-meta-50kb-${Date.now()}`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  await expectDecodes(page, bytes);
  return bytes;
}

/* ---------------- tests ---------------- */

test("1. GPS JPEG → JPEG: no EXIF/ICC/COM at all", async ({ page }) => {
  expectCleanJpeg(await processMain(page, gps, "jpeg"));
});

test("2. GPS JPEG → PNG: no pHYs/iCCP/text chunks", async ({ page }) => {
  expectCleanPng(await processMain(page, gps, "png"));
});

test("3. Metadata PNG → PNG: eXIf/text/iCCP/pHYs all gone", async ({ page }) => {
  expectCleanPng(await processMain(page, metaPng, "png"));
});

test("4. Metadata PNG → JPEG: no EXIF/ICC", async ({ page }) => {
  expectCleanJpeg(await processMain(page, metaPng, "jpeg"));
});

test("5. Metadata WebP → WebP: no ICCP/EXIF/XMP, VP8X flags clear", async ({ page }) => {
  expectCleanWebp(await processMain(page, metaWebp, "webp"));
});

test("6. Metadata GIF → GIF: no comment/XMP/ICC extensions", async ({ page }) => {
  expectCleanGif(await processMain(page, metaGif, "gif"));
});

test("7. Clean BMP → JPEG: control stays clean", async ({ page }) => {
  expectCleanJpeg(await processMain(page, plainBmp, "jpeg"));
});

test("8. 50KB tool (GPS JPEG): canvas-only output carries no metadata", async ({ page }) => {
  expectCleanJpeg(await process50kb(page, gps));
});
