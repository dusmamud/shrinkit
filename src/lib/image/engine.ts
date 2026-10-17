/**
 * The real image pipeline: decode → validate → resize → flatten → encode → strip.
 *
 * Everything here runs on real browser APIs — no mocks, no stubs:
 * - decode: createImageBitmap with EXIF-orientation baking (plus a manual
 *   fallback for engines that ignore the option)
 * - resize: pica (worker-based, multi-step Lanczos downscale)
 * - encode: canvas blobs, plus gifenc for GIF
 * - metadata: none. Outputs are stripped of every metadata segment/chunk
 *   (see strip.ts). DPI is used only to convert cm/inches to pixels.
 *
 * This module is intentionally DOM-light so it can run both inside the
 * dedicated Web Worker (preferred — the UI never freezes) and on the main
 * thread as a fallback. It never touches `document` unless OffscreenCanvas
 * is unavailable.
 */
import pica from "pica";
import gifenc from "gifenc";

const { GIFEncoder, quantize, applyPalette } = gifenc;

/**
 * Read the EXIF orientation tag the hard way, for the rare engine that
 * ignores `imageOrientation: "from-image"`. Lazy-loaded so exifr never
 * lands in the initial bundle. Handles both ESM and CJS module shapes.
 */
async function readOrientationFallback(blob: Blob): Promise<number> {
  try {
    const mod = (await import("exifr")) as unknown as {
      orientation?: (d: Blob) => Promise<number | undefined>;
      default?: { orientation?: (d: Blob) => Promise<number | undefined> };
    };
    const fn = mod.orientation ?? mod.default?.orientation;
    if (!fn) return 1;
    const tag = await fn(blob);
    return typeof tag === "number" && tag >= 1 && tag <= 8 ? tag : 1;
  } catch {
    return 1;
  }
}
import { toPixels, cropRect, fitDims, type SizeUnit } from "./units";
import { checkInputDimensions, checkOutputDimensions } from "./limits";
import { stripJpegMetadata, stripPngMetadata, stripWebpMetadata } from "./strip";
import { outputFileName, type OutputFormat } from "./filenames";
import { decodeHeicToPixels, isBmffImage, isHeicBytes } from "./heic";

export type { OutputFormat };

/**
 * How the source image is mapped onto the target box:
 * - "stretch": direct resize (may change the aspect ratio) — the default,
 *   byte-identical to the original pipeline.
 * - "crop": center-crop the source to the target aspect ratio first, then
 *   resize — the output fills the box exactly, no distortion.
 * - "fit": resize to fit inside the box preserving aspect ratio, then
 *   letterbox with the background colour (or transparency for PNG/WebP).
 */
export type ResizeMode = "stretch" | "crop" | "fit";

export interface ProcessSettings {
  width: number;
  height: number;
  unit: SizeUnit;
  dpi: number;
  format: OutputFormat;
  /** 0–100. Only affects JPEG and WebP output. */
  quality: number;
  background: "white" | "black";
  /** Defaults to "stretch" when omitted. */
  mode?: ResizeMode;
}

export interface ProcessedImage {
  /** Encoded output bytes. */
  data: Uint8Array;
  width: number;
  height: number;
  format: OutputFormat;
  fileName: string;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  outputBytes: number;
  /** True when transparency was flattened onto the background colour. */
  flattened: boolean;
  /** True when the input was large enough to deserve a "this was heavy" note. */
  warnLargeInput: boolean;
}

export type ProcessErrorCode =
  "decode-failed" | "too-large" | "invalid-size" | "encode-failed" | "aborted";

export class ProcessError extends Error {
  readonly code: ProcessErrorCode;
  constructor(code: ProcessErrorCode, message: string) {
    super(message);
    this.name = "ProcessError";
    this.code = code;
  }
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/** getContext("2d") with a useful error instead of a null dereference. */
function get2d(canvas: AnyCanvas): Ctx2D {
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) {
    throw new ProcessError("encode-failed", "Could not create a drawing surface.");
  }
  return ctx;
}

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob(quality === undefined ? { type } : { type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      type,
      quality,
    );
  });
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ProcessError("aborted", "Processing was cancelled.");
  }
}

/**
 * Decode with EXIF orientation baked in. Modern browsers honour
 * `imageOrientation: "from-image"`; for anything older we read the
 * orientation tag ourselves and pre-rotate onto a canvas.
 */
