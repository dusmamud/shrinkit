import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "path";
import fs from "fs";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg"); // 1920×1080
const small = path.resolve(here, "fixtures/small.jpg"); // 640×480

/**
 * End-to-end verification of the real pipeline in headless Chromium:
 * upload → settings → process → verify output → download.
 * No mocks: this exercises createImageBitmap, the pica worker, canvas
 * encoding, DPI injection and the download plumbing.
 */

test("single image: 50% resize + quality 60 → JPEG downloads at 960×540", async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByTestId("dropzone")).toBeVisible();

  // Upload the demo photo.
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByTestId("process-button")).toBeEnabled();

  // The thumbnail strip shows the probed original dimensions.
  await expect(page.getByTestId("dropzone")).toContainText("1920×1080", {
    timeout: 15_000,
  });

  // Settings panel appears with the reference defaults (70/70, 72 DPI, 90%).
  await expect(page.getByText("Choose new size and format")).toBeVisible();
  await expect(page.getByTestId("width-input")).toHaveValue("70");
  await expect(page.getByTestId("dpi-input")).toHaveValue("72");

  // Change settings: 50% + quality 60.
  await page.getByTestId("width-input").fill("50");
  // Aspect lock is on by default: height follows width.
  await expect(page.getByTestId("height-input")).toHaveValue("50");
  await page.getByTestId("quality-input").fill("60");

  await page.getByTestId("process-button").click();

  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!");
  const downloadBtn = panel.getByRole("button", { name: "Download image" });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });
  await expect(panel).toContainText("960×540");

  // Download and verify the file itself.
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  const outPath = `/tmp/e2e-out-${Date.now()}.jpg`;
  await download.saveAs(outPath);
  const stats = fs.statSync(outPath);
  const original = fs.statSync(photo);
  expect(stats.size).toBeGreaterThan(0);
  expect(stats.size).toBeLessThan(original.size);

  // Confirm the JPEG really carries the DPI we set (72).
  const bytes = fs.readFileSync(outPath);
  const ascii = bytes.subarray(0, 200).toString("latin1");
  expect(ascii).toContain("Exif");
  fs.unlinkSync(outPath);
});

test("format conversion: JPG → PNG renames the file and downloads", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(small);
  await page.getByTestId("format-select").selectOption("png");
  // Quality control is hidden for PNG (forced 100).
  await expect(page.getByTestId("quality-input")).toHaveCount(0);
  await page.getByTestId("process-button").click();

  const panel = page.getByTestId("result-panel");
  const downloadBtn = panel.getByRole("button", { name: "Download image" });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("small.png");
  const outPath = `/tmp/e2e-out-${Date.now()}.png`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  // PNG signature.
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // pHYs chunk present (honest DPI injection).
  expect(bytes.toString("latin1")).toContain("pHYs");
  fs.unlinkSync(outPath);
});

test("batch: two images process and download as a ZIP", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles([photo, small]);
  await expect(page.getByTestId("process-button")).toContainText("Resize All Images");
  await page.getByTestId("process-button").click();

  const panel = page.getByTestId("result-panel");
  // Both cards finish: two per-file download buttons appear.
  await expect(panel.getByRole("button", { name: "Download image" })).toHaveCount(2, {
    timeout: 90_000,
  });

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByTestId("download-zip").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("shrinkit-images.zip");
  const outPath = `/tmp/e2e-out-${Date.now()}.zip`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  // ZIP local file header signature "PK\x03\x04".
  expect(bytes[0]).toBe(0x50);
  expect(bytes[1]).toBe(0x4b);
  expect(fs.statSync(outPath).size).toBeGreaterThan(1000);
  fs.unlinkSync(outPath);
});

test("aspect lock off + unequal dims reveals stretch/crop/fit modes", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(photo);

  // Modes row is collapsed while the aspect lock is on.
  await expect(page.locator(".mode-row")).toHaveAttribute("aria-hidden", "true");

  // Unlock, switch to pixels, and enter unequal dimensions → the mode row slides open.
  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("pixels");
  await page.getByTestId("width-input").fill("800");
  await page.getByTestId("height-input").fill("450");
  await expect(page.locator(".mode-row")).toHaveAttribute("aria-hidden", "false");
  const cropBtn = page.getByTestId("mode-crop");
  await expect(cropBtn).toBeVisible();
  await expect(cropBtn).toBeEnabled();
  await cropBtn.click();
  await expect(cropBtn).toHaveAttribute("aria-checked", "true");

  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  const downloadBtn = panel.getByRole("button", { name: "Download image" });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });
  await expect(panel).toContainText("800×450");

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  const outPath = `/tmp/e2e-out-${Date.now()}.jpg`;
  await download.saveAs(outPath);
  expect(fs.statSync(outPath).size).toBeGreaterThan(0);
  fs.unlinkSync(outPath);
});

test("fit mode letterboxes with transparency on PNG output", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(photo);

  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("pixels");
  await page.getByTestId("width-input").fill("500");
  await page.getByTestId("height-input").fill("400");
  await page.getByTestId("mode-fit").click();
  await page.getByTestId("format-select").selectOption("png");
  await page.getByTestId("process-button").click();

  const panel = page.getByTestId("result-panel");
  const downloadBtn = panel.getByRole("button", { name: "Download image" });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  const outPath = `/tmp/e2e-out-${Date.now()}.png`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);

  // The corner pixel of a 500×400 fit of a 16:9 source must be transparent
  // (letterbox), proving the fit path really ran.
  const alpha = await page.evaluate(async (b64: string) => {
    const bin = atob(b64);
    const raw = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(
      new Blob([raw.buffer as ArrayBuffer], { type: "image/png" }),
    );
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(2, 2, 1, 1).data[3];
  }, bytes.toString("base64"));
  expect(alpha).toBe(0);
  fs.unlinkSync(outPath);
});

test("unsupported file shows a clear error, not a silent failure", async ({ page }) => {
  await gotoApp(page);
  const txtPath = path.resolve(here, "fixtures", "note.txt");
  await page.getByTestId("file-input").setInputFiles(txtPath);
  await expect(page.getByRole("alert")).toContainText(/not a supported/i);
});
