import { test, expect, type Page, type Locator } from "@playwright/test";
import path from "path";
import { gotoApp } from "./helpers";

const here = import.meta.dirname;
const photo = path.resolve(here, "fixtures/photo.jpg");

/**
 * Theme toggle spec — contracts implemented by the theme feature:
 * - <html> carries data-theme="dark" | "light"
 * - localStorage key "shrinkit-theme" with values "light" | "dark"
 *   (no stored value = follow the OS; "system" is not a UI option)
 * - toggle = custom dropdown [data-dropdown="theme"] (desktop in header
 *   + one inside the mobile menu); options are [data-theme-option]
 * Screenshots are for human review only — no pixel baselines.
 */

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`unparseable color: ${color}`);
  const [r, g, b] = m[1]
    .split(",")
    .slice(0, 3)
    .map((v) => Number(v.trim()));
  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio between two computed colors (e.g. "rgb(18, 18, 20)"). */
function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(parseRgb(fg));
  const l2 = luminance(parseRgb(bg));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

async function getTheme(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.documentElement.dataset.theme);
}

/** Body text color + effective page background (body, falling back to <html>). */
async function bodyColors(page: Page): Promise<{ fg: string; bg: string }> {
  return page.evaluate(() => {
    const body = document.body;
    const bcs = getComputedStyle(body);
    let bg = bcs.backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      bg = getComputedStyle(document.documentElement).backgroundColor;
    }
    return { fg: bcs.color, bg };
  });
}

/**
 * Wait until the 150ms theme transition has settled — computed colors read
 * mid-transition would catch intermediate values, not the theme's real tokens.
 */
async function awaitThemeSettled(page: Page, expectedBg: string): Promise<void> {
  await page.waitForFunction(
    (expected) => getComputedStyle(document.body).backgroundColor === expected,
    expectedBg,
    { timeout: 5_000 },
  );
}

/**
 * Drive the real custom theme dropdown: open it and pick the option.
 * `prefix` selects the desktop header dropdown or the mobile-menu one.
 * The hidden native <select data-testid="theme-select"> is off-screen /
 * zero-size, so Playwright cannot selectOption() it — click the real UI.
 */
async function selectTheme(
  page: Page,
  theme: "light" | "dark",
  prefix: "desktop" | "mobile" = "desktop",
): Promise<void> {
  const dropdown = page.locator(`[data-dropdown="theme"][data-prefix="${prefix}"]`);
  await dropdown.locator(".dropdown-trigger").click();
  await dropdown.locator(`[data-theme-option="${theme}"]`).click();
}

/** Element text color + nearest opaque ancestor background. */
async function computedPair(locator: Locator): Promise<{ fg: string; bg: string }> {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    let bg = cs.backgroundColor;
    let node: Element | null = el;
    while ((bg === "rgba(0, 0, 0, 0)" || bg === "transparent") && node.parentElement) {
      node = node.parentElement;
      bg = getComputedStyle(node).backgroundColor;
    }
    return { fg: cs.color, bg };
  });
}

async function upload(page: Page) {
  await page.getByTestId("file-input").setInputFiles(photo);
  await expect(page.getByTestId("process-button")).toBeEnabled({ timeout: 20_000 });
}

test("1. toggle light → dark applies dark tokens", async ({ page }) => {
  await gotoApp(page, "/");
  await selectTheme(page, "dark");
  await expect.poll(() => getTheme(page)).toBe("dark");
  await awaitThemeSettled(page, "rgb(18, 18, 20)");

  const { fg, bg } = await bodyColors(page);
  expect(bg).toBe("rgb(18, 18, 20)"); // #121214
  expect(fg).toBe("rgb(209, 209, 214)"); // #d1d1d6 — body text uses --t-ink-2 by design

  // Settings panel surface — upload to reveal the panel.
  // NOTE: the panel container deliberately blends into the page in dark mode
  // (like the light theme), so the first non-transparent ancestor is the
  // page background, not a surface box.
  await upload(page);
  const panelBg = await page
    .getByText("Choose new size and format")
    .first()
    .evaluate((el) => {
      let node: Element | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        node = node.parentElement;
      }
      return "transparent";
    });
  expect(panelBg).toBe("rgb(18, 18, 20)"); // #121214 — page bg, container blends in
});

