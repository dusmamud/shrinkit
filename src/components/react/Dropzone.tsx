import { useCallback, useRef, useState } from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import { t } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import { formatBytes } from "../../lib/image/filenames";
import { MAX_BATCH } from "../../lib/image/limits";
import type { QueueItem } from "./ResultPanel";

interface DropzoneProps {
  locale: Locale;
  onFiles: (files: File[]) => void;
  items: QueueItem[];
  onRemove: (id: string) => void;
  processing: boolean;
  error: string | null;
  failedFiles?: string[];
  onDismissError?: () => void;
}

/** Original upload-arrow mark drawn for ShrinkIt. */
function UploadMark() {
  return (
    <svg
      viewBox="0 0 110 110"
      fill="none"
      aria-hidden="true"
      className="h-8 w-8 sm:h-9 sm:w-9 text-taccent"
    >
      <path d="M55 80V32" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M34 53l21-21 21 21"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 92h62" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export default function Dropzone({
  locale,
  onFiles,
  items,
  onRemove,
  processing,
  error,
  failedFiles,
  onDismissError,
}: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list).filter((f) => f.size > 0);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t(locale, "dropzone.title")}
      data-testid="dropzone"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        emit(e.dataTransfer.files);
      }}
      className="group relative mx-auto w-full max-w-[940px] cursor-pointer rounded-2xl bg-tdropzone px-4 sm:px-8 py-6 sm:py-8 md:py-9 text-center transition hover:bg-thoverbg/30 shadow-sm"
    >
      {/* Dashed border drawn as an SVG rect (reference style) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="2"
          y="2"
          rx="14"
          fill="none"
          stroke="var(--t-dash)"
          strokeWidth={dragging ? 3.5 : 2}
          strokeDasharray="6 10"
          strokeLinecap="round"
          style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)" }}
        />
      </svg>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        data-testid="file-input"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />

      {processing && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-tpilldark px-5 py-2 text-sm font-normal text-white shadow-lg dark:border dark:border-tinputline">
          <span className="dots">{t(locale, "dropzone.processing")}</span>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-taccent/10 text-taccent transition duration-200 group-hover:scale-105">
          <UploadMark />
        </div>
        <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-semibold text-tink px-2">
          {t(locale, "dropzone.title_a")}{" "}
          <span className="text-taccent hover:underline">{t(locale, "dropzone.browse")}</span>
          <span className="text-xs sm:text-sm font-normal text-tmuted block sm:inline sm:ml-1 mt-1 sm:mt-0">
            {t(locale, "dropzone.paste_hint")}
          </span>
        </p>
        <span className="mt-3.5 sm:mt-5 inline-flex items-center justify-center w-full max-w-[240px] sm:w-auto rounded-[8px] bg-tbtnb px-7 py-3 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-[#0257bf] hover:shadow-md active:scale-95">
          {t(locale, "dropzone.select")}
        </span>
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 px-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tpillbg px-3.5 py-1 text-xs font-medium text-tpilltext border border-tpillline text-center">
            {t(locale, "dropzone.limits_info")}
          </span>
        </div>
      </div>

      {items.length > 0 && (
        <div
          className="mt-8 flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                items.length >= MAX_BATCH
                  ? "bg-terrorsoft text-terrorsofttext border-terrorsoftline"
                  : "bg-tsurface text-toptiontext border-tline shadow-sm"
              }`}
            >
              {items.length >= MAX_BATCH
                ? t(locale, "dropzone.batch_full", { max: MAX_BATCH })
                : t(locale, "dropzone.batch_count", { count: items.length, max: MAX_BATCH })}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`thumb-${item.id}`}
                className="relative w-[140px] rounded-[6px] border border-tdash bg-tsurface transition duration-150 hover:scale-[1.02] hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--t-accent)_18%,transparent)]"
              >
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                  className="absolute right-1 top-1 z-10 rounded-full bg-tsurface/95 p-1 text-tmuted shadow-sm transition hover:text-terror"
                >
                  <X size={14} weight="bold" />
                </button>
                <div className="flex h-[110px] w-[138px] items-center justify-center overflow-hidden rounded-t-[5px] checkerboard bg-tthumb">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-2 text-left">
                  <p
                    className="clamp-2 text-xs font-normal leading-snug text-tink"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </p>
                  <p className="mt-1 text-[11px] font-light text-tmuted">
                    {item.dims ? `${item.dims.width}×${item.dims.height} · ` : ""}
                    {formatBytes(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          id="error_message_offline"
          role="alert"
          className="mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-[6px] bg-[#d33] p-4 text-left text-sm text-white shadow-sm transition"
          onClick={(e) => e.stopPropagation()}
        >
          <WarningCircle size={22} weight="fill" className="shrink-0 text-white mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-white">
              {failedFiles && failedFiles.length > 1 ? t(locale, "errors.unsupported_many") : error}
            </div>
            {failedFiles && failedFiles.length > 0 && (
              <div id="failedFilesList" className="mt-1 font-mono text-xs text-terrbannerdim">
                {failedFiles.join(", ")}
              </div>
            )}
            {failedFiles && failedFiles.length > 0 && error && !error.includes(failedFiles[0]) && (
              <div className="mt-1 text-xs text-terrbannerdim">{error}</div>
            )}
          </div>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label={t(locale, "errors.dismiss")}
              className="text-terrbanner hover:text-black dark:hover:text-white transition"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
