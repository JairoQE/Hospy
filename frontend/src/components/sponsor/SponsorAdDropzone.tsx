import { useCallback, useId, useRef, useState } from "react";
import { PrimeIcon } from "../PrimeIcon";
import { acceptedFileTypes, validateCreativeFile } from "./sponsorAdUtils";

type Props = {
  file: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
  uploadProgress?: number | null;
};

export function SponsorAdDropzone({
  file,
  previewUrl,
  onFileChange,
  disabled,
  error,
  uploadProgress,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");

  const pickFile = useCallback(
    (f: File | null) => {
      setLocalError("");
      if (!f) {
        onFileChange(null);
        return;
      }
      const err = validateCreativeFile(f);
      if (err) {
        setLocalError(err);
        return;
      }
      onFileChange(f);
    },
    [onFileChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="sponsor-field">
      <label htmlFor={inputId} className="sponsor-label">
        Archivo creativo <span className="sponsor-required">*</span>
      </label>
      <p className="sponsor-hint">Sube imagen, GIF o video (máx. 10 s en pantalla, sin audio).</p>

      <div
        className={`sponsor-dropzone${dragOver ? " is-dragover" : ""}${error || localError ? " has-error" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {previewUrl ? (
          <div className="sponsor-dropzone-preview">
            {isVideo ? (
              <video src={previewUrl} muted playsInline controls aria-label="Vista previa del video" />
            ) : (
              <img src={previewUrl} alt="Vista previa del creativo" />
            )}
            <button
              type="button"
              className="sponsor-dropzone-remove"
              aria-label="Quitar archivo seleccionado"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={disabled}
            >
              <PrimeIcon name="pi-times" size={14} />
            </button>
          </div>
        ) : (
          <div className="sponsor-dropzone-empty">
            <PrimeIcon name="pi-cloud-upload" size={32} />
            <p>Arrastra tu archivo aquí o selecciónalo</p>
            <span className="muted">JPG, PNG, WEBP, GIF · MP4, WEBM · máx. 5 MB imagen / 15 MB video</span>
          </div>
        )}

        {uploadProgress != null && uploadProgress < 100 && (
          <div className="sponsor-upload-progress" role="progressbar" aria-valuenow={uploadProgress}>
            <div className="sponsor-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={acceptedFileTypes()}
          disabled={disabled}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="sponsor-btn sponsor-btn--outline sponsor-dropzone-btn"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
        </button>
      </div>
      {(error || localError) && <p className="sponsor-field-error">{error || localError}</p>}
    </div>
  );
}