test("2. toggle dark → light restores light tokens", async ({ page }) => {
  await gotoApp(page, "/");
  await selectTheme(page, "dark");
  await expect.poll(() => getTheme(page)).toBe("dark");
  await selectTheme(page, "light");
  await expect.poll(() => getTheme(page)).toBe("light");
  await awaitThemeSettled(page, "rgb(255, 255, 255)");

  const { fg, bg } = await bodyColors(page);
  expect(bg).toBe("rgb(255, 255, 255)");
  // Body text must be dark: AA contrast against the white background.
  expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
});

test("3. theme persists across reload", async ({ page }) => {
  await gotoApp(page, "/");
  await selectTheme(page, "dark");
  await expect.poll(() => getTheme(page)).toBe("dark");

  await page.reload();
  await expect.poll(() => getTheme(page)).toBe("dark");
  const stored = await page.evaluate(() => localStorage.getItem("shrinkit-theme"));
  expect(stored).toBe("dark");
});

test("4. theme persists across locale change", async ({ page }) => {
  await gotoApp(page, "/");
  await selectTheme(page, "dark");
  await expect.poll(() => getTheme(page)).toBe("dark");

  await gotoApp(page, "/es/");
  await expect.poll(() => getTheme(page)).toBe("dark");
});

test.describe("5. system mode follows the OS setting", () => {
  test.use({ colorScheme: "dark" });

  test("system resolves dark on a dark OS", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("shrinkit-theme"));
    await gotoApp(page, "/");
    // No stored preference: the page follows the OS (system is not a UI option).
    await expect.poll(() => getTheme(page)).toBe("dark");
  });
});

test.describe("5b. system mode follows the OS setting (light OS)", () => {
  test.use({ colorScheme: "light" });

  test("system resolves light on a light OS", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("shrinkit-theme"));
    await gotoApp(page, "/");
    // No stored preference: the page follows the OS (system is not a UI option).
    await expect.poll(() => getTheme(page)).toBe("light");
  });
});

test("6a. stored light preference overrides a dark OS", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("shrinkit-theme", "light"));
  await gotoApp(page, "/");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => getTheme(page)).toBe("light");
});

test("6b. stored dark preference overrides a light OS", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("shrinkit-theme", "dark"));
  await gotoApp(page, "/");
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => getTheme(page)).toBe("dark");
});

test("7. no FOUC: stored dark applies before hydration", async ({ page }) => {
  // Record, via an observer installed before parsing, how many islands were
  // already hydrated at the exact moment the theme was first applied.
  await page.addInitScript(() => {
    localStorage.setItem("shrinkit-theme", "dark");
    const w = window as unknown as { __hydratedAtThemeSet: number | null };
    w.__hydratedAtThemeSet = null;
    const obs = new MutationObserver(() => {
      if (document.documentElement.dataset.theme === "dark" && w.__hydratedAtThemeSet === null) {
        w.__hydratedAtThemeSet = document.querySelectorAll("astro-island:not([ssr])").length;
        obs.disconnect();
      }
    });
    // Observe `document` (not documentElement): at init-script time
    // documentElement may still be null, which would throw on observe().
    obs.observe(document, { attributes: true, subtree: true, attributeFilter: ["data-theme"] });
  });
  await page.goto("/", { waitUntil: "commit" });
  // The inline <head> script must have applied the theme already.
  await expect.poll(() => getTheme(page), { timeout: 5_000 }).toBe("dark");
  // Zero islands were hydrated when the theme was set (body not even parsed
  // yet at that point) — i.e. the theme was applied before hydration.
  const hydratedAtThemeSet = await page.evaluate(
    () => (window as unknown as { __hydratedAtThemeSet: number | null }).__hydratedAtThemeSet,
  );
  expect(hydratedAtThemeSet).toBe(0);
  // An inline <head> script exists (the theme bootstrap).
  expect(await page.locator("head script").count()).toBeGreaterThan(0);
});