async function decodeNormalized(
  input: Uint8Array,
): Promise<{ source: ImageBitmap | AnyCanvas; width: number; height: number }> {
  const blob = new Blob([input.buffer as ArrayBuffer]);
  try {
    const bmp = await createImageBitmap(blob, {
      imageOrientation: "from-image",
    });
    return { source: bmp, width: bmp.width, height: bmp.height };
  } catch {
    // Fall through to the HEIC / manual paths below.
  }

  // HEIC / HEIF: native decode failed (Chrome / Firefox / Edge have no
  // HEIC decoder — only Safari 17+ does). Decode via the lazy WASM
  // fallback instead of the manual path, which would fail again on the
  // same file. The gate is "any ISO-BMFF container", not the `heic`
  // brand: real files use `mif1` / `heif` major brands with no `heic`
  // brand anywhere (Canon .HIF, some Android files), and libheif
  // decodes those fine.
  if (isHeicBytes(input) || isBmffImage(input)) {
    try {
      const { width, height, data } = await decodeHeicToPixels(input);
      const bmp = await createImageBitmap(new ImageData(data, width, height));
      return { source: bmp, width: bmp.width, height: bmp.height };
    } catch (err) {
      throw new ProcessError(
        "decode-failed",
        err instanceof Error
          ? err.message
          : "This HEIC file could not be decoded. It may use an unsupported HEIC variant.",
      );
    }
  }

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob);
  } catch {
    throw new ProcessError(
      "decode-failed",
      "This file could not be decoded as an image. It may be corrupt or in an unsupported format.",
    );
  }

  const orientation = await readOrientationFallback(blob);
  if (orientation === 1) {
    return { source: bmp, width: bmp.width, height: bmp.height };
  }

  const swap = orientation >= 5 && orientation <= 8;
  const canvas = makeCanvas(swap ? bmp.height : bmp.width, swap ? bmp.width : bmp.height);
  const ctx = get2d(canvas);
  applyExifTransform(ctx, orientation, bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return { source: canvas, width: canvas.width, height: canvas.height };
}

/** Canvas transform matching EXIF orientation values 2–8. */
function applyExifTransform(ctx: Ctx2D, orientation: number, w: number, h: number): void {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, h, w);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w);
      break;
    default:
      break;
  }
}

async function encodeGif(canvas: AnyCanvas, width: number, height: number): Promise<Uint8Array> {
  const ctx = get2d(canvas);
  const imageData = ctx.getImageData(0, 0, width, height);
  const palette = quantize(imageData.data, 256, { format: "rgba4444" });
  const indexed = applyPalette(imageData.data, palette, "rgba4444");
  const gif = GIFEncoder();
  gif.writeFrame(indexed, width, height, { palette, repeat: 0 });
  gif.finish();
  return gif.bytes();
}

const ALPHA_FORMATS: OutputFormat[] = ["png", "webp"];

/**
 * pica's default canvas factory uses `document.createElement("canvas")`,
 * which does not exist inside a Web Worker — its feature check then fails
 * with a misleading "fingerprinting protection" error. Give it an
 * OffscreenCanvas factory whenever we run off the main thread.
 */
function createResizer() {
  if (typeof OffscreenCanvas !== "undefined" && typeof document === "undefined") {
    return pica({
      createCanvas: (width: number, height: number) => new OffscreenCanvas(width, height),
    });
  }
  return pica();
}

/**
 * Run the full pipeline on raw file bytes. Throws ProcessError with a
 * user-presentable message on any failure.
 */
