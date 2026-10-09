import { useCallback, useRef, useState } from "react";
import { X, WarningCircle } from "@phosphor-icons/react";
import { t } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";
import { formatBytes } from "../../lib/image/filenames";
import type { QueueItem } from "./ResultPanel";

interface DropzoneProps {
  locale: Locale;
  onFiles: (files: File[]) => void;
  items: QueueItem[];
  onRemove: (id: string) => void;
  processing: boolean;
  error: string | null;
}

/** Original upload-arrow mark drawn for ShrinkIt. */
function UploadMark() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden="true">
      <path d="M55 80V32" stroke="#016df0" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M34 53l21-21 21 21"
        stroke="#016df0"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 92h62" stroke="#016df0" strokeWidth="7" strokeLinecap="round" />
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
      className="relative mx-auto w-full max-w-[1100px] cursor-pointer rounded-[6px] bg-[#fafcff] px-6 py-12 text-center transition"
    >
      {/* Dashed border drawn as an SVG rect (reference style) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect
          x="2"
          y="2"
          rx="6"
          fill="none"
          stroke="#52A0FF"
          strokeWidth={dragging ? 3.5 : 2}
          strokeDasharray="6 12"
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
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1d2939] px-5 py-2 text-sm font-normal text-white shadow-lg">
          <span className="dots">{t(locale, "dropzone.processing")}</span>
        </div>
      )}

      <div className="flex flex-col items-center">
        <UploadMark />
        <p className="mt-6 text-[1.4em] font-medium text-black">
          {t(locale, "dropzone.title_a")}{" "}
          <span className="text-[#016df0] hover:underline">{t(locale, "dropzone.browse")}</span>
        </p>
        <span className="mt-6 inline-block rounded-[6px] bg-[#007bff] px-[30px] py-[18px] text-base font-bold text-white transition hover:bg-[#0257bf]">
          {t(locale, "dropzone.select")}
        </span>
      </div>

      {items.length > 0 && (
        <div
          className="mt-10 flex flex-wrap justify-center gap-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`thumb-${item.id}`}
              className="relative w-[140px] rounded-[6px] border border-[#52a0ff] bg-white transition duration-150 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(1,109,240,0.18)]"
            >
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`${t(locale, "result.remove")}: ${item.file.name}`}
                className="absolute right-1 top-1 z-10 rounded-full bg-white/95 p-1 text-[#667085] shadow-sm transition hover:text-[#d33]"
              >
                <X size={14} weight="bold" />
              </button>
              <div className="flex h-[110px] w-[138px] items-center justify-center overflow-hidden rounded-t-[5px] bg-[#fafcff]">
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-2 text-left">
                <p
                  className="clamp-2 text-xs font-normal leading-snug text-black"
                  title={item.file.name}
                >
                  {item.file.name}
                </p>
                <p className="mt-1 text-[11px] font-light text-[#667085]">
                  {item.dims ? `${item.dims.width}×${item.dims.height} · ` : ""}
                  {formatBytes(item.file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 rounded-[6px] bg-[#d33] px-4 py-3 text-sm font-normal text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
