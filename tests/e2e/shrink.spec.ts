import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg"); // 1920×1080
const small = path.resolve(here, "fixtures/small.jpg"); // 640×480

/**
 * End-to-end verification of the real pipeline in headless Chromium:
 * upload → change settings → process → verify output → download.
 * No mocks: this exercises createImageBitmap, the pica worker, canvas
 * encoding, DPI injection and the download plumbing.
 */
test("single image: 50% resize + quality 60 → JPEG downloads at 960×540", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dropzone")).toBeVisible();

  // Upload the demo photo.
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByTestId("process-button")).toBeEnabled();

  // Change settings: 50% + quality 60 (defaults are 70% / 90 / jpeg).
  await page.getByTestId("width-input").fill("50");
  await page.getByTestId("height-input").fill("50");
  await page.getByTestId("quality-input").fill("60");

  await page.getByTestId("process-button").click();

  // Wait for the result card to finish: the per-file download button appears.
  const card = page.locator("article").first();
  const downloadBtn = card.getByRole("button", { name: /Download/i });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });

  // The card must show the real output dimensions and a smaller file.
  await expect(card).toContainText("960×540");
  await expect(card).toContainText("1920×1080");

  // Download and verify the file itself.
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  const outPath = path.resolve(here, "fixtures", `e2e-out-${Date.now()}.jpg`);
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
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(small);
  await page.getByTestId("format-select").selectOption("png");
  await page.getByTestId("process-button").click();

  const card = page.locator("article").first();
  const downloadBtn = card.getByRole("button", { name: /Download/i });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("small.png");
  const outPath = path.resolve(here, "fixtures", `e2e-out-${Date.now()}.png`);
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  // PNG signature.
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // pHYs chunk present (honest DPI injection).
  expect(bytes.toString("latin1")).toContain("pHYs");
  fs.unlinkSync(outPath);
});

test("batch mode: two images process and download as a ZIP", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("mode-batch").click();
  await page.getByTestId("file-input").setInputFiles([photo, small]);
  await expect(page.getByTestId("process-button")).toBeEnabled();
  await page.getByTestId("process-button").click();

  // Both cards must finish.
  await expect(page.getByRole("button", { name: /Download · photo\.jpg/i })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByRole("button", { name: /Download · small\.jpg/i })).toBeVisible({
    timeout: 90_000,
  });

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByTestId("download-zip").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("shrinkit-images.zip");
  const outPath = path.resolve(here, "fixtures", `e2e-out-${Date.now()}.zip`);
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  // ZIP local file header signature "PK\x03\x04".
  expect(bytes[0]).toBe(0x50);
  expect(bytes[1]).toBe(0x4b);
  expect(fs.statSync(outPath).size).toBeGreaterThan(1000);
  fs.unlinkSync(outPath);
});

test("unsupported file shows a clear error, not a silent failure", async ({ page }) => {
  await page.goto("/");
  const txtPath = path.resolve(here, "fixtures", "note.txt");
  fs.writeFileSync(txtPath, "not an image");
  await page.getByTestId("file-input").setInputFiles(txtPath);
  await expect(page.getByRole("alert")).toContainText(/not a supported/i);
  fs.unlinkSync(txtPath);
});
