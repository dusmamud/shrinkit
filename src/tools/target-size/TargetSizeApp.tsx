import { useState, useRef, useCallback } from "react";
import { compressToTargetKb, type CompressionResult } from "./targetCompressor";
import {
  UploadSimple,
  DownloadSimple,
  CheckCircle,
  FileArrowDown,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";

interface TargetSizeAppProps {
  initialTargetKb?: number;
  title?: string;
  subtitle?: string;
}

export default function TargetSizeApp({
  initialTargetKb = 50,
  title = "Compress Image to Exact KB",
  subtitle = "Reduce image file size below strict limits for government exam portals, job forms, and visas without losing clarity.",
}: TargetSizeAppProps) {
  const [targetKb, setTargetKb] = useState<number>(initialTargetKb);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const TARGET_PRESETS = [20, 50, 100, 200, 500];

  const handleFileChange = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(file);
      setResult(null);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Auto compress immediately on upload
      setProcessing(true);
      try {
        const res = await compressToTargetKb(file, { targetKb });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Compression failed");
      } finally {
        setProcessing(false);
      }
    },
    [targetKb],
  );

  const handleTargetChange = async (newKb: number) => {
    setTargetKb(newKb);
    if (selectedFile) {
      setProcessing(true);
      setError(null);
      try {
        const res = await compressToTargetKb(selectedFile, { targetKb: newKb });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Compression failed");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.dataUrl) URL.revokeObjectURL(result.dataUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-medium text-taccent mb-3">
          <Sparkle size={14} weight="fill" />
          <span>100% In-Browser & Private — No Server Uploads</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-tink mb-3">{title}</h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-tmuted">{subtitle}</p>
      </div>

      {/* Target KB Preset Chips */}
      <div className="mb-8 flex flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium text-tink">Choose Target Maximum File Size:</label>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TARGET_PRESETS.map((kb) => (
            <button
              key={kb}
              type="button"
              onClick={() => handleTargetChange(kb)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition cursor-pointer ${
                targetKb === kb
                  ? "bg-taccent text-white shadow-sm scale-105"
                  : "border border-tinputline bg-tsurface text-tink hover:border-taccent hover:bg-tsurface2"
              }`}
            >
              &lt; {kb} KB
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-xs text-tmuted">Custom:</span>
            <input
              type="number"
              min="5"
              max="50000"
              value={targetKb}
              onChange={(e) => handleTargetChange(Math.max(5, Number(e.target.value) || 5))}
              className="h-[36px] w-[75px] rounded-[6px] border border-tinputline bg-tinputbg px-2 text-center text-sm font-medium text-tink outline-none focus:border-taccent"
            />
            <span className="text-xs font-semibold text-tink">KB</span>
          </div>
        </div>
      </div>

      {/* Main Upload / Dropzone */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-tinputline bg-tsurface p-10 text-center transition hover:border-taccent hover:bg-tsurface2 cursor-pointer shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-taccent/10 text-taccent">
            <UploadSimple size={32} weight="bold" />
          </div>
          <p className="text-lg font-semibold text-tink mb-1">
            Drop your image here, or <span className="text-taccent underline">browse</span>
          </p>
          <p className="text-xs text-tmuted">
            Supports JPG, PNG, WebP up to 50MB. Target ceiling:{" "}
            <span className="font-semibold text-tink">&lt; {targetKb} KB</span>
          </p>
        </div>
      ) : (
        /* Result & Comparison Card */
        <div className="rounded-2xl border border-tinputline bg-tsurface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Image Preview */}
            <div className="relative w-full max-w-[280px] shrink-0 overflow-hidden rounded-xl border border-tinputline bg-tsurface2 shadow-inner aspect-square flex items-center justify-center">
              {result?.dataUrl ? (
                <img
                  src={result.dataUrl}
                  alt="Compressed output"
                  className="h-full w-full object-contain"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Original input"
                  className="h-full w-full object-contain opacity-60"
                />
              ) : null}

              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
                  Optimizing to {targetKb} KB...
                </div>
              )}
            </div>

            {/* Metrics & Actions */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between border-b border-tinputline pb-3">
                <span className="text-sm font-semibold text-tink truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-xs text-tmuted hover:text-terror transition cursor-pointer"
                >
                  <Trash size={14} />
                  <span>Remove</span>
                </button>
              </div>

              {/* Size Comparison Badge */}
              {result && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-tsurface2 p-4 border border-tinputline">
                  <div>
                    <span className="block text-xs text-tmuted">Original File</span>
                    <span className="text-base font-semibold text-tink">
                      {formatBytes(result.originalBytes)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-tmuted">Target Output</span>
                    <span className="text-base font-bold text-taccent">
                      {formatBytes(result.outputBytes)}
                    </span>
                    <span className="ml-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      (
                      -{Math.round((1 - result.outputBytes / result.originalBytes) * 100)}
                      %)
                    </span>
                  </div>
                </div>
              )}

              {result && (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={16} weight="fill" />
                  <span>
                    Guaranteed strictly under {targetKb} KB ({result.outputBytes.toLocaleString()}{" "}
                    bytes). Optimal clarity preserved.
                  </span>
                </div>
              )}

              {error && <p className="text-xs font-medium text-terror">{error}</p>}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {result?.dataUrl && (
                  <a
                    href={result.dataUrl}
                    download={`shrinkit-${targetKb}kb-${selectedFile.name.replace(/\.[^.]+$/, "")}.jpg`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-tbtna px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf] cursor-pointer"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Download Compressed Image</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-tinputline px-4 py-3 text-sm font-medium text-tink hover:bg-tsurface2 transition cursor-pointer"
                >
                  <FileArrowDown size={18} />
                  <span>Change Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO & FAQ Information Section */}
      <div className="mt-16 rounded-2xl border border-tinputline bg-tsurface p-8">
        <h2 className="text-xl font-bold text-tink mb-4">
          Why use ShrinkIt Exact KB Compressor?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-tmuted">
          <div>
            <h3 className="font-semibold text-tink mb-1">Government Portals Ready</h3>
            <p>
              Meets exact 20KB, 50KB, and 100KB upload requirements for UPSC, SSC, IBPS, Banking,
              and state portal applications.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-tink mb-1">100% Private In-Browser</h3>
            <p>
              Your personal ID photos, signatures, and certificates never touch any external server.
              Processing happens entirely in your browser sandbox.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-tink mb-1">Maximum Sharpness</h3>
            <p>
              Uses multi-pass binary search to target the highest possible visual clarity right below
              your specified byte ceiling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
