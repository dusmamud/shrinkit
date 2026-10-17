import { useState } from "react";
import { Trash, Stop, WarningCircle } from "@phosphor-icons/react";
import { t, type MessageKey } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import {
  type SizeUnit,
  type OriginalSize,
  getDefaultDimensionsForUnit,
  calculateProportionalDimension,
} from "../../lib/image/units";
import { UNIT_LIMITS, DPI_LIMITS, QUALITY_LIMITS } from "../../lib/image/limits";
import type { OutputFormat } from "../../lib/image/filenames";
import type { ResizeMode } from "../../lib/image/engine";
import CustomSelect from "./CustomSelect";

export interface SettingsState {
  width: string;
  height: string;
  unit: SizeUnit;
  dpi: string;
  format: OutputFormat;
  quality: string;
  background: "white" | "black";
  resizeMode: ResizeMode;
}

export interface SettingsPanelProps {
  locale: Locale;
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  disabled: boolean;
  originalSize?: OriginalSize | null;
  onProcess?: () => void;
  processing?: boolean;
  queuedCount?: number;
  itemCount?: number;
  onClear?: () => void;
  onAbort?: () => void;
}

const UNITS: SizeUnit[] = ["percent", "pixels", "cm", "inches"];
const FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "gif"];
const MODES: ResizeMode[] = ["stretch", "crop", "fit"];

