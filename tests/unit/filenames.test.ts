import { describe, expect, it } from "vitest";
import {
  basenameWithoutExtension,
  outputFileName,
  isSupportedInputFileName,
  formatBytes,
  percentSaved,
  FORMAT_MIME,
  FORMAT_EXTENSION,
} from "../../src/lib/image/filenames";

describe("basenameWithoutExtension", () => {
  it("strips the last extension", () => {
    expect(basenameWithoutExtension("photo.jpg")).toBe("photo");
    expect(basenameWithoutExtension("my.photo.final.PNG")).toBe("my.photo.final");
  });
  it("handles names without extension and paths", () => {
    expect(basenameWithoutExtension("photo")).toBe("photo");
    expect(basenameWithoutExtension("C:\\pics\\photo.jpg")).toBe("photo");
    expect(basenameWithoutExtension("/home/u/photo.jpeg")).toBe("photo");
  });
  it("falls back to 'image' for degenerate names", () => {
    expect(basenameWithoutExtension("")).toBe("image");
    expect(basenameWithoutExtension("...")).toBe("image");
    // A leading-dot file still yields a usable base name.
    expect(basenameWithoutExtension(".jpg")).toBe("jpg");
  });
});

describe("outputFileName", () => {
  it("keeps the base name and swaps the extension", () => {
    expect(outputFileName("demo-photo.jpg", "png")).toBe("demo-photo.png");
    expect(outputFileName("demo-photo.jpg", "jpeg")).toBe("demo-photo.jpg");
    expect(outputFileName("scan.tiff", "webp")).toBe("scan.webp");
    expect(outputFileName("anim.png", "gif")).toBe("anim.gif");
  });
});

describe("isSupportedInputFileName", () => {
  it("accepts the documented formats, case-insensitively", () => {
    for (const ext of ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"]) {
      expect(isSupportedInputFileName(`pic.${ext}`)).toBe(true);
      expect(isSupportedInputFileName(`pic.${ext.toUpperCase()}`)).toBe(true);
    }
  });
  it("rejects everything else", () => {
    expect(isSupportedInputFileName("doc.pdf")).toBe(false);
    expect(isSupportedInputFileName("noextension")).toBe(false);
    expect(isSupportedInputFileName("archive.zip")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats human-readable sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(116847)).toBe("114.11 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
  it("handles invalid input gracefully", () => {
    expect(formatBytes(NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("percentSaved", () => {
  it("computes savings, negative when output grew", () => {
    expect(percentSaved(1000, 250)).toBe(75);
    expect(percentSaved(1000, 1500)).toBe(-50);
    expect(percentSaved(0, 100)).toBe(0);
  });
});

describe("format maps", () => {
  it("covers every output format with a MIME type and extension", () => {
    for (const f of ["jpeg", "png", "gif", "webp"] as const) {
      expect(FORMAT_MIME[f]).toMatch(/^image\//);
      expect(FORMAT_EXTENSION[f]).toMatch(/^[a-z]+$/);
    }
    expect(FORMAT_EXTENSION.jpeg).toBe("jpg");
  });
});
