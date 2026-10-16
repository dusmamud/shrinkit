# ShrinkIt Master Implementation Plan: Complete Feature, Landing Page & SEO Growth Blueprint

> **Architecture Core Invariant:** 
> - **Resize Engine:** Preserves [`pica`](https://github.com/nodeca/pica) (worker-based Lanczos3 downscaling, ~40KB bundle). Zero heavy external dependencies like `@imagemagick/magick-wasm` (15MB+ bloat).
> - **Encoding & Compression:** High-performance native HTML5 Canvas / OffscreenCanvas with binary search quality convergence.
> - **Visual Invariant:** Zero breaking changes to existing color grading, theme tokens (`--t-*`), hero layout, or core button designs. 100% responsive across 320px–4K.

---

## Architecture & System Overview

```mermaid
flowchart TD
    subgraph UI_Layer [Landing Page & UI Layer]
        A[Hero Section & Dropzone] --> B[Interactive Split Slider Before/After]
        C[Settings Panel] --> D[Dimensions & Aspect Crop Tool]
        C --> E[Target KB Mode vs Quality %]
        C --> F[Social & Passport Quick Presets]
        G[Landing Page Trust Matrix & FAQ]
    end

    subgraph SEO_Layer [Dedicated Programmatic Pages /tools/*]
        P1[/tools/resize-image-to-20kb]
        P2[/tools/resize-image-to-50kb]
        P3[/tools/resize-image-to-100kb]
        P4[/tools/passport-photo-maker]
        P5[/tools/social-media-resizer]
        P6[/tools/dpi-converter]
        P7[/tools/image-converter]
    end

    subgraph Engine_Layer [Core Client-Side Engine in Worker]
        W[Web Worker Pipeline] --> R[Pica Multi-Step Lanczos Resizer]
        R --> CR[Aspect Ratio Cropper Canvas]
        CR --> BS[Binary Search Target KB Encoder]
        BS --> EXIF[EXIF Stripper / Injector & DPI Injector]
    end

    UI_Layer --> Engine_Layer
    SEO_Layer --> Engine_Layer
```

---

## Phase 1: High-Intent Core Features & Engine Expansion

### 1.1 "Target File Size (KB)" Mode with Binary Search Compression
- **Objective:** Allow users to set an exact KB ceiling (e.g., `50 KB`, `20 KB`, `100 KB`). The engine automatically converges on the highest quality setting that stays strictly under the target (e.g. targeting 50KB outputs ~47–49.5KB, never drops to 20KB).
- **Engine Logic (`src/lib/image/engine.ts`):**
  - Add `targetSizeKb?: number` and `compressionMode: "quality" | "target-size"` to `ProcessSettings`.
  - In Web Worker: For JPEG & WebP, run binary search between `minQ = 0.05` and `maxQ = 0.98` (max 8 iterations, ~40ms execution time).
  - Converge to maximum quality where `blob.size <= targetBytes`.
  - Safety edge case: If dimensions are too massive for the target KB (e.g. 4000×3000px aiming for 20KB), provide an honest, helpful UI tip: *"Downsample dimensions (e.g. to 800px) to hit strict 20KB target cleanly."*
- **UI Integration (`src/components/react/SettingsPanel.tsx`):**
  - In existing Quality sector (`#sector_calidad`), add a segmented pill toggle: `[% Quality]` vs `[Target KB]`.
  - When `Target KB` is selected, display a numeric input with a `KB` badge matching existing input styling (`h-[50px]`, `rounded-[6px]`, `border-tinputline`).

### 1.2 One-Click Social Media & Official ID Presets
- **Objective:** Eliminate manual pixel calculations for common platforms and official exams.
- **Preset Categories:**
  - **Government & Exam Forms:**
    - India Passport / Exam Photo (35 × 45 mm / 413 × 531 px @ 300 DPI)
    - Signature Upload (200 × 230 px @ target 20KB)
    - US Visa / Passport (2 × 2 inches / 600 × 600 px @ 300 DPI)
  - **Social Media:**
    - Instagram Square (1080 × 1080, 1:1)
    - Instagram Story / Reel (1080 × 1920, 9:16)
    - Instagram Portrait (1080 × 1350, 4:5)
    - YouTube Thumbnail (1280 × 720, 16:9)
    - YouTube Banner (2560 × 1440)
    - Twitter / X Post (1200 × 675) & Header (1500 × 500)
    - LinkedIn Banner (1584 × 396) & Avatar (400 × 400)
- **UI Integration:**
  - Sleek, scrollable horizontal chip container right above the dimensions row. Clicking a chip auto-fills width, height, unit, DPI, and mode without modifying any existing form styling.

### 1.3 EXIF Metadata Stripper & Privacy Badge
- **Objective:** Protect user privacy by stripping camera model, GPS coordinates, and date/time metadata by default.
- **Implementation:**
  - Default `preserveExif = false` (strips metadata, saving 10–50KB per photo).
  - Explicit toggle in SettingsPanel: *"Strip GPS & camera metadata (Protects Privacy)"*.
  - Visual privacy pill in Result Card showing: *"🔒 Metadata removed — 0 GPS tags leaked"*.

---

## Phase 2: Interactive Visual Delight & Power Tools

### 2.1 Interactive "Before vs After" Split-Comparison Slider (Squoosh Style)
- **Objective:** Give users instant visual feedback that their compressed/resized image looks identical in quality to the original.
- **Component (`src/components/react/ComparisonSlider.tsx`):**
  - Side-by-side or overlaid canvas with a vertical drag handle.
  - Left side: Original uncompressed image with size badge (e.g. `4.2 MB`).
  - Right side: Resized/compressed image with size badge (e.g. `48.2 KB, -98%`).
  - Touch-friendly and mouse-friendly draggable divider.
  - Placed seamlessly inside the expanded Result Card for any processed image.

### 2.2 Client-Side Interactive Aspect Ratio Crop Tool
- **Objective:** Allow users to crop images to standard ratios before resizing so images are never distorted or accidentally letterboxed.
- **Implementation (`src/components/react/CropModal.tsx` or inline canvas cropper):**
  - Standard presets: `1:1`, `4:5`, `16:9`, `9:16`, `35:45` (Passport), and `Free`.
  - Non-destructive: Operates on source image before passing to the Pica Lanczos downscaling pipeline.

### 2.3 Progressive Web App (PWA) & Offline Mode
- **Objective:** Enable 100% offline air-gapped resizing for high-security environments.
- **Implementation:**
  - `manifest.webmanifest` with ShrinkIt branding, icons, and theme colors.
  - Minimalist Service Worker caching static assets (HTML, CSS, JS, WASM workers).
  - Subtle "Install App" button in Header / Footer.

---

## Phase 3: Programmatic SEO Architecture & High-Traffic Pages

Dedicated Astro landing pages pre-configured with query parameters and tailored SEO content (H1, meta descriptions, FAQ schema, pre-filled settings):

| Page Route | Pre-configured Settings | Target Audience / Search Volume |
| :--- | :--- | :--- |
| `src/pages/tools/resize-image-to-20kb.astro` | Target: 20KB, Format: JPG, Dimensions: 200×230 | Signatures, UPSC/SSC online exam uploads |
| `src/pages/tools/resize-image-to-50kb.astro` | Target: 50KB, Format: JPG, Width: 800px | IBPS, Banking, Govt job application forms |
| `src/pages/tools/resize-image-to-100kb.astro`| Target: 100KB, Format: JPG/WebP | Visa portals, college admissions, email attachments |
| `src/pages/tools/passport-photo-maker.astro` | 35×45mm, 300 DPI, White BG, Format: JPG | Passport & international visa applications |
| `src/pages/tools/social-media-resizer.astro` | Instagram, YouTube, LinkedIn preset selector | Social media managers, content creators |
| `src/pages/tools/dpi-converter.astro`        | Unit: inches/cm, DPI: 300, Mode: fit | Print preparation, professional printing |
| `src/pages/tools/image-converter.astro`      | Bulk format conversion (PNG ↔ JPG ↔ WebP) | Fast format switching without dimension loss |

Each tool page reuses `<ShrinkItApp client:load initialSettings={...} />` so 100% of the code is shared, lightweight, and maintainable.

---

## Phase 4: Landing Page UI/UX & Conversion Enhancements

### 4.1 "ShrinkIt vs Cloud Resizers" Privacy & Speed Matrix
- Visual comparison table on the landing page:
  - **Server Upload:** ShrinkIt (None - 100% Browser Local) vs Cloud Resizers (Uploads file to remote server)
  - **Privacy:** ShrinkIt (Zero data retained, air-gapped safe) vs Cloud Resizers (Stored on 3rd-party clouds)
  - **Speed:** ShrinkIt (Instant client-side execution) vs Cloud Resizers (Limited by upload bandwidth)
  - **File Size Limits:** ShrinkIt (Unlimited client memory) vs Cloud Resizers (5MB–10MB paywalls)

### 4.2 Interactive FAQ with `FAQPage` JSON-LD Schema
- FAQ questions styled with native disclosure accordions:
  - *Does ShrinkIt upload my photos to any server?*
  - *How do I resize an image to under 50KB for government exams?*
  - *What dimensions and DPI are needed for passport photos?*
  - *Will converting to WebP maintain quality?*
- Injects structured JSON-LD schema for Google Rich Answer Snippets.

### 4.3 Live Interactive Sample Photo ("Try without uploading")
- A small carousel or set of 2 high-res sample photos (photo & signature) so users can test the tool with 1-click before dragging their own files.

---

## Verification & Testing Matrix

1. **Automated Unit Tests (`tests/unit/`):**
   - `target-size.test.ts`: Verify 50KB target on 1MB test photo produces 45–50KB.
   - `target-size-edge.test.ts`: Verify 20KB target on signature produces <= 20KB.
   - `presets.test.ts`: Verify all preset dimension mappings convert to exact pixels.
2. **Automated E2E Playwright Tests (`tests/e2e/`):**
   - `target-size.spec.ts`: End-to-end test of Target KB input, processing, and file size assertion.
   - `presets.spec.ts`: Verify clicking preset chips fills the inputs correctly.
   - `comparison-slider.spec.ts`: Verify split slider drags and displays comparison.
   - `seo-tools.spec.ts`: Verify all `/tools/*` pages load with correct pre-filled settings.
3. **Regression Safety:**
   - Run `npx playwright test tests/e2e/responsive.spec.ts` (10/10 viewports pass).
   - Run `npx playwright test tests/e2e/theme.spec.ts` (15/15 theme tests pass).
   - Run `npm run test` (53 existing tests pass).
