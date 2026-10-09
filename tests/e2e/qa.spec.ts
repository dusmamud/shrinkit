import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { gotoApp } from "./helpers";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg"); // 1920×1080
const small = path.resolve(here, "fixtures/small.jpg"); // 640×480
const transparent = path.resolve(here, "fixtures/transparent.png"); // 400×300 RGBA
const huge = path.resolve(here, "fixtures/huge.jpg"); // 17000×100 (over side limit)

/**
 * QA checklist spec — one test per checklist item.
 * Real pipeline in headless Chromium, no mocks.
 */

async function upload(page: any, files: string | string[]) {
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(files);
  await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
}

async function processAndWaitPanel(page: any, timeout = 90_000) {
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout });
  return panel;
}

async function downloadFirst(page: any, panel: any, ext: RegExp) {
  const btn = panel.getByRole("button", { name: "Download image" }).first();
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const dlPromise = page.waitForEvent("download", { timeout: 30_000 });
  await btn.click();
  const download = await dlPromise;
  expect(download.suggestedFilename()).toMatch(ext);
  const outPath = `/tmp/qa-out-${Date.now()}`;
  await download.saveAs(outPath);
  return outPath;
}

test("1. settings panel renders with reference defaults and layout hooks", async ({ page }) => {
  await upload(page, photo);
  await expect(page.getByText("Choose new size and format")).toBeVisible();
  await expect(page.getByTestId("width-input")).toHaveValue("70");
  await expect(page.getByTestId("height-input")).toHaveValue("70");
  await expect(page.getByTestId("dpi-input")).toHaveValue("72");
  await expect(page.getByTestId("quality-input")).toHaveValue("90");
  await expect(page.getByTestId("unit-select")).toHaveValue("percent");
  await expect(page.getByTestId("format-select")).toHaveValue("jpeg");
  // Aspect lock engaged by default.
  await expect(page.getByTestId("aspect-lock")).toHaveAttribute("aria-pressed", "true");
  // Mode row hidden while locked.
  await expect(page.locator(".mode-row")).toHaveAttribute("aria-hidden", "true");
  // Button label for a single file.
  await expect(page.getByTestId("process-button")).toContainText("Resize Image");
  // Screenshot for visual review.
  await page
    .getByText("Choose new size and format")
    .screenshot({ path: "/tmp/qa-shots/1-settings.png" });
});

test("2. aspect lock: proportional with lock on, independent with lock off", async ({ page }) => {
  await upload(page, photo);
  // Lock ON (default): width 50 → height follows to 50.
  await page.getByTestId("width-input").fill("50");
  await expect(page.getByTestId("height-input")).toHaveValue("50");
  // Lock icon shows the locked state (aria-label flips).
  const lockBtn = page.getByTestId("aspect-lock");
  const labelLocked = await lockBtn.getAttribute("aria-label");
  await lockBtn.click();
  await expect(lockBtn).toHaveAttribute("aria-pressed", "false");
  const labelUnlocked = await lockBtn.getAttribute("aria-label");
  expect(labelLocked).not.toBe(labelUnlocked);
  // Lock OFF: independent values stick.
  await page.getByTestId("width-input").fill("800");
  await page.getByTestId("height-input").fill("450");
  await expect(page.getByTestId("width-input")).toHaveValue("800");
  await expect(page.getByTestId("height-input")).toHaveValue("450");
});

test("3. unit conversions produce mathematically correct output", async ({ page }) => {
  // percent: 50% of 1920×1080 → 960×540
  await upload(page, photo);
  await page.getByTestId("width-input").fill("50");
  let panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("960×540");

  // pixels: 800×450 direct (unlock first so values stay).
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("pixels");
  await page.getByTestId("width-input").fill("800");
  await page.getByTestId("height-input").fill("450");
  panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("800×450");

  // inches at 72 DPI: 2in × 2in → 144×144
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("inches");
  await page.getByTestId("width-input").fill("2");
  await page.getByTestId("height-input").fill("2");
  panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("144×144");

  // cm at 72 DPI: 2.54cm = 1in → 72×72
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("cm");
  await page.getByTestId("width-input").fill("2.54");
  await page.getByTestId("height-input").fill("2.54");
  panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("72×72");
});

