# VERIFICATION_REPORT.md — ShrinkIt

What was actually verified, and what was not. No claims beyond what the
evidence supports.

## 2026-10-09 — Frontend rebuild for reference parity (commit on push)

The whole frontend was rebuilt to mirror the reference site's layout,
structure and flow (Poppins, blue #007bff buttons, dashed dropzone,
"Choose new size and format" panel, info bands, blue copyright bar),
with original branding/copy — no logo, illustration or paragraph was
copied. The image engine (`src/lib/image/`) was NOT rewritten: pica
worker, DPI injection, EXIF and unit conversions are untouched; the new
UI calls the existing `processImageBytes` via the existing worker API.

Engine extension (additive only): `ProcessSettings.mode?: "stretch" |
"crop" | "fit"` (default `"stretch"` = byte-identical old path) plus
pure `cropRect()` / `fitDims()` math in `units.ts`. Crop center-crops
the source to the target aspect before resizing; fit resizes inside the
box and letterboxes with the background colour (transparent for
PNG/WebP).

### Static quality gates — PASS

| Gate             | Command                  | Result                                       |
| ---------------- | ------------------------ | -------------------------------------------- |
| TypeScript       | `npx tsc --noEmit`       | clean, 0 errors                              |
| ESLint           | `npx eslint .`           | clean, 0 errors / 0 warnings                 |
| Prettier         | `npx prettier --check .` | all files conform                            |
| Production build | `npm run build`          | success — 13 static pages, sitemap generated |
| Unit tests       | `npx vitest run`         | **50/50 pass** (38 old + 12 new crop/fit)    |

### E2E (headless Chromium) — PASS, 6/6

`npx playwright test` — **6 passed**, exercising the real pipeline end
to end with zero mocks:

1. Single image 50% + quality 60 → 960×540 JPEG downloads; EXIF DPI
   present; thumbnail strip shows probed 1920×1080 dims; aspect lock
   keeps height in sync when width is edited.
2. JPG → PNG conversion (quality control correctly hidden for PNG);
   PNG signature + pHYs chunk verified.
3. Batch: two images → "Resize All Images" → per-card downloads +
   "Download all images" ZIP (PK signature).
4. Aspect lock off + unequal dims → stretch/crop/fit row slides open;
   crop selected → 800×450 output downloads.
5. Fit mode → PNG: corner pixel of the 500×400 output is transparent
   (alpha 0), proving real letterboxing.
6. Unsupported file → red banner with clear message, no silent failure.

Two test bugs were found and fixed during this pass (both in the spec,
not the app): mode buttons stay in the DOM for the slide animation
(assert `aria-hidden`, not count), and 800 "percent" is 15360 px — the
app correctly refused it as too large until the spec selected pixels.

### Visual self-check — screenshots reviewed and iterated

Playwright screenshots (desktop 1440px + mobile 390px) of hero,
dropzone, thumbnail strip, settings panel, mode row, result panel,
info bands, footer and mobile menu were captured from `npm run dev`
(:7860, HTTP 200 verified) and read back as images. Findings fixed:
"−74.6% saved" was ambiguous → now "74.6% saved" / "+x% larger".
Confirmed visually: header (logo, divider-separated nav, blue CTA),
hero, dashed dropzone, 140px thumbnail cards, settings rows, teal
underline on the selected resize mode, result rows/cards, blue
copyright bar, mobile hamburger → full-screen menu.

## Environment

- Sandbox: Linux VM, Node v24.20.0, npm 10.9.4
- No display, no GPU. All browser verification used headless Chromium
  (Playwright `chromium-headless-shell`).
- Repo: `~/workspace/shrinkit/`, commit to be recorded on push.

## Static quality gates — PASS

| Gate             | Command                  | Result                                       |
| ---------------- | ------------------------ | -------------------------------------------- |
| TypeScript       | `npx tsc --noEmit`       | clean, 0 errors                              |
| ESLint           | `npx eslint .`           | clean, 0 errors / 0 warnings                 |
| Prettier         | `npx prettier --check .` | all files conform                            |
| Production build | `npm run build`          | success — 13 static pages, sitemap generated |
| Unit tests       | `npx vitest run`         | **38/38 pass**                               |

