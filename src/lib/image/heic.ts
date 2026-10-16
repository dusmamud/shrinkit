/**
 * HEIC / HEIF input support.
 *
 * Native first: Safari 17+ decodes HEIC through the OS codec, so
 * `createImageBitmap` just works there. Chrome / Edge / Firefox have no
 * native HEIC decoder (HEVC patent licensing), so for them we fall back
 * to libheif (compiled to WebAssembly), lazy-loaded on the first HEIC
 * file only — every other user never downloads it.
 *
 * HEIC *output* is deliberately not offered: no browser can encode HEIC,
 * and libheif-js is decode-only. HEIC is an input format; output is
 * always JPG / PNG / GIF / WebP.
 */

/** Major / compatible `ftyp` brands that mean "HEVC-coded HEIF" (HEIC). */
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Detect any ISO-BMFF image container (HEIC / HEIF / AVIF / .HIF / MP4-like)
 * by its `ftyp` box. Used as the last-resort gate for the WASM fallback:
 * real-world HEIC files do NOT always carry the `heic` brand — the sample
 * in our own fixtures has major brand `mif1`, and Canon `.HIF` / some
 * Android files use major brand `heif` with no `heic` brand anywhere.
 * Relying on the brand alone rejects those files even though libheif
 * decodes them fine.
 */
export function isBmffImage(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && ascii(bytes, 4, 8) === "ftyp";
}

/**
 * Detect HEIC by the ISO-BMFF `ftyp` box, never by extension or MIME type,
 * so a HEIC renamed to `.jpg` is still caught. AVIF shares the `ftyp` box
 * but uses the `avif` brand and decodes natively everywhere, so it is
 * deliberately NOT matched here.
 */
export function isHeicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (ascii(bytes, 4, 8) !== "ftyp") return false;
  if (HEIC_BRANDS.has(ascii(bytes, 8, 12))) return true;
  // Compatible brands follow the 4-byte minor version at offset 12.
  const end = Math.min(bytes.length, 64);
  for (let off = 16; off + 4 <= end; off += 4) {
    if (HEIC_BRANDS.has(ascii(bytes, off, off + 4))) return true;
  }
  return false;
}

export interface HeifImageLike {
  get_width(): number;
  get_height(): number;
  display(
    imageData: { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number },
    callback: (
      data: { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } | null,
    ) => void,
  ): void;
}

export interface HeifDecoderLike {
  decode(data: Uint8Array): HeifImageLike[];
}

export interface LibHeifLike {
  HeifDecoder: new () => HeifDecoderLike;
}

/**
 * Decode a HEIC / HEIF file to raw RGBA pixels. Pure data in, pure data
 * out — no DOM, so this is unit-testable in Node. libheif applies the
 * HEIF `irot` / mirror transform during decode, so the pixels come back
 * orientation-correct (do NOT re-apply EXIF orientation afterwards).
 */
export async function decodeHeicToPixels(
  input: Uint8Array,
): Promise<{ width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> }> {
  // The WASM decoder (~2 MB) is a lazy chunk: only HEIC users fetch it.
  let mod: { default?: LibHeifLike } & LibHeifLike;
  try {
    mod = (await import("libheif-js/wasm-bundle")) as unknown as {
      default?: LibHeifLike;
    } & LibHeifLike;
  } catch {
    // The decoder chunk itself failed to load (stale deploy, blocked
    // fetch, or a dev setup without `npm install`). Say so plainly —
    // this is a setup problem, not a problem with the user's file.
    throw new Error("The HEIC decoder failed to load. Please refresh the page and try again.");
  }
  const libheif: LibHeifLike = mod.default ?? mod;
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(input);
  if (images.length === 0) {
    throw new Error("No image found in HEIC file");
  }
  // A HEIC file can hold a burst / sequence — the first image is the photo.
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid HEIC dimensions");
  }
  // Plain object, not `new ImageData(...)`: libheif only writes into
  // `.data`, so this stays DOM-free and unit-testable in Node.
  const imageData = {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  };
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) {
        reject(new Error("HEIF processing error"));
        return;
      }
      resolve();
    });
  });
  return { width, height, data: imageData.data };
}

/**
 * Drop-in `createImageBitmap` replacement for the tools pages: native
 * decode first, WASM fallback when native fails on an ISO-BMFF container
 * (HEIC / HEIF / .HIF, whatever brand it carries). Non-BMFF files that
 * fail native decode re-throw the original error.
 */
export async function decodeBitmapWithHeicFallback(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch (nativeError) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!isBmffImage(bytes)) throw nativeError;
    const { width, height, data } = await decodeHeicToPixels(bytes);
    return await createImageBitmap(new ImageData(data, width, height));
  }
}
