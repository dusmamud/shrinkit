import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { t } from "../../lib/i18n";
import {
  ImageProcessor,
  ProcessError,
  type ProcessedImage,
  type ProcessSettings,
} from "../../lib/image/process";
import {
  FORMAT_MIME,
  isSupportedInputFile,
  isSupportedInputFileName,
} from "../../lib/image/filenames";
import type { Locale } from "../../lib/locales";
import Dropzone from "./Dropzone";
import SettingsPanel, { type SettingsState } from "./SettingsPanel";
import ResultPanel, { type QueueItem } from "./ResultPanel";
import { getDefaultDimensionsForUnit } from "../../lib/image/units";
import { decodeHeicToPixels, isBmffImage, isHeicBytes } from "../../lib/image/heic";
import { MAX_BATCH, UNIT_LIMITS, DPI_LIMITS, QUALITY_LIMITS } from "../../lib/image/limits";

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

/** Render a small JPEG thumbnail from a decoded bitmap. */
async function renderThumbnailUrl(bmp: ImageBitmap, maxSide: number): Promise<string> {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bmp, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8),
  );
  return blob ? URL.createObjectURL(blob) : "";
}

/**
 * Read dimensions without fully processing — for the thumbnail strip.
 * HEIC files also get a rendered JPEG thumbnail, because a raw HEIC
 * blob URL cannot display in an `<img>` on Chrome / Firefox.
 */