test("4. mode row visibility logic + stretch/crop/fit outputs", async ({ page }) => {
  await upload(page, photo);
  const modeRow = page.locator(".mode-row");
  // Locked → hidden.
  await expect(modeRow).toHaveAttribute("aria-hidden", "true");
  // Unlock but keep equal dims (70/70) → still hidden (w == h).
  await page.getByTestId("aspect-lock").click();
  await expect(modeRow).toHaveAttribute("aria-hidden", "true");
  // Unequal dims → slides open.
  await page.getByTestId("unit-select").selectOption("pixels");
  await page.getByTestId("width-input").fill("800");
  await page.getByTestId("height-input").fill("450");
  await expect(modeRow).toHaveAttribute("aria-hidden", "false");
  await page.getByTestId("mode-stretch").screenshot({ path: "/tmp/qa-shots/4-modes.png" });

  // Crop → exact target dims.
  await page.getByTestId("mode-crop").click();
  let panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("800×450");

  // Fit + black bg + JPG → exact target dims, corner pixel is black (letterbox).
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await page.getByTestId("aspect-lock").click();
  await page.getByTestId("unit-select").selectOption("pixels");
  await page.getByTestId("width-input").fill("500");
  await page.getByTestId("height-input").fill("400");
  await page.getByTestId("mode-fit").click();
  await page.getByTestId("bg-black").click();
  panel = await processAndWaitPanel(page);
  await expect(panel).toContainText("500×400");
  const outPath = await downloadFirst(page, panel, /\.jpg$/);
  const corner = await page.evaluate(async (b64: string) => {
    const bin = atob(b64);
    const raw = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([raw.buffer as ArrayBuffer]));
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(3, 3, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, fs.readFileSync(outPath).toString("base64"));
  expect(corner[0]).toBeLessThan(40);
  expect(corner[1]).toBeLessThan(40);
  expect(corner[2]).toBeLessThan(40);
  fs.unlinkSync(outPath);
});

test("5. every output format produces a valid file with the right signature", async ({ page }) => {
  const sigs: Record<string, { opt: string; ext: RegExp; head: number[] }> = {
    jpeg: { opt: "jpeg", ext: /\.jpg$/, head: [0xff, 0xd8] },
    png: { opt: "png", ext: /\.png$/, head: [0x89, 0x50, 0x4e, 0x47] },
    webp: { opt: "webp", ext: /\.webp$/, head: [0x52, 0x49, 0x46, 0x46] },
    gif: { opt: "gif", ext: /\.gif$/, head: [0x47, 0x49, 0x46, 0x38] },
  };
  for (const [name, s] of Object.entries(sigs)) {
    await upload(page, small);
    await page.getByTestId("format-select").selectOption(s.opt);
    if (name === "png" || name === "gif") {
      // Quality hidden for PNG/GIF.
      await expect(page.getByTestId("quality-input")).toHaveCount(0);
    } else {
      await expect(page.getByTestId("quality-input")).toBeVisible();
    }
    const panel = await processAndWaitPanel(page);
    const outPath = await downloadFirst(page, panel, s.ext);
    const bytes = fs.readFileSync(outPath);
    expect([...bytes.subarray(0, s.head.length)]).toEqual(s.head);
    fs.unlinkSync(outPath);
  }
});

test("6. quality actually changes JPEG output size", async ({ page }) => {
  const sizes: number[] = [];
  for (const q of ["90", "20"]) {
    await upload(page, photo);
    await page.getByTestId("quality-input").fill(q);
    const panel = await processAndWaitPanel(page);
    const outPath = await downloadFirst(page, panel, /\.jpg$/);
    sizes.push(fs.statSync(outPath).size);
    fs.unlinkSync(outPath);
  }
  // Lower quality must produce a substantially smaller file.
  expect(sizes[1]).toBeLessThan(sizes[0] * 0.7);
});

test("7. background swatch ring + transparent PNG flattens to chosen color", async ({ page }) => {
  await upload(page, transparent);
  // Ring appears on the selected swatch.
  await page.getByTestId("bg-black").click();
  await expect(page.getByTestId("bg-black")).toHaveClass(/ring-\[3px\]/);
  const panel = await processAndWaitPanel(page);
  const outPath = await downloadFirst(page, panel, /\.jpg$/);
  const corner = await page.evaluate(async (b64: string) => {
    const bin = atob(b64);
    const raw = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([raw.buffer as ArrayBuffer]));
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(3, 3, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, fs.readFileSync(outPath).toString("base64"));
  // JPEG of a flattened transparent image on black: corner ~black.
  expect(corner[0]).toBeLessThan(40);
  expect(corner[1]).toBeLessThan(40);
  expect(corner[2]).toBeLessThan(40);
  fs.unlinkSync(outPath);
});

test("8. process button label switches single ↔ batch", async ({ page }) => {
  await upload(page, photo);
  await expect(page.getByTestId("process-button")).toContainText("Resize Image");
  await page.getByTestId("file-input").setInputFiles([photo, small]);
  await expect(page.getByTestId("process-button")).toContainText("Resize All Images");
});

test("9. result panel shows filename, dims, size and unambiguous % saved", async ({ page }) => {
  await upload(page, photo);
  await page.getByTestId("width-input").fill("50");
  await page.getByTestId("quality-input").fill("60");
  const panel = await processAndWaitPanel(page);
  // Filename with correct extension.
  await expect(panel).toContainText(/photo\.jpg/);
  // Output dimensions.
  await expect(panel).toContainText("960×540");
  // Size shown.
  await expect(panel).toContainText(/KB|MB/);
  // Unambiguous savings text: "<n>% saved" — never a bare negative.
  const text = (await panel.textContent()) ?? "";
  expect(text).toMatch(/\d+(\.\d+)?% saved/);
  expect(text).not.toMatch(/−\d/);
  await panel.screenshot({ path: "/tmp/qa-shots/9-result.png" });
});

test("10a. .txt upload shows a red error banner", async ({ page }) => {
  await gotoApp(page, "/");
  const txtPath = path.resolve(here, "fixtures", "note.txt");
  await page.getByTestId("file-input").setInputFiles(txtPath);
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(/not a supported/i);
  // Red banner styling.
  const bg = await alert.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/221,\s*51,\s*51|#d33/i);
});

test("10b. oversized image is refused cleanly, no crash", async ({ page }) => {
  await upload(page, huge);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel.getByRole("alert")).toContainText(/too large/i, { timeout: 60_000 });
});

test("12. tooltips, hover styles and processing indicator exist", async ({ page }) => {
  await upload(page, photo);
  // Dark tooltips wired via data-tip on the controls (or their wrapper).
  for (const id of ["aspect-lock", "dpi-input", "format-select", "quality-input", "bg-white"]) {
    const tip = await page.getByTestId(id).evaluate((el) => {
      const host = el.closest("[data-tip]") as HTMLElement | null;
      return host?.dataset.tip ?? null;
    });
    expect(tip, id).toBeTruthy();
  }
  // Tooltip CSS renders ::after content from data-tip.
  const css = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText.includes("[data-tip]") && rule.cssText.includes("::after")) {
            return rule.cssText.slice(0, 200);
          }
        }
      } catch {
        /* cross-origin sheet */
      }
    }
    return "";
  });
  expect(css).toContain("data-tip");
  // Hover darken on primary button (class present).
  await expect(page.getByTestId("process-button")).toHaveClass(/hover:bg-\[#0257bf\]/);
  // Drag-over highlights the dropzone (thicker dashed stroke).
  await page.getByTestId("dropzone").dispatchEvent("dragenter");
  const stroke = await page
    .getByTestId("dropzone")
    .locator("svg rect")
    .first()
    .getAttribute("stroke-width");
  expect(stroke).toBe("3.5");
});

test("13. /es/ and /pt/ render the UI fully translated", async ({ page }) => {
  await gotoApp(page, "/es/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByText("Elige el nuevo tamaño y formato")).toBeVisible();
  const esText = await page.getByTestId("dropzone").textContent();
  expect(esText).not.toContain("Choose new size and format");

  await gotoApp(page, "/pt/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByText("Escolha o novo tamanho e formato")).toBeVisible();
});

test("14. EXIF checkbox toggles; file input accepts multiple", async ({ page }) => {
  await upload(page, photo);
  const box = page.getByTestId("exif-checkbox");
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
  const multiple = await page.getByTestId("file-input").getAttribute("multiple");
  expect(multiple).not.toBeNull();
});