Unit tests cover: percent/pixel/cm/inch conversions incl. error cases
(`tests/unit/units.test.ts`), filename logic incl. degenerate names
(`filenames.test.ts`), canvas-memory safety guards (`limits.test.ts`),
CRC-32, PNG `pHYs` insertion/replacement/idempotency, JPEG EXIF DPI
injection incl. fractional-DPI rounding, and EXIF preserve-with-orientation-reset
(`dpi.test.ts`).

## E2E (headless Chromium) — PASS, 4/4

`npx playwright test` — **4 passed** in ~7s, exercising the real pipeline
end to end with zero mocks:

1. **Single image**: uploaded 1920×1080 JPEG → set 50% + quality 60 →
   processed in the Web Worker (pica resize) → card showed `960×540` and
   original dimensions → downloaded `.jpg` smaller than the original, and the
   file bytes contain a real EXIF APP1 segment (DPI written honestly).
2. **Format conversion**: 640×480 JPG → PNG → downloaded as `small.png`
   (basename kept, extension swapped); output has a valid PNG signature and
   a `pHYs` DPI chunk.
3. **Batch mode**: two images processed with one click → "Download all as
   ZIP" produced a valid `shrinkit-images.zip` (PK signature, real size).
4. **Unsupported file**: uploading a `.txt` shows a clear localized error
   alert instead of failing silently.

A real bug was caught and fixed by these tests: pica's default canvas
factory uses `document.createElement`, which does not exist in a Web
Worker — every worker resize failed with a misleading "fingerprinting
protection" error. Fixed by passing an `OffscreenCanvas`-based
`createCanvas` factory to pica (`createResizer()` in `engine.ts`).

## Manually verified in build output (`dist/`)

- `processor.worker-*.js` chunk emitted (Web Worker bundles correctly).
- `<html lang="es">` / `<html lang="pt">` pages render translated
  `<title>` and content; `hreflang` alternates + `x-default` present.
- `sw.js`, `manifest.webmanifest`, icons, `robots.txt`, `sitemap-index.xml`
  all present in `dist/`.

## NOT verifiable in this sandbox (needs a real machine/browser)

- Interactive visual/feel review: static screenshots (1440px + 390px)
  were captured and inspected, but layout polish, dark-mode-free
  rendering quirks, and responsive breakpoints should be eyeballed on a
  real device before launch.
- 60 fps / jank-free processing feel, and worker behaviour on Safari/Firefox
  (only headless Chromium was exercised).
- PWA install prompt and true offline reload (service worker is
  cache-first and straightforward, but install UX is OS/browser specific).
- Real phone photo with EXIF orientation 6 (sandbox has no camera roll);
  the orientation path is unit-tested at the transform level and uses the
  standard `imageOrientation: "from-image"` API.
- Cloudflare Pages deployment itself (no credentials in sandbox).

## Known honest limitations (also documented in README)

- WebP/GIF outputs carry no DPI metadata — there is no standard container;
  the app does not pretend otherwise.
- Images over the safety thresholds in `src/lib/image/limits.ts` are
  refused with a clear error instead of crashing the tab.
- `CONTACT_EMAIL` in the contact pages and `site` in `astro.config.mjs`
  are placeholders — set them before publishing.

## 2026-10-09 — Full QA pass: "Choose new size and format" + responsive + result display

Fourteen checklist items tested one-by-one in headless Chromium (Playwright),
each screenshot-verified. Issues found and fixed below; everything re-verified
after each fix.

### Issues found → fix applied → verification

1. **Mobile (390px): Width/Height row overlapped.** The size row used
   `flex-wrap`; on narrow screens the Height input wrapped under its label and
   collided with the aspect-lock button and unit dropdown (screenshot showed
   the "70" input overlapping the lock + Percent select). Fix:
   `SettingsPanel.tsx` groups each label+input in a nowrap flex wrapper;
   `global.css` adds a ≤576px grid layout (`W [70] H [70] [lock]` on row 1,
   unit dropdown full-width on row 2; labels collapse to W/H/Res). Verified:
   bounding boxes show zero overlap; screenshot confirms tidy stacking.
2. **Mobile: resize-mode buttons (Stretch/Crop/Fit) overflowed 53px.**
   Three `w-28` buttons exceeded the 390px viewport. Fix: buttons are
   `w-24` below the `sm` breakpoint (`sm:w-28` on desktop). Verified: all
   three fit, 0px horizontal overflow.
