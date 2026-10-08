import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Stop, FolderOpen, Download, Trash, ShieldCheck } from "@phosphor-icons/react";
import JSZip from "jszip";
import { t } from "../../lib/i18n";
import {
  ImageProcessor,
  ProcessError,
  type ProcessedImage,
  type ProcessSettings,
} from "../../lib/image/process";
import { FORMAT_MIME, isSupportedInputFileName } from "../../lib/image/filenames";
import type { Locale } from "../../lib/locales";
import Dropzone from "./Dropzone";
import SettingsPanel, { type SettingsState } from "./SettingsPanel";
import ResultCard, { type QueueItem } from "./ResultCard";

const MAX_BATCH = 50;

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `img-${Date.now().toString(36)}-${idCounter}`;
}

function triggerDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function errorMessageFor(locale: Locale, err: unknown, fileName: string): string {
  if (err instanceof ProcessError) {
    switch (err.code) {
      case "decode-failed":
        return t(locale, "errors.corrupt");
      case "too-large":
        return t(locale, "errors.too_large");
      case "invalid-size":
        return t(locale, "errors.invalid_size");
      case "aborted":
        return t(locale, "errors.aborted");
      default:
        return t(locale, "errors.generic");
    }
  }
  if (err instanceof Error && /not a supported/i.test(err.message)) {
    return t(locale, "errors.unsupported", { name: fileName });
  }
  return t(locale, "errors.generic");
}

interface ShrinkItAppProps {
  locale: Locale;
}

export default function ShrinkItApp({ locale }: ShrinkItAppProps) {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [settings, setSettings] = useState<SettingsState>({
    width: "70",
    height: "70",
    unit: "percent",
    dpi: "72",
    format: "jpeg",
    quality: "90",
    background: "white",
    preserveExif: false,
  });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const processorRef = useRef<ImageProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        addFiles(Array.from(files));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
      processorRef.current?.terminate();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
    };
    // addFiles is stable per mode; re-subscribing on mode change is intended.
  }, [mode]);

  const patchSettings = useCallback((patch: Partial<SettingsState>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setFormError(null);
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      setFormError(null);
      const accepted: File[] = [];
      let rejected: string | null = null;
      for (const f of files) {
        if (!isSupportedInputFileName(f.name)) {
          rejected = t(locale, "errors.unsupported", { name: f.name });
          continue;
        }
        accepted.push(f);
      }
      setItems((prev) => {
        const base = mode === "single" ? [] : prev;
        for (const old of mode === "single" ? prev : []) {
          URL.revokeObjectURL(old.previewUrl);
          if (old.resultUrl) URL.revokeObjectURL(old.resultUrl);
        }
        const room = MAX_BATCH - base.length;
        const take = accepted.slice(0, Math.max(0, room));
        if (accepted.length > take.length) {
          rejected = t(locale, "errors.too_many", { max: MAX_BATCH });
        }
        const fresh: QueueItem[] = take.map((file) => ({
          id: nextId(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued" as const,
          background: "white",
        }));
        return [...base, ...fresh];
      });
      if (rejected) setFormError(rejected);
    },
    [locale, mode],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    setItems((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      return [];
    });
    setRunning(false);
    setFormError(null);
  }, []);

  const toProcessSettings = useCallback((): ProcessSettings => {
    const width = Number(settings.width);
    const height = Number(settings.height);
    const dpi = Number(settings.dpi);
    const quality = Math.min(100, Math.max(0, Math.round(Number(settings.quality) || 0)));
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error(t(locale, "errors.invalid_size"));
    }
    if (!Number.isFinite(dpi) || dpi <= 0) {
      throw new Error(t(locale, "errors.invalid_size"));
    }
    return {
      width,
      height,
      unit: settings.unit,
      dpi,
      format: settings.format,
      quality,
      background: settings.background,
      preserveExif: settings.preserveExif,
    };
  }, [locale, settings]);

  const runAll = useCallback(async () => {
    const queue = itemsRef.current.filter((i) => i.status === "queued");
    if (queue.length === 0 || running) return;
    let procSettings: ProcessSettings;
    try {
      procSettings = toProcessSettings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t(locale, "errors.invalid_size"));
      return;
    }
    const processor = (processorRef.current ??= new ImageProcessor());
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    setFormError(null);
    try {
      for (const item of queue) {
        if (abort.signal.aborted) break;
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "processing" as const, background: procSettings.background }
              : i,
          ),
        );
        try {
          const result: ProcessedImage = await processor.process(
            item.file,
            procSettings,
            abort.signal,
          );
          const blob = new Blob([result.data.buffer as ArrayBuffer], {
            type: FORMAT_MIME[result.format],
          });
          const resultUrl = URL.createObjectURL(blob);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: "done" as const, result, resultUrl } : i,
            ),
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error" as const,
                    error: errorMessageFor(locale, err, item.file.name),
                  }
                : i,
            ),
          );
        }
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [locale, running, toProcessSettings]);

  const downloadItem = useCallback((item: QueueItem) => {
    if (!item.resultUrl || !item.result) return;
    // Fresh object URL so the card preview stays alive.
    const blob = new Blob([item.result.data.buffer as ArrayBuffer], {
      type: FORMAT_MIME[item.result.format],
    });
    triggerDownload(URL.createObjectURL(blob), item.result.fileName);
  }, []);

  const downloadZip = useCallback(async () => {
    const done = itemsRef.current.filter((i) => i.status === "done" && i.result);
    if (done.length === 0 || zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const item of done) {
        zip.file(item.result!.fileName, item.result!.data);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(URL.createObjectURL(blob), "shrinkit-images.zip");
    } finally {
      setZipping(false);
    }
  }, [zipping]);

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* mode toggle */}
      <div
        className="mb-4 inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
        role="tablist"
        aria-label="Mode"
      >
        {(["single", "batch"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            data-testid={`mode-${value}`}
            onClick={() => setMode(value)}
            className={[
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              mode === value
                ? "bg-teal-600 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
            ].join(" ")}
          >
            {t(locale, value === "single" ? "mode.single" : "mode.batch")}
          </button>
        ))}
      </div>
      <p className="mb-6 -mt-3 text-xs text-slate-400 dark:text-slate-500">
        {t(locale, mode === "single" ? "mode.single_hint" : "mode.batch_hint")}
      </p>

      <Dropzone
        locale={locale}
        onFiles={addFiles}
        multiple={mode === "batch"}
        compact={items.length > 0}
      />

      {formError && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <SettingsPanel
              locale={locale}
              settings={settings}
              onChange={patchSettings}
              disabled={running}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="process-button"
                onClick={runAll}
                disabled={running || queuedCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={16} weight="fill" />
                {running
                  ? t(locale, "result.processing")
                  : `${t(locale, "settings.process")} (${queuedCount})`}
              </button>
              {running && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Stop size={16} weight="fill" /> Stop
                </button>
              )}
              <div className="flex gap-2">
                {doneCount > 1 && (
                  <button
                    type="button"
                    data-testid="download-zip"
                    onClick={downloadZip}
                    disabled={zipping}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <FolderOpen size={16} />
                    {t(locale, "result.download_all")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Trash size={16} /> {t(locale, "result.clear")}
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <ShieldCheck size={14} className="text-teal-600" />
                {t(locale, "hero.badge")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <ResultCard
                key={item.id}
                locale={locale}
                item={item}
                onDownload={downloadItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && doneCount === items.length && !running && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-full border border-teal-600 px-6 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
          >
            <Download size={16} /> {t(locale, "result.new_image")}
          </button>
        </div>
      )}
    </div>
  );
}
