import { useState, useCallback, useEffect } from "react";
import {
  Check,
  Copy,
  Download,
  FileImage,
  Trash,
  WarningCircle,
  CaretDown,
} from "@phosphor-icons/react";
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

/**
 * Copy an image blob to clipboard using modern Async Clipboard API.
 * Converts to PNG if browser requires PNG for clipboard images.
 */
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    !("write" in navigator.clipboard)
  ) {
    return false;
  }
  try {
    // If already PNG or SVG and supported, write directly
    if (blob.type === "image/png") {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    }

    // Convert non-PNG formats (e.g. JPG, WebP) to PNG blob for standard clipboard support
    const imgBitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(imgBitmap, 0, 0);
    imgBitmap.close();

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!pngBlob) return false;

    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    return true;
  } catch (err) {
    console.error("[ShrinkIt] Failed to copy image to clipboard:", err);
    return false;
  }
}

function SizeLine({ locale, item }: { locale: Locale; item: QueueItem }) {
  const r = item.result;
  if (!r) return null;
  const saved = percentSaved(r.originalBytes, r.outputBytes);
  return (
    <p className="text-xs font-light text-tmuted">
      {r.width}×{r.height} · {formatBytes(r.outputBytes)}{" "}
      <span className={saved >= 0 ? "text-tsuccess" : "text-twarning"}>
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Close dropdown menu when clicking anywhere outside
  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenId]);

  const handleCopy = useCallback(async (item: QueueItem) => {
    if (!item.result) return;
    const blob = new Blob([item.result.data.buffer as ArrayBuffer], {
      type: item.result.format === "png" ? "image/png" : "image/jpeg",
    });
    const success = await copyImageToClipboard(blob);
    if (success) {
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const done = items.filter((i) => i.status === "done" && i.result);
  const errored = items.filter((i) => i.status === "error");
  if (done.length === 0 && errored.length === 0) return null;
  const multi = done.length > 1;

  return (
    <section
      data-testid="result-panel"
      className="mt-10 mx-auto w-full max-w-[850px] px-3 sm:px-4 text-center"
      aria-live="polite"
    >
      <h3 className="text-center text-[1.625rem] sm:text-[2rem] font-medium text-tink mb-6">
        {t(locale, "result.title")}
      </h3>

      {!multi && (
        <div className="flex flex-col items-center">
          {done.map((item) => (
            <div
              key={item.id}
              data-testid={`result-row-${item.id}`}
              className="flex flex-col items-center w-full max-w-[540px]"
            >
              {/* Prominent Image Preview - Unboxed & Centered */}
              {item.resultUrl ? (
                <div className="relative group max-w-full overflow-hidden rounded-[12px] border border-tlinesoft checkerboard bg-tthumb p-2 shadow-sm transition hover:shadow-md">
                  <img
                    src={item.resultUrl}
                    alt={item.result!.fileName}
                    className="mx-auto max-h-[280px] sm:max-h-[360px] w-auto max-w-full object-contain rounded-[8px]"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-[12px] border border-tlinesoft bg-tthumb">
                  <FileImage size={48} className="text-taccent" weight="light" />
                </div>
              )}

              {/* File details */}
              <div className="mt-4 text-center max-w-full px-2">
                <p
                  className="truncate text-base sm:text-lg font-semibold text-tink"
                  title={item.result!.fileName}
                >
                  {item.result!.fileName}
                </p>
                <div className="mt-1 flex items-center justify-center">
                  <SizeLine locale={locale} item={item} />
                </div>
              </div>

              {/* Action Buttons: Unified Split Download + Dropdown for Copy */}
              <div className="mt-5 flex items-center justify-center gap-3 w-full max-w-[340px]">
                <div className="relative flex flex-1 items-stretch rounded-[8px] shadow-sm">
                  {/* Main Download Button */}
                  <button
                    type="button"
                    data-testid={`download-${item.id}`}
                    onClick={() => onDownload(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-l-[8px] bg-tbtna px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition hover:bg-[#0257bf] active:scale-[0.99]"
                  >
                    <Download size={18} weight="bold" className="shrink-0" />
                    <span>{t(locale, "result.download")}</span>
                  </button>

                  {/* Right side divider */}
                  <div className="w-[1px] bg-white/25" />

                  {/* Down Arrow Dropdown Toggle */}
                  <button
                    type="button"
                    data-testid={`split-dropdown-${item.id}`}
                    aria-label={t(locale, "result.copy")}
                    aria-expanded={menuOpenId === item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === item.id ? null : item.id);
                    }}
                    className="inline-flex items-center justify-center rounded-r-[8px] bg-tbtna px-3.5 py-3.5 text-white transition hover:bg-[#0257bf] active:scale-[0.99]"
                  >
                    <CaretDown
                      size={16}
                      weight="bold"
                      className={`transition-transform duration-200 ${menuOpenId === item.id ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu (Copy to Clipboard) */}
                  {menuOpenId === item.id && (
                    <div
                      className="absolute right-0 top-full mt-2 z-30 w-52 rounded-[8px] border border-tlinesoft bg-tsurface p-1.5 shadow-xl animate-in fade-in zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        data-testid={`copy-${item.id}`}
                        onClick={() => {
                          handleCopy(item);
                          setTimeout(() => setMenuOpenId(null), 1200);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-[6px] px-3.5 py-2.5 text-sm font-medium transition ${
                          copiedId === item.id
                            ? "bg-tsuccessbg text-tsuccess font-semibold"
                            : "text-tink hover:bg-thoverbg"
                        }`}
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check size={18} weight="bold" className="text-tsuccess" />
                            <span>{t(locale, "result.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={18} weight="regular" />
                            <span>{t(locale, "result.copy")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove / Clear single image button */}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                  className="shrink-0 rounded-full p-2.5 text-tmuted transition hover:bg-ttrashhover hover:text-terror"
                  title={t(locale, "result.remove")}
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
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {done.map((item) => (
              <div
                key={item.id}
                data-testid={`result-card-${item.id}`}
                className="relative flex flex-col justify-between rounded-[8px] border border-tlinesoft bg-tsurface p-2.5 sm:p-3 text-center shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                  className="absolute right-1 top-1 z-10 rounded-full bg-tsurface/90 p-1.5 text-tmuted shadow-sm transition hover:text-terror hover:bg-ttrashhover"
                >
                  <Trash size={14} />
                </button>
                <div>
                  {item.resultUrl ? (
                    <div className="checkerboard bg-tthumb rounded-[6px] overflow-hidden">
                      <img
                        src={item.resultUrl}
                        alt={item.result!.fileName}
                        className="mx-auto max-h-[120px] sm:max-h-[155px] w-auto max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-[120px] items-center justify-center bg-tthumb rounded-[6px]">
                      <FileImage size={36} className="text-taccent" weight="light" />
                    </div>
                  )}
                  <p
                    className="clamp-2 mt-2 text-xs font-medium text-tink break-words"
                    title={item.result!.fileName}
                  >
                    {item.result!.fileName}
                  </p>
                  <p className="mt-0.5 text-[11px] font-light text-tmuted">
                    {formatBytes(item.result!.outputBytes)}
                  </p>
                </div>
                {/* 2x Grid action buttons - non-overlapping flex layout */}
                <div className="mt-3 flex items-stretch gap-1.5 w-full min-w-0">
                  <button
                    type="button"
                    data-testid={`download-${item.id}`}
                    onClick={() => onDownload(item)}
                    className="inline-flex flex-1 min-w-0 items-center justify-center gap-1 rounded-[6px] bg-tbtna px-2 py-2 text-xs font-semibold text-white transition hover:bg-[#0257bf] active:scale-95"
                    title={t(locale, "result.download")}
                  >
                    <Download size={14} weight="bold" className="shrink-0" />
                    <span className="truncate">{t(locale, "result.download")}</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`copy-${item.id}`}
                    onClick={() => handleCopy(item)}
                    title={
                      copiedId === item.id ? t(locale, "result.copied") : t(locale, "result.copy")
                    }
                    className={`inline-flex shrink-0 items-center justify-center rounded-[6px] border px-2 py-2 text-xs font-medium transition active:scale-95 ${
                      copiedId === item.id
                        ? "border-tsuccessline bg-tsuccessbg text-tsuccess"
                        : "border-tline bg-tsurface text-toptiontext hover:bg-thoverbg hover:text-taccent"
                    }`}
                  >
                    {copiedId === item.id ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <Copy size={14} weight="regular" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="download-zip"
            onClick={onDownloadZip}
            disabled={zipping}
            className="mt-6 w-full rounded-[6px] bg-tbtnb py-4 text-base font-bold text-white transition hover:bg-[#0257bf] disabled:opacity-50"
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
              className="flex items-center gap-2 rounded-[4px] bg-terror/10 px-4 py-2.5 text-sm font-normal text-terror"
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