async function probeDims(
  file: File,
): Promise<{ width: number; height: number; thumbnailUrl?: string } | null> {
  try {
    // Sniff only the first bytes — no need to read the whole file.
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    if (isHeicBytes(head) || isBmffImage(head)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { width, height, data } = await decodeHeicToPixels(bytes);
      const bmp = await createImageBitmap(new ImageData(data, width, height));
      const thumbnailUrl = await renderThumbnailUrl(bmp, 320);
      bmp.close();
      return { width, height, thumbnailUrl: thumbnailUrl || undefined };
    }
  } catch {
    // Fall through to the normal probe below.
  }

  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    }
  } catch {
    // Fall back to Image element
  }

  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dims = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
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
    resizeMode: "stretch",
  });
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [zipping, setZipping] = useState(false);

  const processorRef = useRef<ImageProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check browser canvas & file support (matching reduceimages.com isBrowserSupported)
    try {
      const canvas = document.createElement("canvas");
      const canvasOk = !!(canvas.getContext && canvas.getContext("2d"));
      const fileOk = typeof window !== "undefined" && typeof window.FileReader !== "undefined";
      if (!canvasOk || !fileOk) {
        setBrowserSupported(false);
      }
    } catch {
      setBrowserSupported(false);
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept paste if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const files: File[] = [];

      // 1. Check e.clipboardData.files
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        for (const file of Array.from(e.clipboardData.files)) {
          if (file.type.startsWith("image/") || isSupportedInputFileName(file.name)) {
            files.push(file);
          }
        }
      }

      // 2. Check e.clipboardData.items for pasted screenshots/blobs (e.g. from Snipping Tool / PrtScn)
      if (files.length === 0 && e.clipboardData?.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith("image/")) {
            const blob = item.getAsFile();
            if (blob) {
              const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
              const namedFile = new File([blob], `pasted-image-${Date.now()}.${ext}`, {
                type: blob.type,
              });
              files.push(namedFile);
            }
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
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
    // When any setting is updated, if items were previously 'done', mark them 'queued' so re-resize is immediately available
    setItems((prev) =>
      prev.map((i) => (i.status === "done" ? { ...i, status: "queued" as const } : i)),
    );
  }, []);

  // Presets from the Formats section (FormatPresets.astro) arrive as a
  // "shrinkit:apply-preset" event: { format } or { width, height, unit }.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as Partial<SettingsState> | undefined;
      if (!detail || typeof detail !== "object") return;
      const patch: Partial<SettingsState> = {};
      if (typeof detail.format === "string") {
        patch.format = detail.format as SettingsState["format"];
      }
      if (typeof detail.width === "string") patch.width = detail.width;
      if (typeof detail.height === "string") patch.height = detail.height;
      if (typeof detail.unit === "string") patch.unit = detail.unit as SettingsState["unit"];
      if (Object.keys(patch).length > 0) patchSettings(patch);
    };
    window.addEventListener("shrinkit:apply-preset", handler);
    return () => window.removeEventListener("shrinkit:apply-preset", handler);
  }, [patchSettings]);

  const addFiles = useCallback(
    (files: File[]) => {
      setFormError(null);
      setFailedFiles([]);
      const accepted: File[] = [];
      const rejectedNames: string[] = [];
      for (const f of files) {
        if (!isSupportedInputFile(f)) {
          rejectedNames.push(f.name);
          continue;
        }
        accepted.push(f);
      }
      if (rejectedNames.length > 0) {
        setFailedFiles(rejectedNames);
        setFormError(
          rejectedNames.length === 1
            ? t(locale, "errors.unsupported", { name: rejectedNames[0] })
            : t(locale, "errors.unsupported_many"),
        );
      }
      const room = MAX_BATCH - itemsRef.current.length;
      const take = accepted.slice(0, Math.max(0, room));
      if (accepted.length > take.length) {
        setFormError(t(locale, "errors.too_many", { max: MAX_BATCH }));
      }
      const fresh: QueueItem[] = take.map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued" as const,
        background: "white" as const,
      }));
      setItems((prev) => [...prev, ...fresh]);

      // Fill in dimensions asynchronously for thumbnail strip and calculations.
      for (let idx = 0; idx < fresh.length; idx++) {
        const item = fresh[idx];
        const isFirst = itemsRef.current.length === 0 && idx === 0;
        void probeDims(item.file).then((probed) => {
          if (probed) {
            const dims = { width: probed.width, height: probed.height };
            setItems((prev) =>
              prev.map((i) => {
                if (i.id !== item.id) return i;
                // HEIC thumbnails are rendered JPEGs — swap the raw blob
                // URL (which <img> cannot display) for the rendered one.
                if (probed.thumbnailUrl) URL.revokeObjectURL(i.previewUrl);
                return {
                  ...i,
                  dims,
                  previewUrl: probed.thumbnailUrl ?? i.previewUrl,
                };
              }),
            );
            if (isFirst) {
              setSettings((prev) => {
                if (prev.unit !== "percent") {
                  const def = getDefaultDimensionsForUnit(prev.unit, dims, Number(prev.dpi) || 72);
                  return { ...prev, width: def.width, height: def.height };
                }
                return prev;
              });
            }
          }
        });
      }
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
    setFailedFiles([]);
  }, []);

  const toProcessSettings = useCallback((): ProcessSettings => {
    const width = Number(settings.width);
    const height = Number(settings.height);
    const dpi = Number(settings.dpi);
    const qualityApplies = settings.format === "jpeg" || settings.format === "webp";
    const quality = qualityApplies
      ? Math.min(100, Math.max(1, Math.round(Number(settings.quality) || 0)))
      : 100;

    const unitLimit = UNIT_LIMITS[settings.unit];
    if (!Number.isFinite(width) || width < unitLimit.min || width > unitLimit.max) {
      throw new Error(
        t(locale, "errors.width_limit", {
          min: `${unitLimit.min}${unitLimit.suffix}`,
          max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
        }),
      );
    }
    if (!Number.isFinite(height) || height < unitLimit.min || height > unitLimit.max) {
      throw new Error(
        t(locale, "errors.height_limit", {
          min: `${unitLimit.min}${unitLimit.suffix}`,
          max: `${unitLimit.max.toLocaleString()}${unitLimit.suffix}`,
        }),
      );
    }
    if (
      settings.format !== "gif" &&
      (!Number.isFinite(dpi) || dpi < DPI_LIMITS.min || dpi > DPI_LIMITS.max)
    ) {
      throw new Error(t(locale, "errors.dpi_limit"));
    }
    if (qualityApplies) {
      const qNum = Number(settings.quality);
      if (!Number.isFinite(qNum) || qNum < QUALITY_LIMITS.min || qNum > QUALITY_LIMITS.max) {
        throw new Error(t(locale, "errors.quality_limit"));
      }
    }

    return {
      width,
      height,
      unit: settings.unit,
      dpi,
      format: settings.format,
      quality,
      background: settings.background,
      mode: settings.resizeMode,
    };
  }, [locale, settings]);

  const runAll = useCallback(async () => {
    let queue = itemsRef.current.filter((i) => i.status === "queued");
    // If all items are 'done' (or no items are currently queued), re-queue all items so re-resize works
    if (queue.length === 0 && itemsRef.current.length > 0) {
      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          status: "queued" as const,
          error: undefined,
        })),
      );
      queue = itemsRef.current.map((i) => ({
        ...i,
        status: "queued" as const,
        error: undefined,
      }));
    }
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
        // Revoke prior resultUrl before allocating a new one
        if (item.resultUrl) {
          URL.revokeObjectURL(item.resultUrl);
        }
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
          console.error(`[ShrinkIt] Error processing ${item.file.name}:`, err);
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
      // Auto smooth scroll to the results section (matching ReduceImages behavior)
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          if (resultRef.current) {
            const prefersReduced =
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const rect = resultRef.current.getBoundingClientRect();
            // Only scroll when the results are not already fully visible —
            // otherwise the page yanks even though nothing needs revealing.
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
            const top = rect.top + window.scrollY - 30;
            window.scrollTo({ top, behavior: prefersReduced ? "auto" : "smooth" });
          }
        }, 120);
      });
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
    <div className="mx-auto w-full max-w-[960px] px-4">
      {!browserSupported && (
        <div
          id="unsupported_browser_message"
          role="alert"
          className="mx-auto mb-6 rounded-[6px] border border-tbannerline bg-tbannerbg p-4 text-center text-sm font-medium text-tbannertext"
        >
          {t(locale, "errors.browser_unsupported")}{" "}
          <a
            href="https://www.google.com/chrome"
            className="font-bold underline transition hover:text-tink"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>{" "}
          {t(locale, "errors.browser_unsupported_or")}{" "}
          <a
            href="http://mozilla.org/firefox/new"
            className="font-bold underline transition hover:text-tink"
            target="_blank"
            rel="noopener noreferrer"
          >
            Firefox
          </a>
          .
        </div>
      )}

      <Dropzone
        locale={locale}
        onFiles={addFiles}
        items={items}
        onRemove={removeItem}
        processing={running}
        error={formError}
        failedFiles={failedFiles}
        onDismissError={() => {
          setFormError(null);
          setFailedFiles([]);
        }}
      />

      {items.length > 0 && (
        <>
          <SettingsPanel
            locale={locale}
            settings={settings}
            onChange={patchSettings}
            disabled={running}
            originalSize={items[0]?.dims}
            onProcess={runAll}
            processing={running}
            queuedCount={queuedCount}
            itemCount={items.length}
            onClear={clearAll}
            onAbort={() => abortRef.current?.abort()}
          />

          <div ref={resultRef} className="mx-auto w-full max-w-[960px] scroll-mt-8">
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
                className="inline-flex items-center gap-2 rounded-[6px] border border-taccent2 px-6 py-2.5 text-sm font-medium text-taccent2 transition hover:bg-taccent2 hover:text-white"
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
