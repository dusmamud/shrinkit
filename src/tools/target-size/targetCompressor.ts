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
    bitmap = await createImageBitmap(file);
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

  const dataUrl = URL.createObjectURL(bestBlob);

  return {
    blob: bestBlob,
    dataUrl,
    width: targetW,
    height: targetH,
    originalBytes,
    outputBytes: bestBlob.size,
    qualityUsed: Math.round(bestQuality * 100),
    iterations,
  };
}
