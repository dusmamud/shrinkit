# ShrinkIt

Free, private, client-side image resizer & compressor. Shrink, compress and
convert JPG, PNG, GIF and WebP images **entirely in your browser** — no
sign-up, no uploads, no watermarks, batch processing included free.

Built with **Astro 7 + React 19 + TypeScript + Tailwind CSS v4**,
i18n via Paraglide (English / Español / Português), Phosphor icons, and
light/dark/system theming. Zero backend — the static output deploys to
**Cloudflare Pages** (free tier, no credit card).

## How the image engine works (no mocks — everything is real)

| Step         | Implementation                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decode       | `createImageBitmap(file, { imageOrientation: "from-image" })` so phone photos never come out rotated (manual EXIF-rotation fallback for old engines)                                                                                |
| Resize       | [`pica`](https://github.com/nodeca/pica) — worker-based, multi-step high-quality downscale (never naive single-step `drawImage`)                                                                                                    |
| Encode       | `canvas.toBlob` for JPEG (quality 0–100) / PNG / WebP; [`gifenc`](https://github.com/mattdesl/gifenc) for GIF                                                                                                                       |
| DPI          | Honestly written, because `canvas.toBlob` drops it: minimal EXIF APP1 (X/YResolution + unit) injected into JPEG via `piexifjs`; `pHYs` chunk written into PNG by hand (WebP/GIF have no standard DPI container — documented in-app) |
| Transparency | Flattened onto the user's White/Black background before encoding to formats without alpha                                                                                                                                           |
| Units        | percent → `v/100 × original`; pixels → direct; cm/inches → `v × DPI` (cm ÷ 2.54 first)                                                                                                                                              |
| Threading    | All heavy work runs in a dedicated Web Worker (`src/lib/image/processor.worker.ts`); identical main-thread fallback if Workers are unavailable                                                                                      |
| Privacy      | EXIF stripped by default; optional preserve path copies source EXIF with Orientation reset to 1                                                                                                                                     |

## Quick start

```bash
npm install
npm run dev        # local dev server → http://localhost:7860
```

Other commands:

```bash
npm run build      # paraglide compile + astro build → dist/
npm run preview    # serve the production build locally
npm test           # vitest unit tests (38 tests: units, DPI math, filenames, limits)
npm run test:e2e   # Playwright: real upload → resize → download in headless Chromium
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --check
npm run paraglide  # recompile i18n messages (runs automatically before build)
```

## Deploy to Cloudflare Pages (free)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect the repo.
3. Build settings: framework preset **Astro**, build command `npm run build`, output directory `dist`. No environment variables needed.
4. Deploy. Every push to `main` redeploys automatically.

Before going live, update two placeholders:

- `astro.config.mjs` → `site: "https://<your>.pages.dev"` (used for canonical URLs, hreflang and the sitemap).
- `src/pages/contact.astro` and `src/pages/[locale]/contact.astro` → `CONTACT_EMAIL` (currently a placeholder).

## Project structure

```
src/
  lib/
    i18n.ts                 # t(locale, key, inputs) — explicit-locale message helper
    locales.ts / locale.ts  # locale list + path helpers
    image/
      units.ts              # size-unit → pixel math (pure, tested)
      filenames.ts          # output naming, format maps, byte formatting (pure, tested)
      limits.ts             # canvas-memory safety guards (pure, tested)
      dpi.ts                # JPEG EXIF + PNG pHYs DPI injection (tested)
      engine.ts             # decode → resize → encode pipeline (browser APIs)
      processor.worker.ts   # Web Worker wrapper around the engine
      process.ts            # main-thread API (worker + fallback)
  components/
    react/                  # ShrinkItApp island, Dropzone, SettingsPanel, ResultCard
    *.astro                 # Header, Footer, Hero, HowItWorks, Features, Faq, …
  pages/                    # index, privacy, about, contact (+ /es, /pt variants)
  paraglide/                # generated (gitignored) — do not edit
messages/                   # en/es/pt source strings (Paraglide)
public/
  sw.js                     # offline service worker (cache-first, same-origin)
  manifest.webmanifest      # PWA manifest + icons
tests/
  unit/                     # vitest
  e2e/                      # Playwright (headless Chromium)
```

## Notes & limitations (honest)

- Output formats are JPG, PNG, WebP and GIF. WebP/GIF carry no DPI metadata (no standard container); the app says so instead of pretending.
- Very large images are refused with a clear error (canvas memory limits are real); see `src/lib/image/limits.ts` for the exact thresholds.
- Batch ZIPs are built with JSZip entirely in memory — extremely large batches are bounded by device RAM.
- See `VERIFICATION_REPORT.md` for exactly what was verified in CI/sandbox vs. what needs a real device.

## License

MIT — see [LICENSE](LICENSE).