3. **Phantom horizontal overflow from hidden tooltips.** Every `[data-tip]`
   tooltip renders an always-present `::after` pseudo-element (opacity 0).
   Absolutely-positioned centered tooltips contribute to `scrollWidth` even
   when invisible — the 50px aspect-lock button reported scrollWidth 134px,
   pushing `documentElement.scrollWidth` to 443px on mobile. Fix: tooltip
   `::after` is now `display: none` when idle and `display: block` on
   hover/focus-visible, with `transition-behavior: allow-discrete` so the
   fade still animates. Verified: resting `scrollWidth - clientWidth = 0`;
   tooltip still appears on hover (computed `display: block, opacity: 1`).
4. **Missing tooltips (minor).** DPI input, format select and Quality had no
   tooltip while every other control did (Quality had none at all). Added
   `data-tip` wrappers + new `settings.quality_tip` key in en/es/pt
   (paraglide recompiled). Verified in tests.
5. **Invalid React DOM props.** `stroke-width` / `stroke-linecap` /
   `stroke-linejoin` on an SVG in `Dropzone.tsx` (console warnings). Fixed to
   camelCase props.

### Verified working (no fix needed)

- Aspect lock ON: Width=50 → Height auto 50 (proportional); OFF: 800×450
  independent; lock icon swaps closed/open.
- Units: 50% of 1920×1080 → 960×540; pixels/cm/inches exact incl. DPI math.
- Mode row hidden while locked; slides open only when unlocked AND aspect
  differs; Stretch exact W×H, Crop exact W×H center-cropped, Fit letterboxes
  with chosen bg (pixel-verified) / transparency for PNG.
- JPG/PNG/GIF/WebP all produce valid signatures + extensions; Quality input
  hidden for PNG/GIF (forced 100), visible for JPG/WebP; quality 20 vs 90
  differs substantially in bytes.
- Bg swatch 3px #016df0 ring; transparent PNG → JPG uses chosen bg
  (corner pixel verified).
- Button label "Resize Image" (1 file) / "Resize All Images" (batch).
- Result panel: filename, dimensions, size, unambiguous "x% saved" /
  "+x% larger"; single row layout; batch card grid + ZIP downloads a valid
  zip; downloads verified byte-identical.
- .txt upload → red #d33 localized banner; oversized image refused cleanly.
- /es/ + /pt/ fully translated (no raw keys).
- EXIF checkbox toggles; drag-over highlights; input accepts multiple.
- Responsive: hamburger → full-screen menu (links work, X closes); result
  cards + footer stack; 0px horizontal overflow at 390px.

### Test-environment notes (not app bugs)

- Dev server on :7860 once served pages where React handlers never fired;
  root cause was a corrupted Vite optimizer cache — cleared
  `node_modules/.vite` + `.astro`, restarted, uploads work. Production
  `astro build` output was never affected.
- A test that wrote fixture files into the project tree mid-run triggered
  Vite's file watcher → full page reload → React state wiped → upload lost.
  Fixed by committing permanent fixtures (`transparent.png`, `huge.jpg`,
  `note.txt`) and writing downloads to /tmp. Not an app bug.
- `tests/e2e/helpers.ts` `gotoApp()` waits for React hydration before
  `setInputFiles` — fixes a real race where uploading onto SSR markup
  silently drops files.

### Static quality gates — PASS (2026-10-09 ~06:40 IST)

| Gate             | Command                  | Result                        |
| ---------------- | ------------------------ | ----------------------------- |
| TypeScript       | `npx tsc --noEmit`       | clean, 0 errors               |
| ESLint           | `npx eslint .`           | 0 errors, 5 `any` warnings in tests/e2e (pre-existing pattern) |
| Prettier         | `npx prettier --check .` | all files conform             |
| Unit tests       | `npx vitest run`         | 50/50 passed                  |
| E2E (Playwright) | `npx playwright test`    | 23/23 passed (qa 14, responsive 3, shrink 6) |
| Production build | `npm run build`          | success — 13 pages, sitemap   |

### Not verifiable in this sandbox

Visual design review on a real display/GPU, Safari/Firefox, real-phone EXIF
photos, Cloudflare Pages deploy — need the maintainer's machine/browser.
