import { test, expect } from "@playwright/test";
import path from "path";
import { gotoApp } from "./helpers";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg");

const VIEWPORTS = [
  { name: "320px Ultra-Compact Mobile (iPhone SE 1st gen)", width: 320, height: 568 },
  { name: "375px Compact Mobile (iPhone 8 / SE2)", width: 375, height: 667 },
  { name: "390px Standard Mobile (iPhone 13/14)", width: 390, height: 844 },
  { name: "412px Modern Android (Pixel / Galaxy)", width: 412, height: 915 },
  { name: "768px Tablet Portrait (iPad Mini/Air)", width: 768, height: 1024 },
  { name: "1024px Tablet Landscape / Small Laptop", width: 1024, height: 768 },
  { name: "1366px Standard Laptop", width: 1366, height: 768 },
  { name: "1920px Full HD Desktop", width: 1920, height: 1080 },
  { name: "2560px Ultrawide / 2K Display", width: 2560, height: 1440 },
];

test.describe("Ultra-Responsive Design Across All Screen Dimensions", () => {
  for (const vp of VIEWPORTS) {
    test(`renders flawlessly with zero horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoApp(page, "/");

      // Verify no horizontal overflow on initial landing state
      const initialOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(initialOverflow).toBe(true);

      // Verify navigation: Mobile hamburger on < 1024px, Desktop nav on >= 1024px
      if (vp.width < 1024) {
        await expect(page.locator("#nav-open")).toBeVisible();
        await expect(page.locator("nav[aria-label='Primary']")).toBeHidden();
      } else {
        await expect(page.locator("#nav-open")).toBeHidden();
        await expect(page.locator("nav[aria-label='Primary']")).toBeVisible();
      }

      // Upload image
      await page.getByTestId("file-input").setInputFiles(photo);
      await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });

      // Verify zero horizontal overflow with SettingsPanel visible
      const settingsOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(settingsOverflow).toBe(true);

      // Verify essential interactive form controls are visible and fit inside the viewport
      await expect(page.getByTestId("width-input")).toBeVisible();
      await expect(page.getByTestId("height-input")).toBeVisible();
      await expect(page.getByTestId("unit-select")).toBeVisible();
      await expect(page.getByTestId("aspect-lock")).toBeVisible();
      await expect(page.getByTestId("format-select")).toBeVisible();
      await expect(page.getByTestId("quality-input")).toBeVisible();
      await expect(page.getByTestId("bg-white")).toBeVisible();
      await expect(page.getByTestId("bg-black")).toBeVisible();
      await expect(page.getByTestId("process-button")).toBeVisible();

      // Check bounding box of process button is within screen width
      const btnBox = await page.getByTestId("process-button").boundingBox();
      expect(btnBox).not.toBeNull();
      expect(btnBox!.x).toBeGreaterThanOrEqual(0);
      expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(vp.width + 2);

      // Process image to verify ResultPanel responsiveness
      await page.getByTestId("process-button").click();
      const panel = page.getByTestId("result-panel");
      await expect(panel).toContainText("Your image has been resized!", { timeout: 90_000 });

      // Verify zero horizontal overflow with ResultPanel active
      const resultOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(resultOverflow).toBe(true);
    });
  }

  test("touch target size complies with WCAG 2.5.8 AA on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoApp(page, "/");

    // Hamburger button touch target
    const navOpenBox = await page.locator("#nav-open").boundingBox();
    expect(navOpenBox!.width).toBeGreaterThanOrEqual(44);
    expect(navOpenBox!.height).toBeGreaterThanOrEqual(44);

    // Open mobile menu and check close button
    await page.locator("#nav-open").click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    const navCloseBox = await page.locator("#nav-close").boundingBox();
    expect(navCloseBox!.width).toBeGreaterThanOrEqual(44);
    expect(navCloseBox!.height).toBeGreaterThanOrEqual(44);
    await page.locator("#nav-close").click();

    // Upload image to inspect settings buttons
    await page.getByTestId("file-input").setInputFiles(photo);
    await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });

    // Submit button size on mobile
    const submitBtn = await page.getByTestId("process-button").boundingBox();
    expect(submitBtn!.height).toBeGreaterThanOrEqual(44);
  });

  test("mobile header shows only the hamburger; language + theme live inside the menu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page, "/");

    // Nothing but the hamburger visible in the mobile header bar
    // (the desktop copies of both controls exist in the DOM but are hidden).
    await expect(page.locator("#nav-open")).toBeVisible();
    await expect(page.locator("header").getByTestId("language-switcher")).toBeHidden();
    await expect(page.locator("header").getByTestId("theme-select")).toBeHidden();

    // Both controls appear inside the hamburger menu.
    await page.locator("#nav-open").click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("language-switcher")).toBeVisible();
    await expect(menu.getByTestId("theme-select")).toBeVisible();

    // Language switcher inside the menu actually navigates.
    await menu.getByTestId("language-switcher").selectOption({ index: 1 });
    await expect(page).toHaveURL(/\/es(\/|$)/);
  });
});
