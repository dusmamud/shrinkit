import { useState } from "react";
import { Trash, Stop } from "@phosphor-icons/react";
import { t, type MessageKey } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import {
  type SizeUnit,
  type OriginalSize,
  getDefaultDimensionsForUnit,
  calculateProportionalDimension,
} from "../../lib/image/units";
import type { OutputFormat } from "../../lib/image/filenames";
import type { ResizeMode } from "../../lib/image/engine";

export interface SettingsState {
  width: string;
  height: string;
  unit: SizeUnit;
  dpi: string;
  format: OutputFormat;
  quality: string;
  background: "white" | "black";
  preserveExif: boolean;
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
        <rect x="2" y="11" width="22" height="22" rx="2" stroke="#1d2939" strokeWidth="2" />
        <path
          d="M30 22h10m0 0-3.5-3.5M40 22l-3.5 3.5"
          stroke="#007bff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="44" y="6" width="18" height="32" rx="2" stroke="#007bff" strokeWidth="2" />
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
          stroke="#1d2939"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <path
          d="M12 8V2H6M52 8V2h6M12 36v6H6M52 36v6h6"
          stroke="#007bff"
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
        stroke="#1d2939"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <rect x="20" y="12" width="24" height="20" rx="2" fill="#007bff" opacity="0.85" />
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
  queuedCount = 1,
  itemCount = 1,
  onClear,
  onAbort,
}: SettingsPanelProps) {
  const [locked, setLocked] = useState(true);

  const original: OriginalSize =
    originalSize && originalSize.width > 0 && originalSize.height > 0
      ? originalSize
      : { width: 1920, height: 1080 };

  const wNum = Number(settings.width);
  const hNum = Number(settings.height);
  const isWidthInvalid = !Number.isFinite(wNum) || wNum <= 0;
  const isHeightInvalid = !Number.isFinite(hNum) || hNum <= 0;

  // ReduceImages shows resize modes only if unlocked AND width !== height
  const showModes = !locked && settings.width !== settings.height;
  const resolutionApplies = settings.format !== "gif";
  const qualityApplies = settings.format === "jpeg" || settings.format === "webp";

  const qualityNum =
    settings.format === "png"
      ? "100"
      : settings.format === "gif"
        ? "100"
        : settings.quality || "90";

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
        <h2 className="title text-center text-[2rem] font-medium text-[#1d2939] mb-8 font-sans">
          {t(locale, "settings.title")}
        </h2>

        {/* (a) Size Form Area - Exact ReduceImages table layout */}
        <div className="size-form-area flex justify-center items-center">
          <table className="border-collapse mx-auto">
            <tbody>
              <tr className="width_and_height">
                <td className="label_cell text-right pr-4 align-middle">
                  <div className="flex justify-end items-center h-[50px] my-[18px]">
                    <label className="lbl-full text-[1.2rem] font-medium text-[#000]" htmlFor="set-width">
                      {t(locale, "settings.width")}
                    </label>
                    <label className="lbl-short text-[1.2rem] font-medium text-[#000]" htmlFor="set-width">
                      {t(locale, "settings.w_short")}
                    </label>
                  </div>
                  <div className="flex justify-end items-center h-[50px] my-[18px]">
                    <label className="lbl-full text-[1.2rem] font-medium text-[#000]" htmlFor="set-height">
                      {t(locale, "settings.height")}
                    </label>
                    <label className="lbl-short text-[1.2rem] font-medium text-[#000]" htmlFor="set-height">
                      {t(locale, "settings.h_short")}
                    </label>
                  </div>
                </td>

                <td className="lock_and_units_area align-middle whitespace-nowrap">
                  <div className="flex items-center">
                    {/* Inputs Column */}
                    <div className="inputs_col flex flex-col">
                      <input
                        id="set-width"
                        data-testid="width-input"
                        type="number"
                        min="0"
                        step="any"
                        value={settings.width}
                        disabled={disabled}
                        onChange={(e) => setWidth(e.target.value)}
                        className={`w-[72px] h-[50px] my-[18px] text-center text-[1.25em] font-light text-[#1d2939] bg-white border rounded-[6px] outline-none transition focus:border-[#016df0] ${
                          isWidthInvalid ? "border-[#d33] focus:border-[#d33]" : "border-[#667085]"
                        }`}
                      />
                      <input
                        id="set-height"
                        data-testid="height-input"
                        type="number"
                        min="0"
                        step="any"
                        value={settings.height}
                        disabled={disabled}
                        onChange={(e) => setHeight(e.target.value)}
                        className={`w-[72px] h-[50px] my-[18px] text-center text-[1.25em] font-light text-[#1d2939] bg-white border rounded-[6px] outline-none transition focus:border-[#016df0] ${
                          isHeightInvalid ? "border-[#d33] focus:border-[#d33]" : "border-[#667085]"
                        }`}
                      />
                    </div>

                    {/* Mathematical SVG Bracket & Circular Lock Badge */}
                    <div className="relative inline-block select-none -ml-[1px]">
                      <svg
                        width="64"
                        height="176"
                        viewBox="0 0 64 176"
                        className="overflow-visible"
                        aria-hidden="true"
                      >
                        {/* Top Line to Lock Badge (Y=43 is center of top input 18+25) */}
                        <path
                          d="M 0 43 L 18 43 Q 26 43 26 51 L 26 75"
                          fill="none"
                          stroke={locked ? "#1d2939" : "transparent"}
                          strokeWidth="1.2"
                        />
                        {/* Bottom Line to Lock Badge (Y=133 is center of bottom input 18+50+18+25+22... wait: 18+50+18+25 = 111, wait: 50+36+50 = 136? No: top input is 18 to 68, center 43; bottom input is 86 to 136, center 111) */}
                        <path
                          d="M 0 111 L 18 111 Q 26 111 26 103 L 26 79"
                          fill="none"
                          stroke={locked ? "#1d2939" : "transparent"}
                          strokeWidth="1.2"
                        />
                        {/* Right Line to Unit Dropdown */}
                        <line
                          x1="39"
                          y1="77"
                          x2="64"
                          y2="77"
                          stroke="#1d2939"
                          strokeWidth="1.2"
                        />
                      </svg>

                      {/* Clickable Blue Circle Badge exactly centered at (26, 77) */}
                      <button
                        type="button"
                        data-testid="aspect-lock"
                        aria-pressed={locked}
                        aria-label={t(
                          locale,
                          locked ? "settings.unlock_aspect" : "settings.lock_aspect",
                        )}
                        data-tip={t(locale, "settings.lock_tip")}
                        onClick={toggleLock}
                        className={`absolute left-[13px] top-[64px] z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full transition-transform active:scale-95 ${
                          locked
                            ? "bg-[#016df0] text-white shadow-sm"
                            : "bg-[#667085] text-white opacity-80"
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
                            <circle cx="6" cy="9.75" r="1.2" fill="#016df0" />
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
                            <circle cx="6" cy="9.75" r="1.2" fill="#667085" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Unit Select Dropdown */}
                    <div className="pixels_or_percent inline-block align-middle ml-0">
                      <div className="relative">
                        <select
                          id="set-unit"
                          data-testid="unit-select"
                          aria-label={t(locale, "settings.unit")}
                          value={settings.unit}
                          disabled={disabled}
                          onChange={(e) => handleUnitChange(e.target.value as SizeUnit)}
                          className="h-[50px] w-[140px] sm:w-[160px] appearance-none rounded-[6px] border border-[#667085] bg-white px-4 pr-9 text-center text-[1rem] capitalize text-[#1d2939] outline-none transition focus:border-[#016df0] cursor-pointer"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {t(locale, `settings.units.${u}` as MessageKey)}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d2939]"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="m4 6 4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Resolution Row */}
              {resolutionApplies && (
                <tr id="resolution_row">
                  <td className="label_and_field_cell text-right pr-4 align-middle">
                    <label
                      htmlFor="set-dpi"
                      data-tip={t(locale, "settings.resolution_tip")}
                      className="text-[1.2rem] font-medium text-[#000]"
                    >
                      <span className="lbl-full cursor-help underline decoration-dotted underline-offset-4">
                        {t(locale, "settings.resolution")}
                      </span>
                      <span className="lbl-short cursor-help underline decoration-dotted underline-offset-4">
                        {t(locale, "settings.res_short")}
                      </span>
                    </label>
                  </td>
                  <td className="text-left align-middle py-2">
                    <div className="relative inline-block align-middle">
                      <input
                        id="set-dpi"
                        data-testid="dpi-input"
                        type="number"
                        min="1"
                        step="1"
                        value={settings.dpi}
                        disabled={disabled}
                        onChange={(e) => onChange({ dpi: e.target.value })}
                        className="h-[50px] w-[95px] rounded-[6px] border border-[#667085] bg-white pr-9 text-center text-[1.25em] font-light text-[#1d2939] outline-none transition focus:border-[#016df0]"
                      />
                      <span
                        id="dpi_unit_overlay"
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.75em] text-[#667085]"
                      >
                        DPI
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resize Mode Row (slides open when unlocked & W !== H) */}
        {showModes && (
          <div className="mode-row open my-4" aria-hidden={false}>
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
                      selected
                        ? "scale-[1.04] border-b-4 border-[#42c3ac]"
                        : "hover:bg-[#fafcff]",
                    ].join(" ")}
                  >
                    <ModeDiagram mode={m} />
                    <span className="flex items-center gap-1.5 text-sm font-normal text-black">
                      <span
                        className={[
                          "inline-block h-3.5 w-3.5 rounded-full border-2",
                          selected
                            ? "border-[#007bff] bg-[#007bff]"
                            : "border-[#667085] bg-white",
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
        )}

        {/* (b) Format / Quality / Background row — Exact ReduceImages layout */}
        <div className="format-quality-area mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {/* Format */}
          <div className="format flex flex-col items-start" data-tip={t(locale, "settings.format_tip")}>
            <label htmlFor="set-format" className="mb-2 text-[1.15rem] font-medium text-[#000]">
              {t(locale, "settings.format")}
            </label>
            <div className="relative">
              <select
                id="set-format"
                data-testid="format-select"
                value={settings.format}
                disabled={disabled}
                onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
                className="h-[50px] w-[95px] sm:w-[105px] appearance-none rounded-[6px] border border-[#667085] bg-white px-3 pr-8 text-center text-[1rem] font-normal text-[#1d2939] outline-none transition focus:border-[#016df0] cursor-pointer"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f === "jpeg" ? "JPG" : f.toUpperCase()}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d2939]"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m4 6 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Quality */}
          {qualityApplies && (
            <div id="sector_calidad" className="flex flex-col items-start" data-tip={t(locale, "settings.quality_tip")}>
              <label htmlFor="set-quality" className="mb-2 text-[1.15rem] font-medium text-[#000]">
                {t(locale, "settings.quality")}
              </label>
              <div className="relative">
                <input
                  id="set-quality"
                  data-testid="quality-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={qualityNum}
                  disabled={disabled}
                  onChange={(e) => onChange({ quality: e.target.value })}
                  className="h-[50px] w-[90px] rounded-[6px] border border-[#667085] bg-white pr-7 text-center text-[1.25em] font-light text-[#1d2939] outline-none transition focus:border-[#016df0]"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.85em] text-[#667085]">
                  %
                </span>
              </div>
            </div>
          )}

          {/* Background */}
          <div id="sector_background" className="flex flex-col items-start" data-tip={t(locale, "settings.background_tip")}>
            <label className="mb-2 text-[1.15rem] font-medium text-[#000]">
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
                    className={`h-[35px] w-[35px] rounded-full transition-transform hover:scale-105 ${
                      c === "white"
                        ? "bg-white shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]"
                        : "bg-black shadow-[0px_1px_5px_0px_rgba(0,0,0,0.2)]"
                    } ${
                      selected
                        ? "border-[3px] border-[#016df0]"
                        : c === "white"
                          ? "border border-[#ddd]"
                          : "border border-black"
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
              disabled={disabled || processing || queuedCount === 0}
              className="inline-block rounded-[6px] bg-[#016df0] px-12 py-3.5 text-[1.125rem] font-bold text-white shadow-sm transition hover:bg-[#0257bf] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing
                ? t(locale, "settings.processing")
                : itemCount > 1
                  ? t(locale, "settings.process_many")
                  : t(locale, "settings.process_one")}
            </button>

            {/* Clear All / Stop row below */}
            <div className="mt-3 flex justify-center gap-3">
              {processing && onAbort && (
                <button
                  type="button"
                  onClick={onAbort}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#667085] px-4 py-1.5 text-xs font-normal text-black transition hover:border-[#d33] hover:text-[#d33]"
                >
                  <Stop size={14} weight="fill" /> {t(locale, "settings.stop")}
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#667085] px-4 py-1.5 text-xs font-normal text-black transition hover:border-[#d33] hover:text-[#d33]"
                >
                  <Trash size={14} /> {t(locale, "result.clear")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* EXIF preference (subtle clean checkbox below) */}
        <div className="mt-6 flex justify-center">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[#667085] hover:text-black transition">
            <input
              type="checkbox"
              data-testid="exif-checkbox"
              checked={settings.preserveExif}
              disabled={disabled}
              onChange={(e) => onChange({ preserveExif: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#016df0]"
            />
            <span>{t(locale, "settings.preserve_exif")}</span>
          </label>
        </div>
      </div>
    </section>
  );
}