test("8. contrast spot-checks meet WCAG AA in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await gotoApp(page, "/");
    await selectTheme(page, theme);
    await expect.poll(() => getTheme(page)).toBe(theme);
    await awaitThemeSettled(page, theme === "dark" ? "rgb(18, 18, 20)" : "rgb(255, 255, 255)");
    await upload(page);

    const body = await bodyColors(page);
    expect(contrastRatio(body.fg, body.bg), `${theme} body`).toBeGreaterThanOrEqual(4.5);

    // Muted text: footer tagline, read against its own background.
    const muted = await computedPair(page.getByText(/Shrink images right in your browser/));
    expect(contrastRatio(muted.fg, muted.bg), `${theme} muted`).toBeGreaterThanOrEqual(4.5);

    // Input text on input background.
    const input = await computedPair(page.getByTestId("width-input"));
    expect(contrastRatio(input.fg, input.bg), `${theme} input`).toBeGreaterThanOrEqual(4.5);

    // Button text on button background (#0071e3 in dark → white ≈ 4.7:1).
    const button = await computedPair(page.getByTestId("process-button"));
    expect(contrastRatio(button.fg, button.bg), `${theme} button`).toBeGreaterThanOrEqual(4.5);
  }
});

test("9. info illustrations use the dark variant in dark mode", async ({ page }) => {
  // NOTE: the info illustrations moved from the landing to /guide
  // (landing cleanup) — select them there.
  await page.goto("/guide");
  await page.waitForLoadState("networkidle");
  await selectTheme(page, "dark");
  await expect.poll(() => getTheme(page)).toBe("dark");

  // Select illustrations by their own marker, not by any anchor id.
  const imgs = page.locator("[data-illustration]");
  await imgs.first().scrollIntoViewIfNeeded();
  expect(await imgs.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await imgs.count()); i++) {
    const img = imgs.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    expect(src, `illustration ${i} src`).toContain("-dark.svg");
    await expect
      .poll(async () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
});

test.describe("10. theme screenshots (desktop, human review)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("light desktop full-page", async ({ page }) => {
    await gotoApp(page, "/");
    await selectTheme(page, "light");
    await expect.poll(() => getTheme(page)).toBe("light");
    await page.screenshot({ path: "/tmp/qa-shots/theme-light-desktop.png", fullPage: true });
  });

  test("dark desktop full-page", async ({ page }) => {
    await gotoApp(page, "/");
    await selectTheme(page, "dark");
    await expect.poll(() => getTheme(page)).toBe("dark");
    await page.screenshot({ path: "/tmp/qa-shots/theme-dark-desktop.png", fullPage: true });
  });
});

test.describe("10b. theme screenshots (mobile, human review)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("dark mobile full-page", async ({ page }) => {
    await gotoApp(page, "/");
    // At 390px the desktop select is hidden — use the one inside the menu.
    await page.locator("#nav-open").click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await selectTheme(page, "dark", "mobile");
    await expect.poll(() => getTheme(page)).toBe("dark");
    await page.locator("#nav-close").click();
    await expect(menu).toBeHidden();
    await page.screenshot({ path: "/tmp/qa-shots/theme-dark-mobile.png", fullPage: true });
  });
});

test.describe("11. mobile menu theme toggle", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("switching theme inside the menu does not close the menu", async ({ page }) => {
    await gotoApp(page, "/");
    await page.locator("#nav-open").click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await selectTheme(page, "dark", "mobile");
    await expect.poll(() => getTheme(page)).toBe("dark");
    await expect(menu).toBeVisible();
  });
});

test.describe("12. mobile menu dropdowns open upward, fully visible", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("language + theme menus are not clipped by the drawer", async ({ page }) => {
    await gotoApp(page, "/");
    await page.locator("#nav-open").click();
    const drawer = page.locator("#mobile-menu");
    await expect(drawer).toBeVisible();
    const vp = page.viewportSize()!;

    for (const name of ["language", "theme"]) {
      const btn = drawer.locator(
        `[data-dropdown="${name}"][data-prefix="mobile"] .dropdown-trigger`,
      );
      const menu = drawer.locator(`[data-dropdown="${name}"][data-prefix="mobile"] .dropdown-menu`);
      await btn.click();
      await expect(menu).toBeVisible();
      const btnBox = (await btn.boundingBox())!;
      const menuBox = (await menu.boundingBox())!;
      // Opens upward: the menu's bottom edge sits above the button's top edge.
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(btnBox.y + 8);
      // Fully inside the viewport — not clipped by the drawer's scroll container.
      expect(menuBox.x).toBeGreaterThanOrEqual(0);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(vp.width);
      expect(menuBox.y).toBeGreaterThanOrEqual(0);
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(vp.height);
      // The opened menu must not block the other dropdown's trigger.
      await btn.click(); // close
      await expect(menu).toBeHidden();
    }
  });
});
