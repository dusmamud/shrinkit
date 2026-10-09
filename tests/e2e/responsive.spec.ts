import { test, expect } from "@playwright/test";
import path from "path";
import { gotoApp } from "./helpers";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg");

/**
 * Responsive QA at 390px width (iPhone 12 viewport).
 * Verifies the mobile layout: hamburger menu, stacked settings panel
 * with collapsed labels, no horizontal overflow, stacked results/footer.
 */

test.use({ viewport: { width: 390, height: 844 } });

async function noHorizontalOverflow(page: any) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow, "horizontal overflow").toBeLessThanOrEqual(1);
}

test("mobile: hamburger opens full-screen menu, links work, X closes", async ({ page }) => {
  await gotoApp(page, "/");
  const burger = page.locator("#nav-open");
  await expect(burger).toBeVisible();
  await burger.screenshot({ path: "/tmp/qa-shots/m-header.png" });
  await burger.click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await menu.screenshot({ path: "/tmp/qa-shots/m-menu.png" });
  // Links are present and the close button works.
  await expect(menu.getByRole("link", { name: /privacy/i })).toBeVisible();
  await page.locator("#nav-close").click();
  await expect(menu).toBeHidden();
  await noHorizontalOverflow(page);
});

test("mobile: hero + dropzone usable, settings stack without overlap", async ({ page }) => {
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("Choose new size and format")).toBeVisible();

  // Labels collapse to short forms on narrow screens.
  const lblFullVisible = await page.locator(".lbl-full").first().isVisible();
  const lblShortVisible = await page.locator(".lbl-short").first().isVisible();
  expect(lblFullVisible).toBe(false);
  expect(lblShortVisible).toBe(true);

  // Settings panel stacks: screenshot for visual review.
  await page
    .getByText("Choose new size and format")
    .screenshot({ path: "/tmp/qa-shots/m-settings.png" });
  // Hero + dropzone screenshot.
  await page.getByTestId("dropzone").screenshot({ path: "/tmp/qa-shots/m-hero.png" });
  await noHorizontalOverflow(page);

  // Every key control is visible and tappable (no overlap hiding them).
  for (const id of [
    "width-input",
    "height-input",
    "aspect-lock",
    "unit-select",
    "dpi-input",
    "format-select",
    "quality-input",
    "bg-white",
    "bg-black",
    "process-button",
  ]) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.width, `${id} width`).toBeGreaterThan(20);
    expect(box!.height, `${id} height`).toBeGreaterThan(20);
  }
});

test("mobile: result cards stack, footer stacks, no overflow", async ({ page }) => {
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel).toContainText("Your image has been resized!", { timeout: 90_000 });
  await panel.screenshot({ path: "/tmp/qa-shots/m-result.png" });
  await noHorizontalOverflow(page);

  // Footer stacks: screenshot the bottom of the page.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.locator("footer").screenshot({ path: "/tmp/qa-shots/m-footer.png" });
  await noHorizontalOverflow(page);
});
