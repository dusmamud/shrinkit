/**
 * Minimal hand-written typings for pica (ships no TypeScript definitions).
 * Covers the resize path this app uses.
 */
declare module "pica" {
  export interface PicaResizeOptions {
    alpha?: boolean;
    unsharpAmount?: number;
    unsharpRadius?: number;
    unsharpThreshold?: number;
    filter?: "box" | "hamming" | "lanczos2" | "lanczos3" | "mks2013";
  }
  export interface Pica {
    resize(
      from: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
      to: HTMLCanvasElement | OffscreenCanvas,
      options?: PicaResizeOptions,
    ): Promise<HTMLCanvasElement | OffscreenCanvas>;
  }
  export default function pica(options?: {
    features?: Array<"js" | "wasm" | "ww" | "cib">;
    createCanvas?: (width: number, height: number) => OffscreenCanvas | HTMLCanvasElement;
  }): Pica;
}
