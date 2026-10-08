/**
 * Minimal hand-written typings for gifenc (ships no TypeScript definitions).
 * The package exposes a single default-export object; named ESM exports
 * do not exist, so import the default and destructure.
 */
declare module "gifenc" {
  export type RGBAColor = [number, number, number, number];
  export interface GifEncoder {
    writeFrame(
      indexedPixels: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: RGBAColor[]; delay?: number; repeat?: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }
  export interface GifencModule {
    GIFEncoder(opts?: Record<string, unknown>): GifEncoder;
    quantize(
      rgba: Uint8Array | Uint8ClampedArray,
      maxColors: number,
      options?: { format?: string },
    ): RGBAColor[];
    applyPalette(
      rgba: Uint8Array | Uint8ClampedArray,
      palette: RGBAColor[],
      format?: string,
    ): Uint8Array;
  }
  const gifenc: GifencModule;
  export default gifenc;
}
