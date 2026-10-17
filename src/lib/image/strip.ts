/**
 * Zero-metadata output stripping.
 *
 * The pipeline decodes every input to raw pixels first, so source metadata
 * never survives into the encoder. But the encoders themselves add a small
 * amount of metadata: Chrome's canvas JPEG encoder embeds a generic sRGB
 * ICC profile (APP2) and a JFIF header, its WebP encoder embeds a generic
 * ICCP chunk, and a DPI value used to be written into JPEG EXIF / PNG pHYs.
 * The user-facing rule is: **outputs carry no metadata at all** — no EXIF,
 * no ICC, no DPI, no text chunks. These pure functions enforce that by
 * rebuilding each encoder output with only the chunks/segments that carry
 * image data (plus the format headers decoders need).
 *
 * - JPEG: keep SOI, APP0 (JFIF), DQT, SOF, DHT, SOS + entropy data, EOI.
 *   Drop every other APPn segment (APP1 EXIF/XMP, APP2 ICC, APP13 IPTC,
 *   APP14, ...) and COM.
 * - PNG: keep IHDR, PLTE, tRNS, IDAT, IEND. Drop everything else (pHYs,
 *   iCCP, eXIf, tEXt/iTXt/zTXt, tIME, gAMA, cHRM, sRGB, caBX, ...).
 * - WebP: keep VP8, VP8L, VP8X (flags fixed), ALPH. Drop ICCP, EXIF, XMP
 *   and anything else; rebuild the RIFF size.
 * - GIF: nothing to strip — the GIF encoder (gifenc) writes no metadata
 *   (verified empirically: no comment/XMP/ICC extensions in its output).
 *
 * Each function returns the input untouched when it is not the expected
 * format or is malformed — stripping must never corrupt an output.
 */

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length > 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  );
}

/** JPEG: drop all metadata segments, keep image data + JFIF header. */
export function stripJpegMetadata(jpeg: Uint8Array): Uint8Array {
  if (!isJpeg(jpeg)) return jpeg;
  const out: number[] = [0xff, 0xd8]; // SOI
  let pos = 2;
  let sawEoi = false;
  while (pos < jpeg.length) {
    // Skip 0xFF fill bytes; the marker code follows them.
    const segStart = pos;
    while (pos < jpeg.length && jpeg[pos] === 0xff) pos++;
    if (pos >= jpeg.length) break;
    const marker = jpeg[pos];
    if (marker === 0x00) return jpeg; // stuffed byte outside entropy data — malformed
    if (marker === 0xda) {
      // SOS: entropy data follows; copy everything verbatim (it may contain
      // 0xFF bytes, including fake markers) up to and including EOI.
      // A file truncated after SOS has no EOI — leave it untouched.
      if (jpeg.length < 2 || jpeg[jpeg.length - 2] !== 0xff || jpeg[jpeg.length - 1] !== 0xd9) {
        return jpeg;
      }
      for (let i = segStart; i < jpeg.length; i++) out.push(jpeg[i]);
      return Uint8Array.from(out);
    }
    // Standalone markers carry no length field. EOI ends the image.
    if (marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      for (let i = segStart; i <= pos; i++) out.push(jpeg[i]);
      if (marker === 0xd9) {
        sawEoi = true;
        break;
      }
      pos += 1;
      continue;
    }
    if (pos + 3 > jpeg.length) return jpeg; // truncated length field
    const len = (jpeg[pos + 1] << 8) | jpeg[pos + 2];
    if (len < 2 || segStart + 2 + len > jpeg.length) return jpeg; // truncated segment
    // Drop only metadata segments: APP1–APP15 (EXIF/XMP, ICC, IPTC,
    // Adobe, ...) and COM. Keep everything else — including DQT, SOF and
    // DHT, which the decoder needs. APP0 (JFIF) is a format header, kept.
    const isMetadata = marker === 0xfe || (marker >= 0xe1 && marker <= 0xef);
    if (!isMetadata) {
      for (let i = segStart; i < segStart + 2 + len; i++) out.push(jpeg[i]);
    }
    pos = segStart + 2 + len;
  }
  if (!sawEoi) return jpeg; // no EOI — truncated/malformed, leave untouched
  return Uint8Array.from(out);
}

