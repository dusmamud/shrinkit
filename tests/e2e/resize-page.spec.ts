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
