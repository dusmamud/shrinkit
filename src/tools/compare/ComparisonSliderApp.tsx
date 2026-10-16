import { useState, useRef, useCallback } from "react";
import { UploadSimple, SlidersHorizontal, Trash, FileArrowDown } from "@phosphor-icons/react";

export default function ComparisonSliderApp() {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(65);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback(async (file: File, q: number) => {
    setProcessing(true);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
    }
    bitmap.close();

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", q / 100);
    });

    setCompressedSize(blob.size);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setCompressedUrl(URL.createObjectURL(blob));
    setProcessing(false);
  }, [compressedUrl]);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setOriginalSize(file.size);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(file));
    compressImage(file, quality);
  };

  const handleQualityChange = (q: number) => {
    setQuality(q);
    if (selectedFile) {
      compressImage(selectedFile, q);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPos(percent);
  };

  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setSelectedFile(null);
    setOriginalUrl(null);
    setCompressedUrl(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-medium text-taccent mb-3">
          <SlidersHorizontal size={15} weight="bold" />
          <span>Visual Squoosh-Style Quality Inspection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-tink mb-3">
          Before vs After Image Comparison
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-tmuted">
          Drag the interactive divider across your photo to compare the original and compressed
          results with pixel-perfect visual precision.
        </p>
      </div>

      {/* Main Container */}
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-tinputline bg-tsurface p-12 text-center transition hover:border-taccent hover:bg-tsurface2 cursor-pointer shadow-sm"
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
            Upload an image to compare, or <span className="text-taccent underline">browse</span>
          </p>
          <p className="text-xs text-tmuted">Instant side-by-side interactive visual comparison.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-tinputline bg-tsurface p-6 sm:p-8 shadow-sm">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-tinputline pb-4 mb-6">
            <div className="flex items-center gap-3">
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

            {/* Quality Slider Control */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-tmuted">Compression Quality:</span>
              <input
                type="range"
                min="10"
                max="95"
                value={quality}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
                className="w-32 accent-taccent cursor-pointer"
              />
              <span className="text-sm font-bold text-tink w-10 text-right">{quality}%</span>
            </div>
          </div>

          {/* Size Metric Badges */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            <div className="rounded-xl bg-tsurface2 p-3 border border-tinputline">
              <span className="block text-xs text-tmuted">Original (Left)</span>
              <span className="text-base font-bold text-tink">{formatBytes(originalSize)}</span>
            </div>
            <div className="rounded-xl bg-tsurface2 p-3 border border-tinputline">
              <span className="block text-xs text-tmuted">Compressed (Right)</span>
              <span className="text-base font-bold text-taccent">{formatBytes(compressedSize)}</span>
              {compressedSize > 0 && originalSize > 0 && (
                <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  (-{Math.round((1 - compressedSize / originalSize) * 100)}%)
                </span>
              )}
            </div>
          </div>

          {/* Interactive Comparison Canvas */}
          <div
            ref={containerRef}
            onMouseDown={() => (isDraggingRef.current = true)}
            onMouseUp={() => (isDraggingRef.current = false)}
            onMouseLeave={() => (isDraggingRef.current = false)}
            onMouseMove={handleMouseMove}
            onTouchStart={() => (isDraggingRef.current = true)}
            onTouchEnd={() => (isDraggingRef.current = false)}
            onTouchMove={handleMouseMove}
            className="relative select-none overflow-hidden rounded-xl border border-tinputline bg-tsurface2 shadow-inner aspect-[16/10] max-h-[500px] flex items-center justify-center cursor-ew-resize"
          >
            {/* Compressed / Processed Layer (Background) */}
            {compressedUrl && (
              <img
                src={compressedUrl}
                alt="Compressed"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              />
            )}

            {/* Original Layer (Clipped to slider position) */}
            {originalUrl && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={originalUrl}
                  alt="Original"
                  className="h-full w-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Divider Line & Drag Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg">
                <SlidersHorizontal size={16} weight="bold" />
              </div>
            </div>

            {/* Labels overlay */}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              Original ({sliderPos}%)
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              Compressed ({100 - sliderPos}%)
            </div>

            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold">
                Re-compressing...
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-tinputline px-4 py-2.5 text-xs font-medium text-tink hover:bg-tsurface2 transition cursor-pointer"
            >
              <FileArrowDown size={16} />
              <span>Choose Another Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            {compressedUrl && (
              <a
                href={compressedUrl}
                download={`compressed-${quality}q-${selectedFile.name.replace(/\.[^.]+$/, "")}.jpg`}
                className="inline-flex items-center gap-2 rounded-lg bg-tbtna px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0257bf] cursor-pointer"
              >
                <span>Download Compressed Result</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
