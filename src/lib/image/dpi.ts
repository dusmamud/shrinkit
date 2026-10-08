/**
 * DPI metadata handling.
 *
 * `canvas.toBlob()` does not write any DPI/resolution metadata, so a resized
 * image would silently lose the user's DPI setting (and any tool reading the
 * file would fall back to its own default, usually 72 or 96). This module
 * writes the DPI honestly:
 *
 * - JPEG: a minimal EXIF APP1 segment carrying XResolution / YResolution /
 *   ResolutionUnit, built with piexifjs (which correctly relocates IFD data).
 * - PNG: a pHYs chunk (pixels per unit, unit = metre) inserted by hand —
 *   the conversion is dpi / 0.0254 = pixels per metre.
 * - WebP / GIF: no standard DPI container is written; the callers document
 *   this and leave the bytes untouched.
 *
 * Also contains the EXIF "preserve" path: copy the source file's EXIF into
 * the output with Orientation reset to 1 (rotation is baked into the pixels
 * during decode) and the resolution tags updated to the user's DPI.
 */

/* ------------------------------------------------------------------ */
/* byte helpers                                                        */
/* ------------------------------------------------------------------ */

/** CRC-32 (IEEE 802.3) used by PNG chunk framing. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** data:image/...;base64,… → raw bytes */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** raw bytes → data:image/<subtype>;base64,… */
export function bytesToDataUrl(bytes: Uint8Array, subtype: string): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const b64 =
    typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return `data:image/${subtype};base64,${b64}`;
}

/* ------------------------------------------------------------------ */
/* PNG pHYs                                                            */
/* ------------------------------------------------------------------ */

/**
 * Insert (or replace) a pHYs chunk declaring the DPI.
 * pHYs stores pixels-per-metre; 1 inch = 0.0254 m exactly.
 * Returns the original bytes untouched when the input is not a PNG
 * or the DPI is not a positive finite number.
 */
export function injectPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  if (!isPng(png) || !Number.isFinite(dpi) || dpi <= 0) return png;

  const ppux = Math.max(1, Math.round(dpi / 0.0254));
  const physData = new Uint8Array(9);
  const view = new DataView(physData.buffer);
  view.setUint32(0, ppux);
  view.setUint32(4, ppux);
  physData[8] = 1; // unit specifier: metre

  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const framed = new Uint8Array(4 + 4 + 9 + 4);
  const fview = new DataView(framed.buffer);
  fview.setUint32(0, 9);
  framed.set(type, 4);
  framed.set(physData, 8);
  fview.setUint32(17, crc32(new Uint8Array([...type, ...physData])));

  // Walk chunks; drop any existing pHYs, insert the new one right after IHDR.
  const out: number[] = [];
  for (let i = 0; i < 8; i++) out.push(png[i]); // signature
  let pos = 8;
  let inserted = false;
  while (pos + 8 <= png.length) {
    const len = (png[pos] << 24) | (png[pos + 1] << 16) | (png[pos + 2] << 8) | png[pos + 3];
    const name = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const chunkEnd = pos + 12 + len;
    if (chunkEnd > png.length || len < 0) break; // corrupt — bail out safely
    if (name === "pHYs") {
      pos = chunkEnd; // drop the old one
      continue;
    }
    for (let i = pos; i < chunkEnd; i++) out.push(png[i]);
    if (name === "IHDR" && !inserted) {
      for (const b of framed) out.push(b);
      inserted = true;
    }
    pos = chunkEnd;
    if (name === "IEND") break;
  }
  if (!inserted) return png; // no IHDR found — leave file alone
  return Uint8Array.from(out);
}

/* ------------------------------------------------------------------ */
/* JPEG EXIF                                                           */
/* ------------------------------------------------------------------ */

/**
 * Write a minimal EXIF APP1 segment declaring the DPI, replacing any
 * EXIF the encoder may have left. Returns the input untouched when it is
 * not a JPEG or the DPI is invalid. In "strip metadata" mode this is the
 * only metadata the output carries.
 */
export async function injectJpegDpi(jpeg: Uint8Array, dpi: number): Promise<Uint8Array> {
  if (!isJpeg(jpeg) || !Number.isFinite(dpi) || dpi <= 0) return jpeg;
  const piexif = (await import("piexifjs")).default;
  const rounded = Math.max(1, Math.round(dpi));
  const exifStr = piexif.dump({
    "0th": {
      [piexif.ImageIFD.XResolution]: [rounded, 1],
      [piexif.ImageIFD.YResolution]: [rounded, 1],
      [piexif.ImageIFD.ResolutionUnit]: 2, // 2 = inches
    },
  });
  const dataUrl = bytesToDataUrl(jpeg, "jpeg");
  const stripped = piexif.remove(dataUrl);
  const withExif = piexif.insert(exifStr, stripped);
  return dataUrlToBytes(withExif);
}

/**
 * EXIF "preserve" path: copy the source JPEG's EXIF into the processed
 * output, but reset Orientation to 1 (rotation is already baked into the
 * pixels by the decoder) and set the resolution tags to the user's DPI.
 * Falls back to {@link injectJpegDpi} when the source has no EXIF or the
 * output is not a JPEG.
 */
export async function preserveJpegExif(
  srcJpeg: Uint8Array,
  dstJpeg: Uint8Array,
  dpi: number,
): Promise<Uint8Array> {
  if (!isJpeg(srcJpeg) || !isJpeg(dstJpeg)) return dstJpeg;
  const piexif = (await import("piexifjs")).default;
  let exif: Record<string, Record<number, unknown>>;
  try {
    exif = piexif.load(bytesToDataUrl(srcJpeg, "jpeg")) as Record<string, Record<number, unknown>>;
  } catch {
    return injectJpegDpi(dstJpeg, dpi);
  }
  const ifd0 = exif["0th"] ?? {};
  const hasTags = Object.keys(ifd0).length > 0;
  if (!hasTags && !exif.thumbnail) {
    return injectJpegDpi(dstJpeg, dpi);
  }
  const rounded = Math.max(1, Math.round(dpi));
  ifd0[piexif.ImageIFD.Orientation] = 1;
  ifd0[piexif.ImageIFD.XResolution] = [rounded, 1];
  ifd0[piexif.ImageIFD.YResolution] = [rounded, 1];
  ifd0[piexif.ImageIFD.ResolutionUnit] = 2;
  exif["0th"] = ifd0;
  const exifStr = piexif.dump(exif);
  const stripped = piexif.remove(bytesToDataUrl(dstJpeg, "jpeg"));
  return dataUrlToBytes(piexif.insert(exifStr, stripped));
}
