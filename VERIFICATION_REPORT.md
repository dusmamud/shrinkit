# VERIFICATION_REPORT.md — ShrinkIt

What was actually verified, and what was not. No claims beyond what the
evidence supports.

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

- Visual design review (no display): layout, dark mode, responsive
  breakpoints — inspect on a real device before launch.
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
