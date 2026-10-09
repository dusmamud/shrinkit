import { expect, type Page } from "@playwright/test";

/**
 * Load the app and wait until the React island is hydrated.
 * The dropzone is SSR-rendered, so it becomes "visible" before React
 * attaches its listeners — uploading earlier silently drops the files.
 */
export async function gotoApp(page: Page, url = "/") {
  await page.goto(url);
  await expect(page.getByTestId("dropzone")).toBeVisible();
  await page.waitForSelector("astro-island:not([ssr])", { timeout: 30_000 });
}
