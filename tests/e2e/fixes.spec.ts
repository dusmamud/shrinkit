import { test, expect } from "@playwright/test";
import { gotoApp, gotoTool } from "./helpers";
import path from "path";
import fs from "fs";

const here = import.meta.dirname;
const small = path.resolve(here, "fixtures/small.jpg"); // 640×480
const heic = path.resolve(here, "fixtures/sample.heic"); // real HEIC, 1440×960

/**
 * Cross-verification for the Oct 2026 fix batch:
 * ToolsShowcase 404 links, FormatPresets click-to-apply,
 * Black & White mode on the 20KB tool, HEIC in the KB tools.
 */

test("ToolsShowcase links never point at /es/tools or /pt/tools (404)", async ({ page }) => {
  for (const locale of ["es", "pt"]) {
    await gotoApp(page, `/${locale}`);
    // No tool link may carry the locale prefix — tools pages are EN-only.
    expect(await page.locator(`a[href^="/${locale}/tools"]`).count()).toBe(0);
    expect(await page.locator('a[href="/tools/compress-to-50kb"]').count()).toBeGreaterThan(0);
  }
  // Clicking a tool card on the ES homepage lands on the real EN tools page.
  await gotoApp(page, "/es");
  await page.locator('a[href="/tools/compress-to-50kb"]').first().click();
  await expect(page).toHaveURL(/\/tools\/compress-to-50kb/);
});

test("FormatPresets: format card sets output format, dims preset sets size + unit", async ({
  page,
}) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(small);
  await expect(page.getByTestId("process-button")).toBeEnabled();

  // WebP format card → format select becomes webp.
  await page.locator('[data-format="webp"]').scrollIntoViewIfNeeded();
  await page.locator('[data-format="webp"]').click();
  await expect(page.getByTestId("format-select")).toHaveValue("webp");

  // Instagram Square preset → 1080×1080 pixels.
  await page.locator('[data-dims-width="1080"][data-dims-height="1080"]').scrollIntoViewIfNeeded();
  await page.locator('[data-dims-width="1080"][data-dims-height="1080"]').click();
  await expect(page.getByTestId("width-input")).toHaveValue("1080");
  await expect(page.getByTestId("height-input")).toHaveValue("1080");
  await expect(page.getByTestId("unit-select")).toHaveValue("pixels");

  // Passport + Signature presets are real links to the dedicated tools.
  await expect(page.locator('a[href="/tools/passport-photo-maker"]').first()).toBeVisible();
  await expect(page.locator('a[href="/tools/compress-to-20kb"]').first()).toBeVisible();
});

test("20KB tool: Black & White toggle produces near-pure black/white pixels", async ({ page }) => {
  await gotoTool(page, "/tools/compress-to-20kb");
  await page.locator('input[type="file"]').setInputFiles(small);

  const resultImg = page.getByAltText("Compressed output");
  await expect(resultImg).toBeVisible({ timeout: 30_000 });
  const before = await resultImg.getAttribute("src");

  // Enable Black & White — the tool re-compresses with Otsu thresholding.
  await page.getByLabel(/Black & White/).check();
  await expect
    .poll(async () => await resultImg.getAttribute("src"), { timeout: 30_000 })
    .not.toBe(before);

  const src = await resultImg.getAttribute("src");
  const stats = await page.evaluate(async (imgSrc) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgSrc!;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bad = 0;
    for (let i = 0; i < data.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        const v = data[i + ch];
        if (Math.min(v, 255 - v) > 16) {
          bad++;
          break;
        }
      }
    }
    return { badFraction: bad / (data.length / 4), width: canvas.width, height: canvas.height };
  }, src);
  expect(stats.width).toBeGreaterThan(0);
  // JPEG ringing near hard edges: allow < 2% of pixels off pure B/W.
  expect(stats.badFraction).toBeLessThan(0.02);
});

test("20KB tool: HEIC input decodes via the WASM fallback", async ({ page }) => {
  await gotoTool(page, "/tools/compress-to-20kb");
  await page.locator('input[type="file"]').setInputFiles(heic);
  await expect(page.getByAltText("Compressed output")).toBeVisible({ timeout: 30_000 });
});

test("HEIC download is a real JPEG, not the HEIC bytes", async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId("file-input").setInputFiles(heic);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout: 60_000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await panel.getByRole("button", { name: "Download image" }).click();
  const download = await downloadPromise;
  const outPath = `/tmp/e2e-heic-out-${Date.now()}.jpg`;
  await download.saveAs(outPath);
  const bytes = fs.readFileSync(outPath);
  // JPEG magic bytes — the output is a real JPEG, not a renamed HEIC.
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  fs.unlinkSync(outPath);
});
