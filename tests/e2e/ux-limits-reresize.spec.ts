import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "path";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg");

test.describe("UX Limits, Input Bounds & Re-Resize Verification", () => {
  test("shows dropzone limits info and batch counter", async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByTestId("dropzone")).toContainText(
      "Up to 50 images · Max 120 MP per image · JPG, PNG, WebP, GIF, BMP, AVIF",
    );

    // Upload an image
    await page.getByTestId("file-input").setInputFiles(photo);
    await expect(page.getByTestId("dropzone")).toContainText("1 of 50 images");
  });

  test("re-resizing works after changing parameters", async ({ page }) => {
    await gotoApp(page);
    await page.getByTestId("file-input").setInputFiles(photo);

    // Initial resize
    await expect(page.getByTestId("process-button")).toBeEnabled();
    await page.getByTestId("process-button").click();

    const panel = page.getByTestId("result-panel");
    await expect(panel).toContainText("Your image has been resized!", { timeout: 30_000 });
    await expect(panel).toContainText("1344×756");

    // Change setting (width from 70 to 40)
    await page.getByTestId("width-input").fill("40");
    await expect(page.getByTestId("height-input")).toHaveValue("40");

    // Verify button is still enabled for re-resizing
    const processBtn = page.getByTestId("process-button");
    await expect(processBtn).toBeEnabled();

    // Click to re-resize
    await processBtn.click();
    await expect(panel).toContainText("Your image has been resized!", { timeout: 30_000 });
    await expect(panel).toContainText("768×432");
  });

  test("input error handling and limit boundaries", async ({ page }) => {
    await gotoApp(page);
    await page.getByTestId("file-input").setInputFiles(photo);

    const processBtn = page.getByTestId("process-button");
    await expect(processBtn).toBeEnabled();

    // 1. Exceed percentage width (> 500%)
    await page.getByTestId("width-input").fill("600");
    await expect(page.getByText("Width must be between 1% and 500%").first()).toBeVisible();
    await expect(processBtn).toBeDisabled();

    // Restore width
    await page.getByTestId("width-input").fill("50");
    await expect(page.getByText("Width must be between 1% and 500%")).not.toBeVisible();
    await expect(processBtn).toBeEnabled();

    // 2. Exceed quality (> 100%)
    await page.getByTestId("quality-input").fill("150");
    await expect(page.getByText("Quality must be between 1% and 100%").first()).toBeVisible();
    await expect(processBtn).toBeDisabled();

    // Restore quality
    await page.getByTestId("quality-input").fill("85");
    await expect(page.getByText("Quality must be between 1% and 100%")).not.toBeVisible();
    await expect(processBtn).toBeEnabled();

    // 3. Exceed DPI (> 1200)
    await page.getByTestId("dpi-input").fill("1500");
    await expect(
      page.getByText("Resolution must be between 1 and 1,200 DPI.").first(),
    ).toBeVisible();
    await expect(processBtn).toBeDisabled();

    // Restore DPI
    await page.getByTestId("dpi-input").fill("300");
    await expect(page.getByText("Resolution must be between 1 and 1,200 DPI.")).not.toBeVisible();
    await expect(processBtn).toBeEnabled();
  });
});
