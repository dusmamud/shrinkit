import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "path";
import fs from "fs";

const here = import.meta.dirname;
const heic = path.resolve(here, "fixtures/sample.heic"); // real HEIC photo, 1440×960
const heifBrand = path.resolve(here, "fixtures/heif-brand.heic"); // same photo, ftyp brands rewritten: major mif1, compatible mif1/heif — no "heic" brand anywhere
const hif = path.resolve(here, "fixtures/sample.hif"); // same photo with Canon-style .hif extension

/**
 * HEIC input end-to-end in headless Chromium (which has NO native HEIC
 * decoder): upload → WASM libheif fallback decode → resize → download.
 * This proves the lazy WASM chunk loads and decodes in the real browser.
 */

test("HEIC photo: uploads, decodes via WASM fallback, resizes and downloads", async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByTestId("dropzone")).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(heic);
  await expect(page.getByTestId("process-button")).toBeEnabled();

  // The thumbnail strip shows the probed original dimensions (1440×960),
  // which only happens if the HEIC actually decoded.
  await expect(page.getByTestId("dropzone")).toContainText("1440×960", {
    timeout: 30_000,
  });

  // Resize at 50% → 720×480 JPEG.
  await page.getByTestId("width-input").fill("50");
  await expect(page.getByTestId("height-input")).toHaveValue("50");

  await page.getByTestId("process-button").click();

  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout: 60_000 });
  const downloadBtn = panel.getByRole("button", { name: "Download image" });
  await expect(downloadBtn).toBeVisible({ timeout: 60_000 });
  await expect(panel).toContainText("720×480");

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpe?g$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.statSync(downloadPath!).size;
  expect(bytes).toBeGreaterThan(1000);
});

test("HEIC is listed as a supported input type", async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByTestId("dropzone")).toContainText("HEIC");
});

test("HEIC without any 'heic' brand in ftyp (heif/mif1 brands) still uploads + resizes", async ({
  page,
}) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(heifBrand);
  await expect(page.getByTestId("process-button")).toBeEnabled();
  await expect(page.getByTestId("dropzone")).toContainText("1440×960", {
    timeout: 30_000,
  });
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout: 60_000 });
  await expect(panel).toContainText("1008×672");
});

test("Canon-style .hif extension is accepted and decodes", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(hif);
  await expect(page.getByTestId("process-button")).toBeEnabled();
  await expect(page.getByTestId("dropzone")).toContainText("1440×960", {
    timeout: 30_000,
  });
});
