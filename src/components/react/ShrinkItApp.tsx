import { useCallback, useEffect, useRef, useState } from "react";
import { Stop, Trash } from "@phosphor-icons/react";
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
import ResultPanel, { type QueueItem } from "./ResultPanel";

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

/** Read dimensions without fully processing — for the thumbnail strip. */
async function probeDims(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close();
    return dims;
  } catch {
    return null;
  }
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
  const [settings, setSettings] = useState<SettingsState>({
    width: "70",
    height: "70",
    unit: "percent",
    dpi: "72",
    format: "jpeg",
    quality: "90",
    background: "white",
    preserveExif: false,
    resizeMode: "stretch",
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
  }, []);

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
      let fresh: QueueItem[] = [];
      setItems((prev) => {
        const room = MAX_BATCH - prev.length;
        const take = accepted.slice(0, Math.max(0, room));
        if (accepted.length > take.length) {
          rejected = t(locale, "errors.too_many", { max: MAX_BATCH });
        }
        fresh = take.map((file) => ({
          id: nextId(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued" as const,
          background: "white" as const,
        }));
        return [...prev, ...fresh];
      });
      // Fill in dimensions asynchronously for the thumbnail strip.
      for (const item of fresh) {
        void probeDims(item.file).then((dims) => {
          if (dims) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, dims } : i)));
          }
        });
      }
      if (rejected) setFormError(rejected);
    },
    [locale],
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
    const qualityApplies = settings.format === "jpeg" || settings.format === "webp";
    const quality = qualityApplies
      ? Math.min(100, Math.max(0, Math.round(Number(settings.quality) || 0)))
      : 100;
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
      mode: settings.resizeMode,
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
    <div className="mx-auto w-full max-w-[1100px] px-4">
      <Dropzone
        locale={locale}
        onFiles={addFiles}
        items={items}
        onRemove={removeItem}
        processing={running}
        error={formError}
      />

      {items.length > 0 && (
        <>
          <SettingsPanel
            locale={locale}
            settings={settings}
            onChange={patchSettings}
            disabled={running}
          />

          <div className="mx-auto mt-6 w-full max-w-[1100px]">
            <button
              type="button"
              data-testid="process-button"
              onClick={runAll}
              disabled={running || queuedCount === 0}
              className="w-full rounded-[6px] bg-[#007bff] py-4 text-base font-bold text-white transition hover:bg-[#0257bf] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running
                ? t(locale, "settings.processing")
                : items.length > 1
                  ? t(locale, "settings.process_many")
                  : t(locale, "settings.process_one")}
            </button>
            <div className="mt-3 flex justify-center gap-3">
              {running && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex items-center gap-2 rounded-[6px] border border-[#667085] px-5 py-2 text-sm font-normal text-black transition hover:border-[#d33] hover:text-[#d33]"
                >
                  <Stop size={15} weight="fill" /> {t(locale, "settings.stop")}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-[6px] border border-[#667085] px-5 py-2 text-sm font-normal text-black transition hover:border-[#d33] hover:text-[#d33]"
              >
                <Trash size={15} /> {t(locale, "result.clear")}
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1100px]">
            <ResultPanel
              locale={locale}
              items={items}
              onDownload={downloadItem}
              onRemove={removeItem}
              onDownloadZip={downloadZip}
              zipping={zipping}
            />
          </div>

          {doneCount === items.length && doneCount > 0 && !running && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-[6px] border border-[#1a7af7] px-6 py-2.5 text-sm font-medium text-[#1a7af7] transition hover:bg-[#1a7af7] hover:text-white"
              >
                {t(locale, "result.new_image")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
