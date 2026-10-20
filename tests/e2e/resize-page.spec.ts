import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";

const year = new Date().getFullYear();

test("/resize shows the landing hero tool with a minimal footer", async ({ page }) => {
  await gotoApp(page, "/resize");
  await expect(page.locator("h1")).toHaveText("Resize an Image");
  await expect(page.getByTestId("dropzone")).toBeVisible();
  // Minimal footer: only the copyright line, no footer links at all.
  const footer = page.locator("footer");
  await expect(footer).toContainText(`© ${year} ShrinkIt. All rights reserved.`);
  await expect(footer.getByRole("link")).toHaveCount(0);
  // None of the landing sections below the tool.
  await expect(page.locator("#how-it-works")).toHaveCount(0);
});

test("/es/resize is the localized twin", async ({ page }) => {
  await gotoApp(page, "/es/resize");
  await expect(page.getByTestId("dropzone")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Todos los derechos reservados");
  await expect(page.locator("footer").getByRole("link")).toHaveCount(0);
});

test("/pt/resize is the localized twin", async ({ page }) => {
  await gotoApp(page, "/pt/resize");
  await expect(page.getByTestId("dropzone")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Todos os direitos reservados");
  await expect(page.locator("footer").getByRole("link")).toHaveCount(0);
});

test("landing hero and /resize hero match (shared component)", async ({ page }) => {
  await gotoApp(page, "/");
  const homeH1 = await page.locator("h1").innerText();
  await gotoApp(page, "/resize");
  await expect(page.locator("h1")).toHaveText(homeH1);
});

test("/resize footer is pinned to the viewport bottom on short pages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await gotoApp(page, "/resize");
  const box = await page.locator("footer").boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.y + box!.height - 1600)).toBeLessThanOrEqual(2);
});

test("header 'Resize an Image' button goes to /resize (desktop)", async ({ page }) => {
  await gotoApp(page, "/");
  await page.locator('header a[href="/resize/"]').click();
  await expect(page).toHaveURL(/\/resize\/?$/);
  await expect(page.locator("h1")).toHaveText("Resize an Image");
});

test("header 'Resize an Image' button goes to /resize (mobile menu)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, "/");
  await page.locator("#nav-open").click();
  await page.locator('#mobile-menu a[href="/resize/"]').click();
  await expect(page).toHaveURL(/\/resize\/?$/);
});

test("header button on /es goes to /es/resize", async ({ page }) => {
  await gotoApp(page, "/es/");
  await page.locator('header a[href="/es/resize/"]').click();
  await expect(page).toHaveURL(/\/es\/resize\/?$/);
});
