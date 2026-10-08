import { Download, Trash, WarningCircle, CheckCircle, Spinner } from "@phosphor-icons/react";
import { t } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import { formatBytes, percentSaved } from "../../lib/image/filenames";
import type { ProcessedImage } from "../../lib/image/process";

export type ItemStatus = "queued" | "processing" | "done" | "error";

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  result?: ProcessedImage;
  resultUrl?: string;
  /** Background colour the item was processed with (for the flatten note). */
  background: "white" | "black";
}

interface ResultCardProps {
  locale: Locale;
  item: QueueItem;
  onDownload: (item: QueueItem) => void;
  onRemove: (id: string) => void;
}

export default function ResultCard({ locale, item, onDownload, onRemove }: ResultCardProps) {
  const r = item.result;
  const savedPct = r ? percentSaved(r.originalBytes, r.outputBytes) : 0;

  return (
    <article
      data-testid={`result-card-${item.id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <p
          className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
          title={item.file.name}
        >
          {item.file.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.status === "processing" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300">
              <Spinner size={14} className="animate-spin" /> {t(locale, "result.processing")}
            </span>
          )}
          {item.status === "queued" && (
            <span className="text-xs text-slate-400">{t(locale, "result.queued")}</span>
          )}
          {item.status === "done" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} weight="fill" />
              {savedPct >= 0 ? `−${savedPct}%` : `+${Math.abs(savedPct)}%`}
            </span>
          )}
          {item.status === "error" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <WarningCircle size={14} weight="fill" /> {t(locale, "result.failed")}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      {item.status === "error" && item.error && (
        <p className="bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {item.error}
        </p>
      )}

      {(item.status === "done" || item.status === "processing") && r && (
        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
          <figure className="bg-white p-3 dark:bg-slate-900">
            <img
              src={item.previewUrl}
              alt={t(locale, "result.original")}
              className="mx-auto max-h-44 rounded-lg object-contain"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">{t(locale, "result.original")}</span>
              <br />
              {r.originalWidth}×{r.originalHeight} · {formatBytes(r.originalBytes)}
            </figcaption>
          </figure>
          <figure className="bg-white p-3 dark:bg-slate-900">
            {item.resultUrl ? (
              <img
                src={item.resultUrl}
                alt={t(locale, "result.output")}
                className="mx-auto max-h-44 rounded-lg object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex h-44 items-center justify-center">
                <Spinner size={24} className="animate-spin text-teal-600" />
              </div>
            )}
            <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">{t(locale, "result.output")}</span>
              <br />
              {r.width}×{r.height} · {formatBytes(r.outputBytes)} ·{" "}
              <span
                className={
                  savedPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                }
              >
                {savedPct >= 0 ? "−" : "+"}
                {Math.abs(savedPct)}% {t(locale, "result.saved")}
              </span>
            </figcaption>
          </figure>
        </div>
      )}

      {r && item.status === "done" && (
        <div className="flex flex-col gap-2 px-4 py-3">
          {r.flattened && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t(locale, "result.flattened_note", {
                color: t(
                  locale,
                  item.background === "black" ? "settings.bg_black" : "settings.bg_white",
                ).toLowerCase(),
              })}
            </p>
          )}
          {r.warnLargeInput && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t(locale, "result.large_note")}
            </p>
          )}
          <button
            type="button"
            data-testid={`download-${item.id}`}
            onClick={() => onDownload(item)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Download size={16} weight="bold" />
            {t(locale, "result.download")} · {r.fileName}
          </button>
        </div>
      )}
    </article>
  );
}
