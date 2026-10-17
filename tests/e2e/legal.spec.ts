import { test, expect } from "@playwright/test";
import { gotoApp } from "./helpers";

/**
 * Legal pages: detailed Privacy Policy + Terms & Conditions render in
 * EN and in ES/PT (English text + English-governs notice), and the
 * footer links to both without 404s.
 */

test("Privacy Policy page renders the full document", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  await expect(page.getByText("Last updated: 17 October 2026")).toBeVisible();
  // All 16 sections render, with working TOC anchors.
  await expect(page.locator("section[id]")).toHaveCount(16);
  await expect(page.locator("#what-stays-on-device")).toContainText("What stays on your device");
  await page.locator('nav[aria-label="Contents"] a[href="#cookies"]').click();
  await expect(page.locator("#cookies")).toBeInViewport();
});

test("Terms & Conditions page renders the full document", async ({ page }) => {
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms & Conditions", exact: true }),
  ).toBeVisible();
  await expect(page.locator("section[id]")).toHaveCount(16);
  await expect(page.locator("#governing-law")).toContainText("Governing law and disputes");
  await expect(page.locator("#governing-law")).toContainText("laws of India");
});

test("ES/PT legal pages show the English text with an English-governs notice", async ({ page }) => {
  for (const locale of ["es", "pt"]) {
    await page.goto(`/${locale}/privacy`);
    await expect(page.getByText("This document is provided in English.")).toBeVisible();
    await expect(page.locator("section[id]")).toHaveCount(16);
    await page.goto(`/${locale}/terms`);
    await expect(page.getByText("This document is provided in English.")).toBeVisible();
    await expect(page.locator("section[id]")).toHaveCount(16);
  }
});

test("Footer links to Privacy Policy and Terms & Conditions", async ({ page }) => {
  await gotoApp(page);
  await page.getByRole("link", { name: "Terms & Conditions" }).first().click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole("heading", { name: "Terms & Conditions", exact: true }),
  ).toBeVisible();
});
