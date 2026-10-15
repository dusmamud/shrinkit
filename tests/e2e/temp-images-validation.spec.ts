import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "path";
import fs from "fs";

const tempDir = "C:/Users/HP/.gemini/antigravity-ide/brain/1b1b2c1c-0598-4042-bd88-bdbfc72ff98d/scratch/temp_test_images";
const logoPng = path.resolve(tempDir, "logo-1024.png");
const generatedPhoto = path.resolve(tempDir, "generated_photo.jpg");

test.describe("Real Image Testing with Public PNG & Generated Photo", () => {
  test("1. logo-1024.png: upload, custom select unit to pixels, 512x512 resize, format to WebP, and process", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]:`, err.message));
    await gotoApp(page);
    await expect(page.getByTestId("dropzone")).toBeVisible();

    // 1. Upload the public logo PNG from temp folder
    await page.getByTestId("file-input").setInputFiles(logoPng);
    await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
    // Wait for thumbnail probe to display dimensions
    await expect(page.getByTestId("dropzone")).toContainText("1024×1024", { timeout: 15_000 });

    // 2. Settings panel renders
    await expect(page.getByText("Choose new size and format")).toBeVisible();

    // 4. Test Custom Dropdown for Unit -> Pixels
    const unitSelect = page.getByTestId("unit-select");
    await unitSelect.selectOption("pixels");

    // Dimensions in inputs should now be 1024
    await expect(page.getByTestId("width-input")).toHaveValue("1024");
    await expect(page.getByTestId("height-input")).toHaveValue("1024");

    // 5. Change width to 512 (with aspect lock, height becomes 512)
    await page.getByTestId("width-input").fill("512");
    await expect(page.getByTestId("height-input")).toHaveValue("512");

    // 6. Test Custom Dropdown for Format -> WEBP
    const formatSelect = page.getByTestId("format-select");
    await formatSelect.selectOption("webp");

    // 7. Process
    await page.getByTestId("process-button").click();

    // 8. Result panel
    const panel = page.getByTestId("result-panel");
    await expect(panel).toContainText("Your image has been resized!", { timeout: 30_000 });
    await expect(panel).toContainText("512×512");

    // 9. Download and verify binary signature
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    const downloadBtn = panel.getByRole("button", { name: "Download image" });
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.webp$/i);
    const outPath = path.resolve(tempDir, "output_logo_512.webp");
    await download.saveAs(outPath);

    const stats = fs.statSync(outPath);
    expect(stats.size).toBeGreaterThan(0);

    // Verify RIFF / WEBP magic signature (RIFF....WEBP)
    const buf = fs.readFileSync(outPath);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });

  test("2. generated_photo.jpg: upload, percentage scale 50%, quality 70, JPG output", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]:`, err.message));
    await gotoApp(page);
    await expect(page.getByTestId("dropzone")).toBeVisible();

    // Upload generated photo
    await page.getByTestId("file-input").setInputFiles(generatedPhoto);
    await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
    // Wait for thumbnail probe to display dimensions
    await expect(page.getByTestId("dropzone")).toContainText("1024×1024", { timeout: 15_000 });

    // Scale to 50% with quality 70
    await page.getByTestId("width-input").fill("50");
    await expect(page.getByTestId("height-input")).toHaveValue("50");
    await page.getByTestId("quality-input").fill("70");

    // Process
    await page.getByTestId("process-button").click();

    // Verify result
    const panel = page.getByTestId("result-panel");
    await expect(panel).toContainText("Your image has been resized!", { timeout: 30_000 });
    await expect(panel).toContainText("512×512");

    // Download
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    const downloadBtn = panel.getByRole("button", { name: "Download image" });
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.jpg$/i);
    const outPath = path.resolve(tempDir, "output_generated_512.jpg");
    await download.saveAs(outPath);

    const stats = fs.statSync(outPath);
    const original = fs.statSync(generatedPhoto);
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.size).toBeLessThan(original.size);

    // Verify JPEG magic bytes 0xFF 0xD8
    const buf = fs.readFileSync(outPath);
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
  });
});