/** PNG: keep only image-data chunks, drop every metadata chunk. */
export function stripPngMetadata(png: Uint8Array): Uint8Array {
  if (!isPng(png)) return png;
  const KEEP = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  const out: number[] = [];
  for (let i = 0; i < 8; i++) out.push(png[i]); // signature
  let pos = 8;
  let sawIend = false;
  while (pos + 8 <= png.length) {
    const len = (png[pos] << 24) | (png[pos + 1] << 16) | (png[pos + 2] << 8) | png[pos + 3];
    if (len < 0 || pos + 12 + len > png.length) return png; // malformed
    const name = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    if (KEEP.has(name)) {
      for (let i = pos; i < pos + 12 + len; i++) out.push(png[i]);
    }
    pos += 12 + len;
    if (name === "IEND") {
      sawIend = true;
      break;
    }
  }
  if (!sawIend) return png; // no IEND — truncated/malformed, leave untouched
  return Uint8Array.from(out);
}

/**
 * Strip a canvas-produced blob by sniffing its format from the magic bytes.
 * Returns a new Blob of the same type, or the original blob when the format
 * is unknown or the bytes are malformed. Used by the tools engines (50KB,
 * Passport, Social, Compare), whose outputs go straight to download.
 */
export async function stripBlobMetadata(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let cleaned: Uint8Array = bytes;
  if (isJpeg(bytes)) cleaned = stripJpegMetadata(bytes);
  else if (isPng(bytes)) cleaned = stripPngMetadata(bytes);
  else if (isWebp(bytes)) cleaned = stripWebpMetadata(bytes);
  else return blob;
  if (cleaned === bytes) return blob; // malformed — left untouched
  return new Blob([cleaned as unknown as BlobPart], { type: blob.type });
}

/** WebP: drop ICCP/EXIF/XMP chunks, fix VP8X flags + RIFF size. */
export function stripWebpMetadata(webp: Uint8Array): Uint8Array {
  if (!isWebp(webp)) return webp;
  const KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH"]);
  // VP8X flag bits: 0x20 ICC, 0x08 EXIF, 0x04 XMP — clear them, keep
  // alpha/animation bits. (Bit positions per the WebP container spec.)
  const DROP_FLAGS = 0x20 | 0x08 | 0x04;
  const chunks: { type: string; data: Uint8Array }[] = [];
  let pos = 12;
  while (pos + 8 <= webp.length) {
    const type = String.fromCharCode(webp[pos], webp[pos + 1], webp[pos + 2], webp[pos + 3]);
    const size =
      webp[pos + 4] | (webp[pos + 5] << 8) | (webp[pos + 6] << 16) | (webp[pos + 7] << 24);
    if (size < 0 || pos + 8 + size > webp.length) return webp; // malformed
    if (KEEP.has(type)) {
      let data = webp.slice(pos + 8, pos + 8 + size);
      if (type === "VP8X" && data.length >= 1) {
        data = data.slice();
        data[0] = data[0] & ~DROP_FLAGS;
      }
      chunks.push({ type, data });
    }
    pos += 8 + size + (size % 2); // chunks are padded to even lengths
  }
  // A well-formed file is fully consumed; leftovers mean truncation.
  if (chunks.length === 0 || pos < webp.length) return webp;
  let size = 4; // "WEBP"
  for (const c of chunks) size += 8 + c.data.length + (c.data.length % 2);
  const out = new Uint8Array(12 + size - 4);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  const view = new DataView(out.buffer);
  view.setUint32(4, size, true);
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  let w = 12;
  for (const c of chunks) {
    out.set(
      [c.type.charCodeAt(0), c.type.charCodeAt(1), c.type.charCodeAt(2), c.type.charCodeAt(3)],
      w,
    );
    view.setUint32(w + 4, c.data.length, true);
    out.set(c.data, w + 8);
    w += 8 + c.data.length + (c.data.length % 2);
  }
  return out;
}
