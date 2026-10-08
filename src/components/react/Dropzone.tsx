import { useCallback, useRef, useState } from "react";
import { CloudArrowUp, Images } from "@phosphor-icons/react";
import { t } from "../../lib/i18n";
import type { Locale } from "../../lib/locales";

interface DropzoneProps {
  locale: Locale;
  onFiles: (files: File[]) => void;
  multiple: boolean;
  compact?: boolean;
}

/**
 * Drag & drop + file picker. The <input> is screen-reader-only but the
 * whole zone is a labelled button, so it stays keyboard-accessible
 * (automation can target it via data-testid="file-input").
 */
export default function Dropzone({ locale, onFiles, multiple, compact }: DropzoneProps) {
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
      className={[
        "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition",
        compact ? "px-4 py-6" : "px-6 py-12",
        dragging
          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40"
          : "border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-500 dark:hover:bg-teal-950/30",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        data-testid="file-input"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
        {multiple ? <Images size={24} /> : <CloudArrowUp size={24} />}
      </span>
      <p className="text-base font-semibold text-slate-900 dark:text-white">
        {t(locale, "dropzone.title")}
      </p>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {t(locale, "dropzone.subtitle")}
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
        {t(locale, "dropzone.browse")}
      </span>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        {t(locale, "dropzone.formats")}
      </p>
      {!compact && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {t(locale, "dropzone.paste_hint")}
        </p>
      )}
    </div>
  );
}
