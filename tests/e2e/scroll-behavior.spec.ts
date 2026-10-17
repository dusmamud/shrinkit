import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";
import path from "node:path";

const photo = path.resolve("tests/e2e/fixtures/photo.jpg"); // 1920×1080

test("html scroll-behavior is smooth by default, auto under reduced motion", async ({ page }) => {
  await gotoApp(page, "/");
  const behavior = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behavior).toBe("smooth");
});

test("html scroll-behavior is auto when reduced motion is preferred", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoApp(page, "/");
  const behavior = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behavior).toBe("auto");
});

test("'How it works' lands on the real steps section", async ({ page }) => {
  await gotoApp(page, "/");
  await page.locator('header a[href="/#how-it-works"]').click();
  await expect(page.locator("#how-it-works")).toContainText("How to Resize & Optimize in Seconds");
  await expect(page.locator("#how-it-works")).not.toHaveClass(/home-info-container/);
});

test("no forced scroll when the result is already fully visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 2000 });
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  const before = await page.evaluate(() => window.scrollY);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel.getByRole("button", { name: "Download image" }).first()).toBeVisible();
  await page.waitForTimeout(500); // let the delayed auto-scroll fire if it would
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
});

test("scrolls to the result when it is off-screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await gotoApp(page, "/");
  await page.getByTestId("file-input").setInputFiles(photo);
  const before = await page.evaluate(() => window.scrollY);
  await page.getByTestId("process-button").click();
  const panel = page.getByTestId("result-panel");
  await expect(panel.getByRole("button", { name: "Download image" }).first()).toBeVisible();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeGreaterThan(before + 50);
});
