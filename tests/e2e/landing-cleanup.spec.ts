import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "node:path";

test("landing has no trust strip and no FormatPresets or info carousel", async ({ page }) => {
  await gotoApp(page, "/");
  await expect(page.getByText("Popular Dimensions Ready to Use")).toHaveCount(0);
  await expect(page.locator("[data-format]")).toHaveCount(0);
  await expect(page.locator("#info-swiper-wrapper")).toHaveCount(0);
});

test("landing FAQ has 5 items (free/fees Q6 removed)", async ({ page }) => {
  await gotoApp(page, "/");
  const items = page.locator('section[aria-labelledby="faq-heading"] details');
  await expect(items).toHaveCount(5);
  await expect(page.getByText("Is ShrinkIt completely free?")).toHaveCount(0);
});

test("comparison table merged into the page-bg trust block", async ({ page }) => {
  await gotoApp(page, "/");
  await expect(page.locator('section[aria-labelledby="comparison-heading"]')).toHaveClass(
    /bg-tpage/,
  );
});

test("/guide renders the 2 info articles with illustrations", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.locator("h1")).toHaveText("Image Guide");
  await expect(page.getByText("What is an image file size?")).toBeVisible();
  await expect(page.getByText("How can I reduce my image's file size?")).toBeVisible();
  await expect(page.locator("[data-illustration]")).toHaveCount(2);
});

test("/es/guide and /pt/guide are localized", async ({ page }) => {
  await page.goto("/es/guide");
  await expect(page.locator("h1")).toHaveText("Guía de imágenes");
  await page.goto("/pt/guide");
  await expect(page.locator("h1")).toHaveText("Guia de imagens");
});

test("footer Guide link goes to /guide", async ({ page }) => {
  await gotoApp(page, "/");
  await page.locator('footer a[href="/guide"]').click();
  await expect(page).toHaveURL(/\/guide\/?$/);
  await expect(page.locator("h1")).toHaveText("Image Guide");
});

test("settings container blends into the page in both themes", async ({ page }) => {
  const photo = path.resolve("tests/e2e/fixtures/photo.jpg");

  await page.addInitScript(() => localStorage.setItem("shrinkit-theme", "dark"));
  await gotoApp(page, "/resize");
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.locator("#resize-form-offline")).toBeVisible();
  const darkBg = await page.evaluate(
    () => getComputedStyle(document.getElementById("resize-form-offline")!).backgroundColor,
  );
  expect(darkBg).toBe("rgba(0, 0, 0, 0)");

  await page.addInitScript(() => localStorage.setItem("shrinkit-theme", "light"));
  await gotoApp(page, "/resize");
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.locator("#resize-form-offline")).toBeVisible();
  const lightBg = await page.evaluate(
    () => getComputedStyle(document.getElementById("resize-form-offline")!).backgroundColor,
  );
  expect(lightBg).toBe("rgb(255, 255, 255)");
});
