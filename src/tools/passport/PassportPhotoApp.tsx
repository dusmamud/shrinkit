import { useState, useRef, useCallback } from "react";
import {
  PASSPORT_SPECS,
  generatePassportPhoto,
  type PassportSpec,
  type ProcessedPassportPhoto,
} from "./passportEngine";
import {
  UploadSimple,
  DownloadSimple,
  IdentificationCard,
  Trash,
  FileArrowDown,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function PassportPhotoApp() {
  const [selectedSpec, setSelectedSpec] = useState<PassportSpec>(PASSPORT_SPECS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessedPassportPhoto | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = useCallback(
    async (file: File, spec: PassportSpec) => {
      setError(null);
      setProcessing(true);
      try {
        const res = await generatePassportPhoto(file, spec, "white");
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate passport photo");
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    handleProcess(file, selectedSpec);
  };

  const handleSpecSelect = (spec: PassportSpec) => {
    setSelectedSpec(spec);
    if (selectedFile) {
      handleProcess(selectedFile, spec);
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
          <IdentificationCard size={15} weight="fill" />
          <span>Official 300 DPI Passport & Visa Standards</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-tink mb-3">
          Online Passport & Visa Photo Maker
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-tmuted">
          Create compliant passport and visa photos online in seconds. Automatically formatted to
          exact dimensions with white background and 300 DPI resolution.
        </p>
      </div>

      {/* Country / Standard Selector */}
      <div className="mb-8 flex flex-col items-center justify-center gap-3">
        <label className="text-sm font-medium text-tink">Select Destination Country or Standard:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
          {PASSPORT_SPECS.map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => handleSpecSelect(spec)}
              className={`flex flex-col items-center p-3 rounded-xl border text-center transition cursor-pointer ${
                selectedSpec.id === spec.id
                  ? "border-taccent bg-taccent/10 text-taccent font-semibold shadow-sm ring-1 ring-taccent"
                  : "border-tinputline bg-tsurface text-tink hover:border-taccent/50 hover:bg-tsurface2"
              }`}
            >
              <span className="text-sm font-bold">{spec.country}</span>
              <span className="text-xs text-tmuted mt-0.5">
                {spec.widthMm} × {spec.heightMm} mm
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-tmuted mt-1">{selectedSpec.description}</p>
      </div>

      {/* Main Upload / Dropzone */}
      {!selectedFile ? (
        <div
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
            Upload your portrait photo, or <span className="text-taccent underline">browse</span>
          </p>
          <p className="text-xs text-tmuted">
            Formats to {selectedSpec.widthMm}×{selectedSpec.heightMm} mm ({selectedSpec.targetWidthPx}×{selectedSpec.targetHeightPx} px @ 300 DPI).
          </p>
        </div>
      ) : (
        /* Result Preview Card */
        <div className="rounded-2xl border border-tinputline bg-tsurface p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Passport Photo Preview Frame */}
            <div className="relative shrink-0 overflow-hidden rounded-lg border-4 border-white shadow-lg bg-white flex items-center justify-center max-w-[240px]">
              {result?.dataUrl ? (
                <img
                  src={result.dataUrl}
                  alt="Passport photo preview"
                  className="w-full h-auto object-cover"
                />
              ) : null}

              {/* Head & eye alignment guide overlay */}
              <div
                className="pointer-events-none absolute inset-0 border border-blue-400/30 flex flex-col items-center justify-center"
                aria-hidden="true"
              >
                <div className="w-16 h-20 rounded-full border border-dashed border-blue-400/40 -mt-4"></div>
              </div>

              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold">
                  Formatting photo...
                </div>
              )}
            </div>

            {/* Specifications & Download Actions */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between border-b border-tinputline pb-3">
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

              <div className="space-y-2 rounded-xl bg-tsurface2 p-4 border border-tinputline text-xs">
                <div className="flex justify-between">
                  <span className="text-tmuted">Physical Size:</span>
                  <span className="font-semibold text-tink">
                    {selectedSpec.widthMm} × {selectedSpec.heightMm} mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tmuted">Resolution:</span>
                  <span className="font-semibold text-tink">
                    {selectedSpec.targetWidthPx} × {selectedSpec.targetHeightPx} px (300 DPI)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tmuted">Background:</span>
                  <span className="font-semibold text-tink">Solid Pure White</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={16} weight="fill" />
                <span>Compliant with official {selectedSpec.country} submission standards.</span>
              </div>

              {error && <p className="text-xs font-medium text-terror">{error}</p>}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {result?.dataUrl && (
                  <a
                    href={result.dataUrl}
                    download={`passport-photo-${selectedSpec.id}.jpg`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-tbtna px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf] cursor-pointer"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    <span>Download Passport Photo</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-tinputline px-4 py-3 text-sm font-medium text-tink hover:bg-tsurface2 transition cursor-pointer"
                >
                  <FileArrowDown size={18} />
                  <span>Upload Different Photo</span>
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

      {/* Guidelines Box */}
      <div className="mt-12 rounded-2xl border border-tinputline bg-tsurface p-6 sm:p-8">
        <h2 className="text-lg font-bold text-tink mb-3">Official Photo Guidelines Checklist</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-tmuted list-disc list-inside">
          <li>Look straight into the camera with a neutral facial expression.</li>
          <li>Ensure even lighting across face without harsh shadows.</li>
          <li>Both eyes must be open and clearly visible (avoid tinted glasses).</li>
          <li>Head should be centered occupying 70% to 80% of photo height.</li>
        </ul>
      </div>
    </div>
  );
}
