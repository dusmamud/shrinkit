import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";

test("/how-it-works page loads with the 3 steps (EN)", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.locator("#how-it-works-heading")).toHaveText(
    "How to Resize & Optimize in Seconds",
  );
  await expect(page.getByText("Add Your Images")).toBeVisible();
  await expect(page.getByText("Tune Dimensions & Format")).toBeVisible();
  await expect(page.getByText("Instant Local Download")).toBeVisible();
  // Page CTA goes to the dedicated /resize page.
  await expect(page.getByRole("link", { name: /Upload & Resize Images/ })).toHaveAttribute(
    "href",
    "/resize",
  );
});

test("/es/how-it-works and /pt/how-it-works are localized", async ({ page }) => {
  await page.goto("/es/how-it-works");
  await expect(page.locator("#how-it-works-heading")).toHaveText(
    "Cómo redimensionar y optimizar en segundos",
  );
  await expect(page.getByRole("link", { name: /Subir y Redimensionar/ })).toHaveAttribute(
    "href",
    "/es/resize",
  );
  await page.goto("/pt/how-it-works");
  await expect(page.locator("#how-it-works-heading")).toHaveText(
    "Como redimensionar e otimizar em segundos",
  );
});

test("header + footer How it works links go to /how-it-works", async ({ page }) => {
  await gotoApp(page, "/");
  await expect(
    page.locator('header nav[aria-label="Primary"] a', { hasText: "How it works" }),
  ).toHaveAttribute("href", "/how-it-works");
  await expect(page.locator("footer a", { hasText: "How it works" })).toHaveAttribute(
    "href",
    "/how-it-works",
  );
  await gotoApp(page, "/es");
  await expect(page.locator("footer a", { hasText: "Cómo funciona" })).toHaveAttribute(
    "href",
    "/es/how-it-works",
  );
});

test("all Resize buttons point at the dedicated /resize page", async ({ page }) => {
  await gotoApp(page, "/");
  // Header desktop CTA.
  await expect(page.locator("header a", { hasText: "Resize an Image" }).first()).toHaveAttribute(
    "href",
    "/resize",
  );
  // Footer Product column.
  await expect(page.locator("footer a", { hasText: "Resize an Image" })).toHaveAttribute(
    "href",
    "/resize",
  );
  // Landing bottom CTA.
  await expect(page.getByRole("link", { name: /Upload & Resize Images/ })).toHaveAttribute(
    "href",
    "/resize",
  );
  // Mobile menu CTA.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#nav-open").click();
  await expect(page.locator("#mobile-menu a", { hasText: "Resize an Image" })).toHaveAttribute(
    "href",
    "/resize",
  );
});

test("theme is a toggle button, not a dropdown", async ({ page }) => {
  await gotoApp(page, "/");
  await expect(page.locator("[data-theme-toggle]").first()).toBeVisible();
  await expect(page.locator('[data-dropdown="theme"]')).toHaveCount(0);
  // Toggle flips the theme.
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator("[data-theme-toggle]").first().click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe(before === "dark" ? "light" : "dark");
});
