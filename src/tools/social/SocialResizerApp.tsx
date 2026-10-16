import { useState, useRef, useCallback } from "react";
import {
  SOCIAL_PRESETS,
  resizeForSocial,
  type SocialPreset,
  type SocialResizeResult,
} from "./socialEngine";
import {
  UploadSimple,
  DownloadSimple,
  ShareNetwork,
  Trash,
  FileArrowDown,
  Crop,
  ArrowsIn,
} from "@phosphor-icons/react";

export default function SocialResizerApp() {
  const [selectedPreset, setSelectedPreset] = useState<SocialPreset>(SOCIAL_PRESETS[0]);
  const [fitMode, setFitMode] = useState<"crop-fill" | "fit-pad">("crop-fill");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<SocialResizeResult | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = useCallback(
    async (file: File, preset: SocialPreset, mode: "crop-fill" | "fit-pad") => {
      setError(null);
      setProcessing(true);
      try {
        const res = await resizeForSocial(file, preset, mode);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resize image");
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    handleProcess(file, selectedPreset, fitMode);
  };

  const handlePresetSelect = (preset: SocialPreset) => {
    setSelectedPreset(preset);
    if (selectedFile) {
      handleProcess(selectedFile, preset, fitMode);
    }
  };

  const handleFitModeChange = (mode: "crop-fill" | "fit-pad") => {
    setFitMode(mode);
    if (selectedFile) {
      handleProcess(selectedFile, selectedPreset, mode);
    }
  };

  const handleReset = () => {
    if (result?.dataUrl) URL.revokeObjectURL(result.dataUrl);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-medium text-taccent mb-3">
          <ShareNetwork size={15} weight="fill" />
          <span>All 2026 Social Platform Aspect Ratios</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-tink mb-3">
          Social Media Image Resizer
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-tmuted">
          Instantly resize your photos for Instagram, YouTube, TikTok, Twitter/X, and LinkedIn
          without awkward crops or quality loss.
        </p>
      </div>

      {/* Preset Platform Chips */}
      <div className="mb-6 flex flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium text-tink">Choose Social Platform Format:</label>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
          {SOCIAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium transition cursor-pointer border flex flex-col items-center ${
                selectedPreset.id === preset.id
                  ? "border-taccent bg-taccent/10 text-taccent font-semibold shadow-sm ring-1 ring-taccent"
                  : "border-tline bg-tsurface text-tink hover:border-taccent/50 hover:bg-tsurface2"
              }`}
            >
              <span>{preset.name}</span>
              <span className="text-[11px] text-tmuted mt-0.5">
                {preset.width} × {preset.height} ({preset.aspectRatio})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fit vs Crop Mode Switcher */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className="text-xs font-medium text-tmuted">Mode:</span>
        <div className="inline-flex rounded-lg border border-tline bg-tsurface p-1">
          <button
            type="button"
            onClick={() => handleFitModeChange("crop-fill")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
              fitMode === "crop-fill"
                ? "bg-taccent text-white shadow-sm"
                : "text-tmuted hover:text-tink"
            }`}
          >
            <Crop size={14} />
            <span>Crop to Fill</span>
          </button>
          <button
            type="button"
            onClick={() => handleFitModeChange("fit-pad")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
              fitMode === "fit-pad"
                ? "bg-taccent text-white shadow-sm"
                : "text-tmuted hover:text-tink"
            }`}
          >
            <ArrowsIn size={14} />
            <span>Fit &amp; Pad Borders</span>
          </button>
        </div>
      </div>

      {/* Main Upload / Dropzone */}
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-tline bg-tsurface p-10 text-center transition hover:border-taccent hover:bg-tsurface2 cursor-pointer shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg,image/heic,image/heif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-taccent/10 text-taccent">
            <UploadSimple size={32} weight="bold" />
          </div>
          <p className="text-lg font-semibold text-tink mb-1">
            Upload your photo, or <span className="text-taccent underline">browse</span>
          </p>
          <p className="text-xs text-tmuted">
            Automatically formats to {selectedPreset.width}×{selectedPreset.height} px (
            {selectedPreset.aspectRatio}).
          </p>
        </div>
      ) : (
        /* Result Preview Card */
        <div className="rounded-2xl border border-tline bg-tsurface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Social Photo Preview Frame */}
            <div className="relative shrink-0 overflow-hidden rounded-xl border border-tline bg-tsurface2 shadow-inner flex items-center justify-center max-w-[320px] max-h-[320px]">
              {result?.dataUrl ? (
                <img
                  src={result.dataUrl}
                  alt="Social preview"
                  className="w-full h-auto max-h-[320px] object-contain"
                />
              ) : null}

              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold">
                  Resizing for {selectedPreset.name}...
                </div>
              )}
            </div>

            {/* Specifications & Actions */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between border-b border-tline pb-3">
                <span className="text-sm font-semibold text-tink truncate max-w-[220px]">
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

              <div className="space-y-2 rounded-xl bg-tsurface2 p-4 border border-tline text-xs">
                <div className="flex justify-between">
                  <span className="text-tmuted">Platform:</span>
                  <span className="font-semibold text-tink">{selectedPreset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tmuted">Aspect Ratio:</span>
                  <span className="font-semibold text-tink">{selectedPreset.aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tmuted">Dimensions:</span>
                  <span className="font-semibold text-tink">
                    {selectedPreset.width} × {selectedPreset.height} px
                  </span>
                </div>
              </div>

              {error && <p className="text-xs font-medium text-terror">{error}</p>}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {result?.dataUrl && (
                  <a
                    href={result.dataUrl}
                    download={`social-${selectedPreset.id}-${selectedFile.name.replace(/\.[^.]+$/, "")}.jpg`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-tbtna px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf] cursor-pointer"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Download Resized Photo</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink hover:bg-tsurface2 transition cursor-pointer"
                >
                  <FileArrowDown size={18} />
                  <span>Choose Another Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
