import { decodeBitmapWithHeicFallback } from "../../lib/image/heic";
import { stripBlobMetadata } from "../../lib/image/strip";
/**
 * Standalone Client-Side Target File Size (KB) Compressor.
 *
 * Completely isolated from main app source code.
 * Runs 100% in-browser using HTML5 Canvas / OffscreenCanvas with binary search
 * to hit an exact KB ceiling (e.g. < 50 KB, < 20 KB) while preserving maximum visual clarity.
 */

export interface CompressionOptions {
  targetKb: number;
  format?: "image/jpeg" | "image/webp";
  maxDimension?: number;
  /**
   * Black & White mode for signatures / scans: converts the image to
   * grayscale and binarizes it with Otsu's threshold, producing
   * razor-sharp black-on-white output that compresses far smaller.
   */
  blackWhite?: boolean;
}

/**
 * Otsu's method: pick the threshold that best separates the grayscale
 * histogram into two classes, then binarize every pixel to pure
 * black or pure white. Used for signature / document scans.
 */
function applyBlackWhiteThreshold(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray]++;
  }
  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0;
  let wB = 0;
  let maxVariance = -1;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = gray > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
}

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  qualityUsed: number;
  iterations: number;
}

export async function compressToTargetKb(
  file: File | Blob,
  options: CompressionOptions,
): Promise<CompressionResult> {
  const targetBytes = Math.max(1024, options.targetKb * 1024);
  const format = options.format || "image/jpeg";
  const originalBytes = file.size;

  // 1. Decode image bitmap
  let bitmap: ImageBitmap;
  if (typeof createImageBitmap === "function") {
    bitmap = await decodeBitmapWithHeicFallback(file);
  } else {
    bitmap = await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img as unknown as ImageBitmap);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to decode image"));
      };
      img.src = url;
    });
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;

  // Scale down dimensions if maxDimension is specified or if image is gigantic (> 2400px)
  let targetW = srcW;
  let targetH = srcH;
  const maxDim = options.maxDimension || (options.targetKb <= 50 ? 1200 : 2400);

  if (targetW > maxDim || targetH > maxDim) {
    if (targetW >= targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  // 2. Render onto Canvas
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : (document.createElement("canvas") as HTMLCanvasElement);

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) {
    throw new Error("Canvas 2D context is not supported in this browser.");
  }

  // JPEG doesn't support transparency — composite on solid white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  if (bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }

  // Black & White mode: grayscale + Otsu binarization for signatures/scans.
  if (options.blackWhite) {
    applyBlackWhiteThreshold(ctx, targetW, targetH);
  }

  // Helper to convert canvas to blob
  const encodeCanvas = (quality: number): Promise<Blob> => {
    if (canvas instanceof OffscreenCanvas) {
      return canvas.convertToBlob({ type: format, quality });
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), format, quality);
    });
  };

  // 3. Binary Search for optimal quality
  let minQ = 0.05;
  let maxQ = 0.98;
  let bestBlob: Blob | null = null;
  let bestQuality = 0.8;
  let iterations = 0;

  for (let i = 0; i < 8; i++) {
    iterations++;
    const midQ = (minQ + maxQ) / 2;
    const blob = await encodeCanvas(midQ);

    if (blob.size <= targetBytes) {
      bestBlob = blob;
      bestQuality = midQ;
      minQ = midQ; // Try higher quality
    } else {
      maxQ = midQ; // Quality too high, file too large
    }

    // Stop early if within 2% or 500 bytes of target
    if (blob.size <= targetBytes && targetBytes - blob.size <= Math.max(500, targetBytes * 0.02)) {
      bestBlob = blob;
      bestQuality = midQ;
      break;
    }
  }

  // Fallback to lowest test blob if impossible to fit at full resolution
  if (!bestBlob) {
    bestBlob = await encodeCanvas(0.05);
    bestQuality = 0.05;
  }

  // Zero-metadata output: strip the encoder's ICC profile (JPEG APP2 /
  // WebP ICCP). Stripping only shrinks the file, so the ≤ target check
  // that selected this blob still holds.
  const cleanBlob = await stripBlobMetadata(bestBlob);
  const dataUrl = URL.createObjectURL(cleanBlob);

  return {
    blob: cleanBlob,
    dataUrl,
    width: targetW,
    height: targetH,
    originalBytes,
    outputBytes: cleanBlob.size,
    qualityUsed: Math.round(bestQuality * 100),
    iterations,
  };
}
