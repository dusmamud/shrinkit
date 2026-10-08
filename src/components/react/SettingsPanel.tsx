import { t, type MessageKey } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import type { SizeUnit } from "../../lib/image/units";
import type { OutputFormat } from "../../lib/image/filenames";

export interface SettingsState {
  width: string;
  height: string;
  unit: SizeUnit;
  dpi: string;
  format: OutputFormat;
  quality: string;
  background: "white" | "black";
  preserveExif: boolean;
}

interface SettingsPanelProps {
  locale: Locale;
  settings: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  disabled: boolean;
}

const UNITS: SizeUnit[] = ["percent", "pixels", "cm", "inches"];
const FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "gif"];

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function SettingsPanel({
  locale,
  settings,
  onChange,
  disabled,
}: SettingsPanelProps) {
  const qualityApplies = settings.format === "jpeg" || settings.format === "webp";
  const qualityNum = Math.min(100, Math.max(0, Number(settings.quality) || 0));

  return (
    <section
      aria-label={t(locale, "settings.title")}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {t(locale, "settings.title")}
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="set-width">
            {t(locale, "settings.width")}
          </label>
          <input
            id="set-width"
            data-testid="width-input"
            type="number"
            min="0"
            step="any"
            value={settings.width}
            disabled={disabled}
            onChange={(e) => onChange({ width: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="set-height">
            {t(locale, "settings.height")}
          </label>
          <input
            id="set-height"
            data-testid="height-input"
            type="number"
            min="0"
            step="any"
            value={settings.height}
            disabled={disabled}
            onChange={(e) => onChange({ height: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="set-unit">
            {t(locale, "settings.unit")}
          </label>
          <select
            id="set-unit"
            data-testid="unit-select"
            value={settings.unit}
            disabled={disabled}
            onChange={(e) => onChange({ unit: e.target.value as SizeUnit })}
            className={inputCls}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(locale, `settings.units.${u}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="set-dpi">
            {t(locale, "settings.dpi")}
          </label>
          <input
            id="set-dpi"
            data-testid="dpi-input"
            type="number"
            min="1"
            step="1"
            value={settings.dpi}
            disabled={disabled}
            onChange={(e) => onChange({ dpi: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="set-format">
            {t(locale, "settings.format")}
          </label>
          <select
            id="set-format"
            data-testid="format-select"
            value={settings.format}
            disabled={disabled}
            onChange={(e) => onChange({ format: e.target.value as OutputFormat })}
            className={inputCls}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="set-bg">
            {t(locale, "settings.background")}
          </label>
          <select
            id="set-bg"
            data-testid="background-select"
            value={settings.background}
            disabled={disabled}
            onChange={(e) => onChange({ background: e.target.value as "white" | "black" })}
            className={inputCls}
          >
            <option value="white">{t(locale, "settings.bg_white")}</option>
            <option value="black">{t(locale, "settings.bg_black")}</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className={labelCls} htmlFor="set-quality">
            {t(locale, "settings.quality")}
          </label>
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {qualityNum}
          </span>
        </div>
        <input
          id="set-quality"
          data-testid="quality-input"
          type="range"
          min="0"
          max="100"
          step="1"
          value={qualityNum}
          disabled={disabled || !qualityApplies}
          onChange={(e) => onChange({ quality: e.target.value })}
          className="w-full accent-teal-600 disabled:opacity-40"
          aria-describedby="quality-hint"
        />
        <p id="quality-hint" className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {qualityApplies ? t(locale, "settings.quality_hint") : t(locale, "settings.quality_na")}
        </p>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-teal-400 dark:border-slate-700 dark:hover:border-teal-600">
        <input
          type="checkbox"
          data-testid="exif-checkbox"
          checked={settings.preserveExif}
          disabled={disabled}
          onChange={(e) => onChange({ preserveExif: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-teal-600"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
            {t(locale, "settings.preserve_exif")}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {t(locale, "settings.preserve_exif_hint")}
          </span>
        </span>
      </label>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        {t(locale, "settings.background_hint")} {t(locale, "settings.dpi_hint")}
      </p>
    </section>
  );
}
