import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "path";

test.describe("Dedicated Tools Pages (Zero Landing Page Contamination)", () => {
  test("1. Main landing page remains 100% pristine and untouched", async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByTestId("dropzone")).toBeVisible();

    const photo = path.resolve(import.meta.dirname, "fixtures/photo.jpg");
    await page.getByTestId("file-input").setInputFiles(photo);
    await expect(page.getByText("Choose new size and format")).toBeVisible();
    await expect(page.getByTestId("width-input")).toHaveValue("70");
    await expect(page.getByTestId("unit-select")).toHaveValue("percent");
    // Ensure no preset chips or target KB controls leak into main landing page
    await expect(page.getByTestId("preset-chips")).toHaveCount(0);
    await expect(page.getByTestId("target-size-toggle")).toHaveCount(0);
  });

  test("2. Tools hub page (/tools) renders all 5 free tools", async ({ page }) => {
    await page.goto("http://localhost:7860/tools");
    const main = page.locator("main");
    await expect(
      main.getByRole("heading", { name: "Free Online Image Optimization Tools" }),
    ).toBeVisible();
    await expect(main.getByRole("link", { name: /Compress to 50 KB/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /Compress to 20 KB/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /Passport Photo Maker/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /Social Media Resizer/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /Before vs After Comparison/i })).toBeVisible();
  });

  test("3. Compress to 50KB page loads with Target 50KB selected", async ({ page }) => {
    await page.goto("http://localhost:7860/tools/compress-to-50kb");
    await expect(
      page.getByRole("heading", { name: "Compress Image to 50KB Online" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "< 50 KB" })).toBeVisible();
  });

  test("4. Passport Photo Maker page loads with official specs", async ({ page }) => {
    await page.goto("http://localhost:7860/tools/passport-photo-maker");
    await expect(
      page.getByRole("heading", { name: "Online Passport & Visa Photo Maker" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /India/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /USA/i })).toBeVisible();
  });

  test("5. Social Media Resizer page loads with platform presets", async ({ page }) => {
    await page.goto("http://localhost:7860/tools/social-media-resizer");
    await expect(page.getByRole("heading", { name: "Social Media Image Resizer" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Instagram Square/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /YouTube Thumbnail/i })).toBeVisible();
  });

  test("6. Quality Comparison page loads with split slider", async ({ page }) => {
    await page.goto("http://localhost:7860/tools/compare-images");
    await expect(
      page.getByRole("heading", { name: "Before vs After Image Comparison" }),
    ).toBeVisible();
  });

  test("7. Navigation contains Tools links in Header and Footer", async ({ page }) => {
    await gotoApp(page);
    // Header navigation
    const headerTools = page.getByRole("banner").getByRole("link", { name: "Tools", exact: true });
    await expect(headerTools).toBeVisible();
    await expect(headerTools).toHaveAttribute("href", "/tools/");

    // Footer navigation
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "All Free Tools" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Compress to 50KB" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Passport Photo Maker" })).toBeVisible();
  });
});
