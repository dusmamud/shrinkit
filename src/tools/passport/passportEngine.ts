import { decodeBitmapWithHeicFallback } from "../../lib/image/heic";
import { stripBlobMetadata } from "../../lib/image/strip";
/**
 * Standalone Passport & Visa Photo Maker Engine.
 *
 * 100% In-Browser & Private.
 * Formats portrait photos to official national passport & visa dimensions with 300 DPI.
 */

export interface PassportSpec {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  targetWidthPx: number;
  targetHeightPx: number;
  dpi: number;
  description: string;
}

export const PASSPORT_SPECS: PassportSpec[] = [
  {
    id: "india",
    name: "India Passport & Govt Exam",
    country: "India",
    widthMm: 35,
    heightMm: 45,
    targetWidthPx: 413,
    targetHeightPx: 531,
    dpi: 300,
    description:
      "Standard 35x45 mm size with 300 DPI for Indian passports, OCI, and civil exam forms.",
  },
  {
    id: "us",
    name: "US Passport & Visa (2x2 inch)",
    country: "USA",
    widthMm: 51,
    heightMm: 51,
    targetWidthPx: 600,
    targetHeightPx: 600,
    dpi: 300,
    description:
      "Square 2x2 inches (51x51 mm) at 300 DPI for US State Department and DS-160 visa forms.",
  },
  {
    id: "schengen",
    name: "Schengen / EU Visa",
    country: "European Union",
    widthMm: 35,
    heightMm: 45,
    targetWidthPx: 413,
    targetHeightPx: 531,
    dpi: 300,
    description: "Official 35x45 mm photo requirements for European Schengen visa applications.",
  },
  {
    id: "uk",
    name: "UK Passport & Visa",
    country: "United Kingdom",
    widthMm: 35,
    heightMm: 45,
    targetWidthPx: 413,
    targetHeightPx: 531,
    dpi: 300,
    description: "Official 35x45 mm size for British passports and UK VI visa appointments.",
  },
];

export interface ProcessedPassportPhoto {
  dataUrl: string;
  width: number;
  height: number;
  spec: PassportSpec;
  fileSizeBytes: number;
}

export async function generatePassportPhoto(
  file: File | Blob,
  spec: PassportSpec,
  background: "white" | "original" = "white",
): Promise<ProcessedPassportPhoto> {
  const bitmap = await decodeBitmapWithHeicFallback(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const targetW = spec.targetWidthPx;
  const targetH = spec.targetHeightPx;
  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;

  // Center-crop source image to target aspect ratio
  let cropW = srcW;
  let cropH = srcH;
  let cropX = 0;
  let cropY = 0;

  if (srcAspect > targetAspect) {
    // Source is wider than target: crop horizontal edges
    cropW = Math.round(srcH * targetAspect);
    cropX = Math.round((srcW - cropW) / 2);
  } else {
    // Source is taller than target: crop vertical edges (bias slightly toward top for heads)
    cropH = Math.round(srcW / targetAspect);
    cropY = Math.max(0, Math.round((srcH - cropH) * 0.3)); // 30% top bias for head alignment
  }

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : (document.createElement("canvas") as HTMLCanvasElement);

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error("Canvas 2D unsupported");

  if (background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // Draw center-cropped portion scaled to target dimensions
  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  bitmap.close();

  let blob: Blob;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  } else {
    blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92);
    });
  }

  // Zero-metadata output: strip the encoder's ICC profile (JPEG APP2).
  blob = await stripBlobMetadata(blob);

  return {
    dataUrl: URL.createObjectURL(blob),
    width: targetW,
    height: targetH,
    spec,
    fileSizeBytes: blob.size,
  };
}
