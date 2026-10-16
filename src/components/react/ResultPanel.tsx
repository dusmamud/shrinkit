import { Download, FileImage, Trash, WarningCircle } from "@phosphor-icons/react";
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
  /** Decoded dimensions, filled in asynchronously after the file is added. */
  dims?: { width: number; height: number };
}

interface ResultPanelProps {
  locale: Locale;
  items: QueueItem[];
  onDownload: (item: QueueItem) => void;
  onRemove: (id: string) => void;
  onDownloadZip: () => void;
  zipping: boolean;
}

function SizeLine({ locale, item }: { locale: Locale; item: QueueItem }) {
  const r = item.result;
  if (!r) return null;
  const saved = percentSaved(r.originalBytes, r.outputBytes);
  return (
    <p className="text-xs font-light text-[#667085]">
      {r.width}×{r.height} · {formatBytes(r.outputBytes)}{" "}
      <span className={saved >= 0 ? "text-[#0a7d4f]" : "text-[#b7791f]"}>
        {saved >= 0
          ? `${saved}% ${t(locale, "result.saved")}`
          : `+${Math.abs(saved)}% ${t(locale, "result.larger")}`}
      </span>
    </p>
  );
}

export default function ResultPanel({
  locale,
  items,
  onDownload,
  onRemove,
  onDownloadZip,
  zipping,
}: ResultPanelProps) {
  const done = items.filter((i) => i.status === "done" && i.result);
  const errored = items.filter((i) => i.status === "error");
  if (done.length === 0 && errored.length === 0) return null;
  const multi = done.length > 1;

  return (
    <section
      data-testid="result-panel"
      className="mt-8 rounded-[4px] border border-[#ddd] bg-[#fcfcfc] p-6"
      aria-live="polite"
    >
      <h3 className="text-center text-[1.5rem] font-medium text-black">
        {t(locale, "result.title")}
      </h3>

      {!multi && (
        <div className="mt-5 space-y-4">
          {done.map((item) => (
            <div
              key={item.id}
              data-testid={`result-row-${item.id}`}
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-[8px] border border-[#eaecf0] bg-white p-4 sm:p-5 shadow-xs"
            >
              {/* Image Preview Thumbnail */}
              {item.resultUrl ? (
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  title={t(locale, "result.download")}
                  className="group relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[8px] border border-[#d0d5dd] bg-[#fafcff] p-1.5 transition hover:border-[#016df0] hover:shadow-sm"
                >
                  <img
                    src={item.resultUrl}
                    alt={item.result!.fileName}
                    className="h-full w-full object-contain transition duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 rounded-[8px]">
                    <Download size={22} className="text-white drop-shadow-sm" weight="bold" />
                  </span>
                </button>
              ) : (
                <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-[8px] border border-[#eaecf0] bg-[#fafcff]">
                  <FileImage size={40} className="text-[#016df0]" weight="light" />
                </div>
              )}

              {/* Details */}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p
                  className="truncate text-base font-semibold text-black"
                  title={item.result!.fileName}
                >
                  {item.result!.fileName}
                </p>
                <div className="mt-1">
                  <SizeLine locale={locale} item={item} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex w-full sm:w-auto items-center justify-center gap-2">
                <button
                  type="button"
                  data-testid={`download-${item.id}`}
                  onClick={() => onDownload(item)}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[6px] bg-[#016df0] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#0257bf] active:scale-[0.98]"
                >
                  <Download size={16} weight="bold" />
                  {t(locale, "result.download")}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                  className="shrink-0 rounded-full p-2 text-[#667085] transition hover:bg-red-50 hover:text-[#d33]"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {multi && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {done.map((item) => (
              <div
                key={item.id}
                data-testid={`result-card-${item.id}`}
                className="relative rounded-[4px] border border-[#eee] bg-white p-3 text-center"
              >
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-[#667085] shadow-sm transition hover:text-[#d33]"
                >
                  <Trash size={14} />
                </button>
                {item.resultUrl ? (
                  <img
                    src={item.resultUrl}
                    alt={item.result!.fileName}
                    className="mx-auto max-h-[155px] object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="mx-auto flex max-h-[155px] min-h-[100px] items-center justify-center bg-[#fafcff]">
                    <FileImage size={40} className="text-[#016df0]" weight="light" />
                  </div>
                )}
                <p
                  className="clamp-2 mt-2 text-xs font-normal text-black"
                  title={item.result!.fileName}
                >
                  {item.result!.fileName}
                </p>
                <p className="mt-0.5 text-[11px] font-light text-[#667085]">
                  {formatBytes(item.result!.outputBytes)}
                </p>
                <button
                  type="button"
                  data-testid={`download-${item.id}`}
                  onClick={() => onDownload(item)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-[#1a7af7] px-3 py-2 text-sm font-medium text-[#1a7af7] transition hover:bg-[#1a7af7] hover:text-white"
                >
                  <Download size={15} weight="bold" />
                  {t(locale, "result.download")}
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="download-zip"
            onClick={onDownloadZip}
            disabled={zipping}
            className="mt-6 w-full rounded-[6px] bg-[#007bff] py-4 text-base font-bold text-white transition hover:bg-[#0257bf] disabled:opacity-50"
          >
            <Download size={17} weight="bold" className="mr-2 inline" />
            {t(locale, "result.download_all")}
          </button>
        </>
      )}

      {errored.length > 0 && (
        <div className="mt-5 space-y-2">
          {errored.map((item) => (
            <p
              key={item.id}
              role="alert"
              className="flex items-center gap-2 rounded-[4px] bg-[#d33]/10 px-4 py-2.5 text-sm font-normal text-[#d33]"
            >
              <WarningCircle size={17} weight="fill" className="shrink-0" />
              <span className="truncate font-medium">{item.file.name}:</span> {item.error}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