export async function processImageBytes(
  input: Uint8Array,
  fileName: string,
  settings: ProcessSettings,
  signal?: AbortSignal,
): Promise<ProcessedImage> {
  throwIfAborted(signal);

  const {
    source,
    width: srcW,
    height: srcH,
  } = await decodeNormalized(input).catch((err) => {
    if (err instanceof ProcessError) throw err;
    throw new ProcessError(
      "decode-failed",
      "This file could not be decoded as an image. It may be corrupt or in an unsupported format.",
    );
  });
  throwIfAborted(signal);

  const inputCheck = checkInputDimensions(srcW, srcH);
  if (!inputCheck.ok) {
    throw new ProcessError(
      inputCheck.reason === "too-large" ? "too-large" : "decode-failed",
      inputCheck.reason === "too-large"
        ? `This image is too large to process safely (${srcW}×${srcH}). Try a smaller file.`
        : "The decoded image has invalid dimensions.",
    );
  }

  let target: { width: number; height: number };
  try {
    target = toPixels(settings.width, settings.height, settings.unit, settings.dpi, {
      width: srcW,
      height: srcH,
    });
  } catch (err) {
    throw new ProcessError(
      "invalid-size",
      err instanceof Error ? err.message : "Invalid size settings.",
    );
  }
  const outputCheck = checkOutputDimensions(target.width, target.height);
  if (!outputCheck.ok) {
    throw new ProcessError(
      "too-large",
      `The requested output size (${target.width}×${target.height}) is outside safe limits.`,
    );
  }
  throwIfAborted(signal);

  const keepAlpha = ALPHA_FORMATS.includes(settings.format);
  const dst = makeCanvas(target.width, target.height);
  const dstCtx = get2d(dst);
  let flattened = false;

  const mode: ResizeMode = settings.mode ?? "stretch";
  let resizeInput: ImageBitmap | AnyCanvas = source;
  if (mode === "crop") {
    // Center-crop the source to the target aspect ratio before resizing.
    const rect = cropRect(srcW, srcH, target.width, target.height);
    const cropped = makeCanvas(rect.width, rect.height);
    const cctx = get2d(cropped);
    cctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    if (source instanceof ImageBitmap) source.close();
    resizeInput = cropped;
  }

  const resizer = createResizer();
  const resizeOpts = {
    alpha: true,
    unsharpAmount: 80,
    unsharpRadius: 0.6,
    unsharpThreshold: 2,
  };
  try {
    if (mode === "fit") {
      // Resize to fit inside the box, then letterbox onto the destination canvas.
      const fitted = fitDims(srcW, srcH, target.width, target.height);
      const tmp = makeCanvas(fitted.width, fitted.height);
      await resizer.resize(resizeInput, tmp, resizeOpts);
      const dx = Math.round((target.width - fitted.width) / 2);
      const dy = Math.round((target.height - fitted.height) / 2);
      dstCtx.drawImage(tmp, dx, dy, fitted.width, fitted.height);
    } else {
      await resizer.resize(resizeInput, dst, resizeOpts);
    }
  } catch (picaErr) {
    // Resilient fallback: If pica fails (e.g. Brave Shields / privacy extensions block
    // or randomize getImageData, or WebAssembly is restricted), use high-quality native
    // Canvas 2D image scaling so resizing never fails in any browser.
    try {
      dstCtx.imageSmoothingEnabled = true;
      dstCtx.imageSmoothingQuality = "high";
      if (mode === "fit") {
        const fitted = fitDims(srcW, srcH, target.width, target.height);
        const dx = Math.round((target.width - fitted.width) / 2);
        const dy = Math.round((target.height - fitted.height) / 2);
        dstCtx.drawImage(resizeInput, dx, dy, fitted.width, fitted.height);
      } else {
        dstCtx.drawImage(resizeInput, 0, 0, target.width, target.height);
      }
    } catch (fallbackErr) {
      throw new ProcessError(
        "encode-failed",
        `Resizing failed: ${fallbackErr instanceof Error ? fallbackErr.message : picaErr instanceof Error ? picaErr.message : "unknown error"}.`,
      );
    }
  } finally {
    if (resizeInput instanceof ImageBitmap) resizeInput.close();
  }
  throwIfAborted(signal);

  // Formats like JPEG do not support transparency. Browsers default transparent pixels
  // (alpha = 0) to black (#000000) during native JPEG encoding.
  // Composite dst on top of a solid background canvas to guarantee the chosen
  // background color (white or black) is honored.
  let renderCanvas: AnyCanvas = dst;
  if (!keepAlpha) {
    const flatCanvas = makeCanvas(target.width, target.height);
    const flatCtx = get2d(flatCanvas);
    flatCtx.fillStyle = settings.background === "black" ? "#000000" : "#ffffff";
    flatCtx.fillRect(0, 0, target.width, target.height);
    flatCtx.drawImage(dst, 0, 0);
    renderCanvas = flatCanvas;
    flattened = true;
  }

  const quality = Math.min(100, Math.max(0, Math.round(settings.quality))) / 100;
  let encoded: Uint8Array;
  try {
    switch (settings.format) {
      case "jpeg":
        encoded = await blobToBytes(await canvasToBlob(renderCanvas, "image/jpeg", quality));
        break;
      case "webp":
        encoded = await blobToBytes(await canvasToBlob(renderCanvas, "image/webp", quality));
        break;
      case "png":
        encoded = await blobToBytes(await canvasToBlob(renderCanvas, "image/png"));
        break;
      case "gif":
        encoded = await encodeGif(renderCanvas, target.width, target.height);
        break;
    }
  } catch (err) {
    throw new ProcessError(
      "encode-failed",
      `Encoding failed: ${err instanceof Error ? err.message : "unknown error"}.`,
    );
  }
  throwIfAborted(signal);

  // Zero-metadata outputs: strip every metadata segment/chunk the encoder
  // added (JPEG APP1/APP2, PNG pHYs/iCCP, WebP ICCP, ...). DPI is used
  // only to convert cm/inches to pixels; it is never written into a file.
  // GIF needs no stripping — the GIF encoder writes no metadata.
  let finalBytes = encoded;
  if (settings.format === "jpeg") {
    finalBytes = stripJpegMetadata(encoded);
  } else if (settings.format === "png") {
    finalBytes = stripPngMetadata(encoded);
  } else if (settings.format === "webp") {
    finalBytes = stripWebpMetadata(encoded);
  }

  return {
    data: finalBytes,
    width: target.width,
    height: target.height,
    format: settings.format,
    fileName: outputFileName(fileName, settings.format),
    originalWidth: srcW,
    originalHeight: srcH,
    originalBytes: input.length,
    outputBytes: finalBytes.length,
    flattened,
    warnLargeInput: inputCheck.warn,
  };
}
