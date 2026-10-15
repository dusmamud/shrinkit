import { useState } from "react";
import { Lock, LockOpen } from "@phosphor-icons/react";
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

interface SettingsPanelProps {
  locale: Locale;
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  disabled: boolean;
  originalSize?: OriginalSize | null;
}

const UNITS: SizeUnit[] = ["percent", "pixels", "cm", "inches"];
const FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "gif"];
const MODES: ResizeMode[] = ["stretch", "crop", "fit"];

const numInputCls =
  "h-[50px] rounded-[6px] border border-[#667085] bg-white text-center text-[20px] font-light text-black outline-none transition focus:border-[#016df0] disabled:opacity-50";

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
}: SettingsPanelProps) {
  const original: OriginalSize =
    originalSize && originalSize.width > 0 && originalSize.height > 0
      ? originalSize
      : { width: 1920, height: 1080 };

  const [locked, setLocked] = useState(true);

  const qualityApplies = settings.format === "jpeg" || settings.format === "webp";
  const resolutionApplies = settings.format !== "gif";
  const qualityNum = Math.min(100, Math.max(0, Number(settings.quality) || 0));
  const w = Number(settings.width);
  const h = Number(settings.height);
  const showModes =
    !locked && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && w !== h;

  const isWidthInvalid = settings.width.trim() !== "" && (!Number.isFinite(w) || w <= 0);
  const isHeightInvalid = settings.height.trim() !== "" && (!Number.isFinite(h) || h <= 0);

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
      // Re-locking re-syncs height to width based on original aspect ratio (reduceimages.com switchLock)
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
    <section
      aria-label={t(locale, "settings.title")}
      className="resize-form-container mx-auto mt-8 w-full max-w-[1100px] bg-white px-4"
    >
      <h2 className="title text-center text-[1.875rem] font-medium text-black">
        {t(locale, "settings.title")}
      </h2>

      {/* (a) Size row */}
      <div className="size-row mt-6 flex flex-wrap items-center justify-center gap-3">
        <div className="size-group-w flex items-center gap-3">
          <label htmlFor="set-width" className="w-20 text-right text-base font-normal text-black">
            <span className="lbl-full">{t(locale, "settings.width")}</span>
            <span className="lbl-short">{t(locale, "settings.w_short")}</span>
          </label>
          <input
            id="set-width"
            data-testid="width-input"
            type="number"
            min="0"
            step="any"
            value={settings.width}
            disabled={disabled}
            onChange={(e) => setWidth(e.target.value)}
            className={`${numInputCls} w-[72px] ${isWidthInvalid ? "border-[#d33] focus:border-[#d33]" : ""}`}
          />
        </div>
        <div className="size-group-h flex items-center gap-3">
          <label htmlFor="set-height" className="w-20 text-right text-base font-normal text-black">
            <span className="lbl-full">{t(locale, "settings.height")}</span>
            <span className="lbl-short">{t(locale, "settings.h_short")}</span>
          </label>
          <input
            id="set-height"
            data-testid="height-input"
            type="number"
            min="0"
            step="any"
            value={settings.height}
            disabled={disabled}
            onChange={(e) => setHeight(e.target.value)}
            className={`${numInputCls} w-[72px] ${isHeightInvalid ? "border-[#d33] focus:border-[#d33]" : ""}`}
          />
        </div>
        <button
          type="button"
          data-testid="aspect-lock"
          aria-pressed={locked}
          aria-label={t(locale, locked ? "settings.unlock_aspect" : "settings.lock_aspect")}
          data-tip={t(locale, "settings.lock_tip")}
          disabled={disabled}
          onClick={toggleLock}
          className="size-lock inline-flex h-[50px] w-[50px] items-center justify-center rounded-[6px] border border-[#667085] text-[#1d2939] transition hover:border-[#016df0] hover:text-[#016df0] disabled:opacity-50"
        >
          {locked ? <Lock size={22} /> : <LockOpen size={22} />}
        </button>
        <div className="size-unit relative">
          <select
            id="set-unit"
            data-testid="unit-select"
            aria-label={t(locale, "settings.unit")}
            value={settings.unit}
            disabled={disabled}
            onChange={(e) => handleUnitChange(e.target.value as SizeUnit)}
            className="h-[50px] w-[160px] cursor-pointer appearance-none rounded-[6px] border border-[#667085] bg-white pl-3 pr-9 text-base font-light text-black outline-none transition focus:border-[#016df0] disabled:opacity-50"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(locale, `settings.units.${u}` as MessageKey)}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      {/* (b) Resolution row - hidden when format is GIF */}
      {resolutionApplies && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <label
            htmlFor="set-dpi"
            className="w-20 text-right text-base font-normal text-black"
            data-tip={t(locale, "settings.resolution_tip")}
          >
            <span className="lbl-full cursor-help underline decoration-dotted underline-offset-4">
              {t(locale, "settings.resolution")}
            </span>
            <span className="lbl-short cursor-help underline decoration-dotted underline-offset-4">
              {t(locale, "settings.res_short")}
            </span>
          </label>
          <div className="relative" data-tip={t(locale, "settings.resolution_tip")}>
            <input
              id="set-dpi"
              data-testid="dpi-input"
              type="number"
              min="1"
              step="1"
              value={settings.dpi}
              disabled={disabled}
              onChange={(e) => onChange({ dpi: e.target.value })}
              className={`${numInputCls} w-[95px] pr-9`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75em] font-light text-[#667085]">
              DPI
            </span>
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="separator my-6 mx-auto max-w-[650px] border-t border-[#e5e7eb]" />

      {/* (c) Resize-mode row — slides open when the lock is off and W≠H */}
      <div className={`mode-row${showModes ? " open" : ""}`} aria-hidden={!showModes}>
        <div>
          <div
            className="flex items-stretch justify-center gap-2 sm:gap-4 pb-6"
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
                  disabled={disabled || !showModes}
                  tabIndex={showModes ? 0 : -1}
                  onClick={() => onChange({ resizeMode: m })}
                  className={[
                    "flex w-24 flex-col items-center gap-1.5 rounded-[6px] px-2 pb-2 pt-3 transition sm:w-28 sm:px-3",
                    selected ? "scale-[1.04] border-b-4 border-[#42c3ac]" : "hover:bg-[#fafcff]",
                  ].join(" ")}
                >
                  <ModeDiagram mode={m} />
                  <span className="flex items-center gap-1.5 text-sm font-normal text-black">
                    <span
                      className={[
                        "inline-block h-3.5 w-3.5 rounded-full border-2",
                        selected ? "border-[#007bff] bg-[#007bff]" : "border-[#667085] bg-white",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {t(locale, `settings.mode_${m}` as MessageKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="separator mb-6 mx-auto max-w-[650px] border-t border-[#e5e7eb]" />
        </div>
      </div>

      {/* (d) Format / Quality / Background row — ReduceImages layout */}
      <div className="format-quality-area mx-auto max-w-[650px]">
        <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-5">
          {/* Format column */}
          <div className="format-col flex flex-col items-center sm:items-start" data-tip={t(locale, "settings.format_tip")}>
            <label
              htmlFor="set-format"
              className="cursor-help text-base font-normal text-black mb-2 underline decoration-dotted underline-offset-4"
            >
              {t(locale, "settings.format")}
            </label>
            <div className="relative">
              <select
                id="set-format"
                data-testid="format-select"
                value={settings.format}
                disabled={disabled}
                onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
                className="h-[50px] w-[130px] cursor-pointer appearance-none rounded-[6px] border border-[#667085] bg-white pl-3 pr-9 text-base font-light text-black outline-none transition focus:border-[#016df0] disabled:opacity-50"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f === "jpeg" ? "JPG" : f.toUpperCase()}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>

          {/* Quality column */}
          {qualityApplies && (
            <div
              className="quality-col flex flex-col items-center sm:items-start"
              data-tip={t(locale, "settings.quality_tip")}
            >
              <label
                htmlFor="set-quality"
                className="cursor-help text-base font-normal text-black mb-2 underline decoration-dotted underline-offset-4"
              >
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
                  className={`${numInputCls} w-[95px] pr-9`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75em] font-light text-[#667085]">
                  %
                </span>
              </div>
            </div>
          )}

          {/* Background column */}
          <div
            className="background-col flex flex-col items-center sm:items-start"
            data-tip={t(locale, "settings.background_tip")}
          >
            <span id="bg-label" className="text-base font-normal text-black mb-2">
              {t(locale, "settings.background")}
            </span>
            <div
              className="flex h-[50px] items-center gap-3"
              role="radiogroup"
              aria-labelledby="bg-label"
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
                    aria-label={t(locale, c === "white" ? "settings.bg_white" : "settings.bg_black")}
                    disabled={disabled}
                    onClick={() => onChange({ background: c })}
                    className={[
                      "h-[35px] w-[35px] rounded-full border transition",
                      c === "white" ? "border-[#667085] bg-white" : "border-black bg-black",
                      selected ? "ring-[3px] ring-[#016df0] ring-offset-2" : "hover:scale-105 shadow-[0_1px_5px_rgba(0,0,0,0.2)]",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* EXIF preference */}
      <label className="mx-auto mt-6 flex max-w-xl cursor-pointer items-start gap-3 rounded-[6px] border border-[#d7dee9] p-3 transition hover:border-[#52a0ff]">
        <input
          type="checkbox"
          data-testid="exif-checkbox"
          checked={settings.preserveExif}
          disabled={disabled}
          onChange={(e) => onChange({ preserveExif: e.target.checked })}
          className="mt-1 h-4 w-4 accent-[#007bff]"
        />
        <span>
          <span className="block text-sm font-normal text-black">
            {t(locale, "settings.preserve_exif")}
          </span>
          <span className="block text-xs font-light text-[#667085]">
            {t(locale, "settings.preserve_exif_hint")}
          </span>
        </span>
      </label>
    </section>
  );
}
