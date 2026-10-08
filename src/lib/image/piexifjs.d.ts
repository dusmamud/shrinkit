/**
 * Minimal hand-written typings for piexifjs.
 * piexifjs ships no TypeScript definitions and @types/piexifjs does not
 * exist on npm, so we declare just the surface we use. The runtime
 * behaviour (EXIF dump/insert/remove on JPEG data URLs) is the library's
 * documented API.
 */
declare module "piexifjs" {
  export interface IfdData {
    [tag: number]: number | string | number[] | number[][];
  }
  export interface ExifData {
    "0th"?: IfdData;
    Exif?: IfdData;
    GPS?: IfdData;
    Interop?: IfdData;
    "1st"?: IfdData;
    thumbnail?: string;
  }
  export interface ImageIfd {
    XResolution: number;
    YResolution: number;
    ResolutionUnit: number;
    Orientation: number;
  }
  const piexif: {
    ImageIFD: ImageIfd;
    load(dataUrl: string): ExifData;
    dump(exifData: ExifData): string;
    insert(exifStr: string, jpegDataUrl: string): string;
    remove(jpegDataUrl: string): string;
  };
  export default piexif;
}
