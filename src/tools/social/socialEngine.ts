import { decodeBitmapWithHeicFallback } from "../../lib/image/heic";
import { stripBlobMetadata } from "../../lib/image/strip";
/**
 * Standalone Social Media Resizer Engine.
 *
 * 100% Client-Side. Fits or crops images to exact social media platform aspect ratios
 * with optional intelligent background padding so zero content is cropped out.
 */

export interface SocialPreset {
  id: string;
  platform: "Instagram" | "YouTube" | "Twitter" | "LinkedIn";
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: "ig-square",
    platform: "Instagram",
    name: "Instagram Square",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
  },
  {
    id: "ig-story",
    platform: "Instagram",
    name: "Instagram Story / Reel",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
  },
  {
    id: "ig-portrait",
    platform: "Instagram",
    name: "Instagram Portrait",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
  },
  {
    id: "yt-thumb",
    platform: "YouTube",
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
  },
  {
    id: "yt-banner",
    platform: "YouTube",
    name: "YouTube Channel Banner",
    width: 2560,
    height: 1440,
    aspectRatio: "16:9",
  },
  {
    id: "tw-post",
    platform: "Twitter",
    name: "Twitter / X Post",
    width: 1200,
    height: 675,
    aspectRatio: "16:9",
  },
  {
    id: "li-banner",
    platform: "LinkedIn",
    name: "LinkedIn Cover Banner",
    width: 1584,
    height: 396,
    aspectRatio: "4:1",
  },
];

export interface SocialResizeResult {
  dataUrl: string;
  preset: SocialPreset;
  width: number;
  height: number;
}

export async function resizeForSocial(
  file: File | Blob,
  preset: SocialPreset,
  fitMode: "fit-pad" | "crop-fill" = "crop-fill",
): Promise<SocialResizeResult> {
  const bitmap = await decodeBitmapWithHeicFallback(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const targetW = preset.width;
  const targetH = preset.height;

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetW, targetH)
      : (document.createElement("canvas") as HTMLCanvasElement);

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d") as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error("Canvas 2D unsupported");

  if (fitMode === "crop-fill") {
    // Center crop fill to target aspect ratio
    const targetAspect = targetW / targetH;
    const srcAspect = srcW / srcH;
    let cropW = srcW;
    let cropH = srcH;
    let cropX = 0;
    let cropY = 0;

    if (srcAspect > targetAspect) {
      cropW = Math.round(srcH * targetAspect);
      cropX = Math.round((srcW - cropW) / 2);
    } else {
      cropH = Math.round(srcW / targetAspect);
      cropY = Math.round((srcH - cropH) / 2);
    }

    ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  } else {
    // Fit entire image and pad borders
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, targetW, targetH);

    const scale = Math.min(targetW / srcW, targetH / srcH);
    const scaledW = Math.round(srcW * scale);
    const scaledH = Math.round(srcH * scale);
    const dx = Math.round((targetW - scaledW) / 2);
    const dy = Math.round((targetH - scaledH) / 2);

    ctx.drawImage(bitmap, dx, dy, scaledW, scaledH);
  }

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
    preset,
    width: targetW,
    height: targetH,
  };
}