/** Original mini diagrams for the resize-mode options. */
function ModeDiagram({ mode }: { mode: ResizeMode }) {
  if (mode === "stretch") {
    return (
      <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
        <rect x="2" y="11" width="22" height="22" rx="2" stroke="var(--t-ink-2)" strokeWidth="2" />
        <path
          d="M30 22h10m0 0-3.5-3.5M40 22l-3.5 3.5"
          stroke="var(--t-accent-2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="44"
          y="6"
          width="18"
          height="32"
          rx="2"
          stroke="var(--t-accent-2)"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (mode === "crop") {
    return (
      <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
        <rect
          x="12"
          y="8"
          width="40"
          height="28"
          rx="2"
          stroke="var(--t-ink-2)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <path
          d="M12 8V2H6M52 8V2h6M12 36v6H6M52 36v6h6"
          stroke="var(--t-accent-2)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
      <rect
        x="6"
        y="4"
        width="52"
        height="36"
        rx="2"
        stroke="var(--t-ink-2)"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <rect x="20" y="12" width="24" height="20" rx="2" fill="var(--t-accent-2)" opacity="0.85" />
    </svg>
  );
}

export default function SettingsPanel({
  locale,
  settings,
  onChange,
  disabled,
  originalSize,
  onProcess,
  processing = false,
  queuedCount: _queuedCount = 1,
  itemCount = 1,
  onClear,
  onAbort,
}: SettingsPanelProps) {
  const [locked, setLocked] = useState(true);

  const original: OriginalSize =
    originalSize && originalSize.width > 0 && originalSize.height > 0
      ? originalSize
      : { width: 1920, height: 1080 };

  const unitLimit = UNIT_LIMITS[settings.unit];

  const wNum = Number(settings.width);
  const hNum = Number(settings.height);
  const isWidthInvalid = !Number.isFinite(wNum) || wNum < unitLimit.min || wNum > unitLimit.max;
  const isHeightInvalid = !Number.isFinite(hNum) || hNum < unitLimit.min || hNum > unitLimit.max;

  const widthError = isWidthInvalid
    ? t(locale, "errors.width_limit", {
        min: `${unitLimit.min}${unitLimit.suffix}`,
        max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
      })
    : null;

  const heightError = isHeightInvalid
    ? t(locale, "errors.height_limit", {
        min: `${unitLimit.min}${unitLimit.suffix}`,
        max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
      })
    : null;

  // ReduceImages shows resize modes only if unlocked AND width !== height
  const showModes = !locked && settings.width !== settings.height;
  const resolutionApplies = settings.format !== "gif";
  const qualityApplies = settings.format === "jpeg" || settings.format === "webp";

  const dpiNum = Number(settings.dpi);
  const isDpiInvalid =
    resolutionApplies &&
    (!Number.isFinite(dpiNum) || dpiNum < DPI_LIMITS.min || dpiNum > DPI_LIMITS.max);
  const dpiError = isDpiInvalid ? t(locale, "errors.dpi_limit") : null;

  const qualityNum =
    settings.format === "png"
      ? "100"
      : settings.format === "gif"
        ? "100"
        : settings.quality || "90";

  const qNum = Number(qualityNum);
  const isQualityInvalid =
    qualityApplies &&
    (!Number.isFinite(qNum) || qNum < QUALITY_LIMITS.min || qNum > QUALITY_LIMITS.max);
  const qualityError = isQualityInvalid ? t(locale, "errors.quality_limit") : null;

  const validationError = widthError || heightError || dpiError || qualityError;

  const setWidth = (value: string) => {
    if (locked) {
      const nw = Number(value);
      if (Number.isFinite(nw) && nw > 0) {
        const nh = calculateProportionalDimension("width", nw, settings.unit, original);
        onChange({ width: value, height: String(nh) });
        return;
      }
    }
    onChange({ width: value });
  };

  const setHeight = (value: string) => {
    if (locked) {
      const nh = Number(value);
      if (Number.isFinite(nh) && nh > 0) {
        const nw = calculateProportionalDimension("height", nh, settings.unit, original);
        onChange({ height: value, width: String(nw) });
        return;
      }
    }
    onChange({ height: value });
  };

  const toggleLock = () => {
    const nextLocked = !locked;
    setLocked(nextLocked);
    if (nextLocked) {
      const nw = Number(settings.width);
      if (Number.isFinite(nw) && nw > 0) {
        const nh = calculateProportionalDimension("width", nw, settings.unit, original);
        onChange({ height: String(nh) });
      }
    }
  };

  const handleUnitChange = (newUnit: SizeUnit) => {
    const def = getDefaultDimensionsForUnit(newUnit, original, Number(settings.dpi) || 72);
    onChange({ unit: newUnit, width: def.width, height: def.height });
  };

  const handleFormatChange = (newFormat: OutputFormat) => {
    if (newFormat === "jpeg") {
      onChange({
        format: newFormat,
        quality: settings.quality && settings.quality !== "100" ? settings.quality : "90",
      });
    } else if (newFormat === "png") {
      onChange({ format: newFormat, quality: "100" });
    } else if (newFormat === "gif") {
      onChange({ format: newFormat, dpi: "72" });
    } else {
      onChange({ format: newFormat });
    }
  };

  return (
    <section id="resize-form-offline" aria-label={t(locale, "settings.title")} className="py-4">
      <div className="resize-form-container table-multi-resize max-w-[650px] mx-auto">
        <h2 className="title text-center text-[2rem] font-medium text-tink2 mb-8 font-sans">
          {t(locale, "settings.title")}
        </h2>

        {/* (a) Size Form Area - Exact ReduceImages alignment with full text labels */}
        <div className="size-form-area flex flex-col items-center justify-center">
          {/* Width & Height + Lock + Unit Section */}
          <div className="flex items-center justify-center">
            {/* Labels Column (Full text always, responsive font size) */}
            <div className="flex flex-col gap-4 text-right pr-2.5 sm:pr-4">
              <div className="flex h-[50px] items-center justify-end">
                <label
                  htmlFor="set-width"
                  className="lbl-full font-medium text-[0.875rem] sm:text-[1.125rem] text-tink whitespace-nowrap"
                >
                  {t(locale, "settings.width")}
                </label>
              </div>
              <div className="flex h-[50px] items-center justify-end">
                <label
                  htmlFor="set-height"
                  className="lbl-full font-medium text-[0.875rem] sm:text-[1.125rem] text-tink whitespace-nowrap"
                >
                  {t(locale, "settings.height")}
                </label>
              </div>
            </div>

            {/* Inputs Column */}
            <div className="flex flex-col gap-4">
              <input
                id="set-width"
                data-testid="width-input"
                type="number"
                min={unitLimit.min}
                max={unitLimit.max}
                step="any"
                value={settings.width}
                disabled={disabled}
                onChange={(e) => setWidth(e.target.value)}
                title={
                  widthError || `Allowed: ${unitLimit.min}–${unitLimit.max}${unitLimit.suffix}`
                }
                className={`h-[50px] w-[68px] sm:w-[72px] text-center text-[1.15em] sm:text-[1.25em] font-light rounded-[6px] outline-none transition ${
                  isWidthInvalid
                    ? "border-2 border-terror bg-terrorwash text-terror focus:border-terror"
                    : "border border-tinputline bg-tinputbg text-tink2 focus:border-taccent"
                }`}
              />
              <input
                id="set-height"
                data-testid="height-input"
                type="number"
                min={unitLimit.min}
                max={unitLimit.max}
                step="any"
                value={settings.height}
                disabled={disabled}
                onChange={(e) => setHeight(e.target.value)}
                title={
                  heightError || `Allowed: ${unitLimit.min}–${unitLimit.max}${unitLimit.suffix}`
                }
                className={`h-[50px] w-[68px] sm:w-[72px] text-center text-[1.15em] sm:text-[1.25em] font-light rounded-[6px] outline-none transition ${
                  isHeightInvalid
                    ? "border-2 border-terror bg-terrorwash text-terror focus:border-terror"
                    : "border border-tinputline bg-tinputbg text-tink2 focus:border-taccent"
                }`}
              />
            </div>

            {/* Bracket + Blue Circular Lock Badge + Unit Dropdown */}
            <div className="flex items-center">
              {/* Precision Bracket Container (50px top + 16px gap + 50px bottom = 116px total) */}
              <div
                style={{
                  position: "relative",
                  width: "58px",
                  height: "116px",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="58"
                  height="116"
                  viewBox="0 0 58 116"
                  className="overflow-visible"
                  aria-hidden="true"
                >
                  {/* Top Line to Lock Badge (Y=25 is center of 50px top input) */}
                  <path
                    d="M 0 25 L 18 25 Q 26 25 26 33 L 26 45"
                    fill="none"
                    stroke={locked ? "var(--t-ink-2)" : "transparent"}
                    strokeWidth="1.2"
                  />
                  {/* Bottom Line to Lock Badge (Y=91 is center of bottom input: 50+16+25=91) */}
                  <path
                    d="M 0 91 L 18 91 Q 26 91 26 83 L 26 71"
                    fill="none"
                    stroke={locked ? "var(--t-ink-2)" : "transparent"}
                    strokeWidth="1.2"
                  />
                  {/* Horizontal Line to Unit Select (Y=58 is exact midpoint) */}
                  <line x1="39" y1="58" x2="58" y2="58" stroke="var(--t-ink-2)" strokeWidth="1.2" />
                </svg>

                {/* Clickable Blue Circle Badge exactly centered at (26, 58) */}
                <button
                  type="button"
                  data-testid="aspect-lock"
                  aria-pressed={locked}
                  aria-label={t(locale, locked ? "settings.unlock_aspect" : "settings.lock_aspect")}
                  data-tip={t(locale, "settings.lock_tip")}
                  onClick={toggleLock}
                  style={{
                    position: "absolute",
                    left: "13px",
                    top: "45px",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    zIndex: 10,
                  }}
                  className={`transition-transform active:scale-95 ${
                    locked
                      ? "bg-taccent text-white shadow-sm"
                      : "bg-tbadgeoff text-white opacity-80"
                  }`}
                >
                  {locked ? (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path
                        d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5V5.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                      <circle cx="6" cy="9.75" r="1.2" fill="var(--t-accent)" />
                    </svg>
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path
                        d="M2.5 5.5V3.5C2.5 1.567 4.067 0 6 0C7.933 0 9.5 1.567 9.5 3.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <rect y="5.5" width="12" height="8.5" rx="2" fill="white" />
                      <circle cx="6" cy="9.75" r="1.2" fill="var(--t-badge-off)" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Unit Select Dropdown with Custom UI */}
              <CustomSelect<SizeUnit>
                id="set-unit"
                testId="unit-select"
                ariaLabel={t(locale, "settings.unit")}
                value={settings.unit}
                disabled={disabled}
                onChange={handleUnitChange}
                className="w-[125px] sm:w-[155px]"
                triggerClassName="w-full"
                options={UNITS.map((u) => ({
                  value: u,
                  label: t(locale, `settings.units.${u}` as MessageKey),
                }))}
              />
            </div>
          </div>

          {/* Real-time dimension limit error */}
          {(widthError || heightError) && (
            <div
              role="alert"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-terror"
            >
              <WarningCircle size={15} weight="fill" className="shrink-0 text-terror" />
              <span>{widthError || heightError}</span>
            </div>
          )}

          {/* Resolution Row (Full text label always, perfectly aligned) */}
          {resolutionApplies && (
            <div
              id="resolution_row"
              data-tip={t(locale, "settings.resolution_tip")}
              className="mt-4 flex flex-col items-center justify-center"
            >
              <div className="flex items-center justify-center">
                <div className="flex h-[50px] items-center justify-end pr-2.5 sm:pr-4">
                  <label
                    htmlFor="set-dpi"
                    className="lbl-full font-medium text-[0.875rem] sm:text-[1.125rem] text-tink whitespace-nowrap cursor-help underline decoration-dotted underline-offset-4"
                  >
                    {t(locale, "settings.resolution")}
                  </label>
                </div>
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      id="set-dpi"
                      data-testid="dpi-input"
                      type="number"
                      min={DPI_LIMITS.min}
                      max={DPI_LIMITS.max}
                      step="1"
                      value={settings.dpi}
                      disabled={disabled}
                      onChange={(e) => onChange({ dpi: e.target.value })}
                      title={dpiError || `Allowed: ${DPI_LIMITS.min}–${DPI_LIMITS.max} DPI`}
                      className={`h-[50px] w-[85px] sm:w-[95px] rounded-[6px] pr-8 text-center text-[1.15em] sm:text-[1.25em] font-light outline-none transition ${
                        isDpiInvalid
                          ? "border-2 border-terror bg-terrorwash text-terror focus:border-terror"
                          : "border border-tinputline bg-tinputbg text-tink2 focus:border-taccent"
                      }`}
                    />
                    <span
                      id="dpi_unit_overlay"
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.75em] text-tmuted"
                    >
                      DPI
                    </span>
                  </div>
                  {/* Spacer to keep input visually aligned with the Width/Height column */}
                  <div className="w-[170px] sm:w-[208px] hidden sm:block pointer-events-none" />
                </div>
              </div>

              {dpiError && (
                <div
                  role="alert"
                  className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-terror"
                >
                  <WarningCircle size={14} weight="fill" className="shrink-0 text-terror" />
                  <span>{dpiError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resize Mode Row (slides open when unlocked & W !== H) */}
        <div
          className={`mode-row ${showModes ? "open my-4 block" : "hidden"}`}
          aria-hidden={!showModes}
        >
          <div
            className="flex items-stretch justify-center gap-2 sm:gap-4 pb-2"
            role="radiogroup"
            aria-label={t(locale, "settings.resize_mode")}
          >
            {MODES.map((m) => {
              const selected = settings.resizeMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`mode-${m}`}
                  data-tip={t(locale, `settings.mode_${m}_tip` as MessageKey)}
                  disabled={disabled}
                  onClick={() => onChange({ resizeMode: m })}
                  className={[
                    "flex w-24 flex-col items-center gap-1.5 rounded-[6px] px-2 pb-2 pt-3 transition sm:w-28 sm:px-3",
                    selected ? "scale-[1.04] border-b-4 border-tteal" : "hover:bg-tsurface2",
                  ].join(" ")}
                >
                  <ModeDiagram mode={m} />
                  <span className="flex items-center gap-1.5 text-sm font-normal text-tink">
                    <span
                      className={[
                        "inline-block h-3.5 w-3.5 rounded-full border-2",
                        selected ? "border-taccent2 bg-taccent2" : "border-tinputline bg-tsurface",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {t(locale, `settings.mode_${m}` as MessageKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* (b) Format / Quality / Background row — Exact ReduceImages layout */}
        <div className="format-quality-area mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {/* Format */}
          <div
            className="format flex flex-col items-start"
            data-tip={t(locale, "settings.format_tip")}
          >
            <label htmlFor="set-format" className="mb-2 text-[1.15rem] font-medium text-tink">
              {t(locale, "settings.format")}
            </label>
            <CustomSelect<OutputFormat>
              id="set-format"
              testId="format-select"
              ariaLabel={t(locale, "settings.format")}
              value={settings.format}
              disabled={disabled}
              onChange={handleFormatChange}
              className="w-[100px] sm:w-[115px]"
              triggerClassName="w-full uppercase"
              options={FORMATS.map((f) => ({
                value: f,
                label: f === "jpeg" ? "JPG" : f.toUpperCase(),
              }))}
            />
          </div>

          {/* Quality */}
          {qualityApplies && (
            <div
              id="sector_calidad"
              className="flex flex-col items-start"
              data-tip={t(locale, "settings.quality_tip")}
            >
              <label htmlFor="set-quality" className="mb-2 text-[1.15rem] font-medium text-tink">
                {t(locale, "settings.quality")}
              </label>
              <div className="relative">
                <input
                  id="set-quality"
                  data-testid="quality-input"
                  type="number"
                  min={QUALITY_LIMITS.min}
                  max={QUALITY_LIMITS.max}
                  step="1"
                  value={qualityNum}
                  disabled={disabled}
                  onChange={(e) => onChange({ quality: e.target.value })}
                  title={qualityError || `Allowed: ${QUALITY_LIMITS.min}–${QUALITY_LIMITS.max}%`}
                  className={`h-[50px] w-[90px] rounded-[6px] pr-7 text-center text-[1.25em] font-light outline-none transition ${
                    isQualityInvalid
                      ? "border-2 border-terror bg-terrorwash text-terror focus:border-terror"
                      : "border border-tinputline bg-tinputbg text-tink2 focus:border-taccent"
                  }`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.85em] text-tmuted">
                  %
                </span>
              </div>
              {qualityError && (
                <div
                  role="alert"
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-terror"
                >
                  <WarningCircle size={14} weight="fill" className="shrink-0 text-terror" />
                  <span>{qualityError}</span>
                </div>
              )}
            </div>
          )}

          {/* Background */}
          <div
            id="sector_background"
            className="flex flex-col items-start"
            data-tip={t(locale, "settings.background_tip")}
          >
            <label className="mb-2 text-[1.15rem] font-medium text-tink">
              {t(locale, "settings.background")}
            </label>
            <div
              className="flex h-[50px] items-center gap-3.5"
              role="radiogroup"
              aria-label={t(locale, "settings.background")}
            >
              {(["white", "black"] as const).map((c) => {
                const selected = settings.background === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`bg-${c}`}
                    aria-label={t(
                      locale,
                      c === "white" ? "settings.bg_white" : "settings.bg_black",
                    )}
                    disabled={disabled}
                    onClick={() => onChange({ background: c })}
                    className={`background_button h-[35px] w-[35px] rounded-full transition-transform hover:scale-105 ${
                      c === "white"
                        ? "bg-white shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]"
                        : "bg-black shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]"
                    } ${
                      selected
                        ? "ring-[3px] ring-taccent border-[3px] border-taccent"
                        : "border border-tline"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* (c) Centered Resize Button — matching ReduceImages #resize-form-submit-container */}
        {onProcess && (
          <div id="resize-form-submit-container" className="mt-8 text-center">
            <button
              id="offline-submit-button"
              type="button"
              data-testid="process-button"
              onClick={onProcess}
              disabled={disabled || processing || itemCount === 0 || Boolean(validationError)}
              title={validationError || undefined}
              className="inline-block rounded-[6px] bg-tbtna px-12 py-3.5 text-[1.125rem] font-bold text-white shadow-sm transition hover:bg-[#0257bf] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing
                ? t(locale, "settings.processing")
                : itemCount > 1
                  ? t(locale, "settings.process_many")
                  : t(locale, "settings.process_one")}
            </button>

            {validationError && (
              <p
                role="alert"
                className="mt-2 text-xs font-medium text-terror flex items-center justify-center gap-1"
              >
                <WarningCircle size={14} weight="fill" className="shrink-0" />
                <span>{validationError}</span>
              </p>
            )}

            {/* Clear All / Stop row below */}
            <div className="mt-3 flex justify-center gap-3">
              {processing && onAbort && (
                <button
                  type="button"
                  onClick={onAbort}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-tinputline px-4 py-1.5 text-xs font-normal text-tink transition hover:border-terror hover:text-terror"
                >
                  <Stop size={14} weight="fill" /> {t(locale, "settings.stop")}
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-tinputline px-4 py-1.5 text-xs font-normal text-tink transition hover:border-terror hover:text-terror"
                >
                  <Trash size={14} /> {t(locale, "result.clear")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
