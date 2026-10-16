# Implementation Plan: Ultra-Responsive Across All Screen Dimensions (320px to 4K)

## 1. Goal
Ensure ShrinkIt is 100% responsive, fluid, and ergonomically optimized on **any screen dimension**:
- **Ultra-Small Mobile:** 320px – 360px (iPhone SE 1st gen, Galaxy Fold cover, small Androids)
- **Standard Mobile:** 375px – 430px (iPhone 13/14/15/Pro Max, Pixel, Galaxy S)
- **Foldables & Tablets:** 600px – 1024px (iPad Mini, iPad Air, Surface, Galaxy Fold unfolded)
- **Laptops & Desktops:** 1280px – 1920px (MacBook, Full HD monitors)
- **Ultrawide & 4K Displays:** 2560px – 3840px+

## 2. Best Practices Applied
1. **Dynamic Viewport Units (`dvh`, `dvw`):**
   - Use `min-height: 100dvh` so mobile address bar expansion/collapse does not clip action buttons or footer.
   - Avoid `100vw` (causes scrollbar overflow); use `100%` or `100dvw`.
2. **Safe-Area Insets:**
   - Account for iPhone notch and home gesture indicator: `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)`.
3. **Fluid Typography & Spacing:**
   - Scale headers with `clamp()` and enable `text-wrap: balance` for titles and `text-wrap: pretty` for body copy.
4. **WCAG 2.5.8 Touch Target Compliance:**
   - All interactive controls (buttons, selects, inputs, theme switchers, language buttons, swatches) have at least 44×44px hit-box on mobile/coarse pointers.
5. **Zero-Horizontal-Overflow Invariant:**
   - Enforce `overflow-x: clip` and `max-inline-size: 100%`.
   - Prevent flex children from overflowing with `min-width: 0`.
   - Ensure size input areas (`inputs_area`, `lock_and_units_area`, bracket locks) scale cleanly without clipping or wrapping awkwardly below 400px.

## 3. Files to Update
1. `src/styles/global.css` — Global responsive variables, dynamic viewport units, mobile layout rules for settings panel, size inputs, touch targets, and safe areas.
2. `src/components/Header.astro` — Responsive header layout on narrow viewports (< 400px).
3. `src/components/react/SettingsPanel.tsx` — Touch target wrappers, flexible form row classes.
4. `src/components/react/Dropzone.tsx` — Adaptive padding and limits badges wrapping.
5. `src/components/react/ResultPanel.tsx` — Responsive preview, action button grid, copy button layout.
6. `tests/e2e/responsive.spec.ts` — Comprehensive automated Playwright test across 8 viewports asserting zero horizontal overflow and proper rendering.

## 4. Verification Checklist
- [ ] `npm run test` passes (53 unit tests).
- [ ] `npx playwright test tests/e2e/responsive.spec.ts` passes across 320px, 375px, 390px, 768px, 1024px, 1366px, 1920px, 2560px.
- [ ] All existing E2E tests (`qa.spec.ts`, `ux-limits-reresize.spec.ts`, `theme.spec.ts`) pass.
