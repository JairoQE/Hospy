import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconSpinner } from "../icons";
import { PrimeIcon } from "../PrimeIcon";
import { CameraCaptureModal } from "./CameraCaptureModal";

type Props = {
  trigger: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  disabled?: boolean;
  uploading?: boolean;
  cameraFacing?: "user" | "environment";
  cameraTitle?: string;
  onSelect: (file: File) => void;
  menuAlign?: "left" | "right";
};

/**
 * Menú: subir archivo o abrir cámara real (getUserMedia).
 */
export function PhotoSourcePicker({
  trigger,
  triggerClassName = "",
  triggerTitle,
  disabled,
  uploading,
  cameraFacing = "user",
  cameraTitle = "Tomar foto",
  onSelect,
  menuAlign = "right",
}: Props) {
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const pickUpload = (file: File | undefined, input: HTMLInputElement) => {
    if (file) onSelect(file);
    input.value = "";
    setOpen(false);
  };

  return (
    <>
      <div className={`photo-source-picker${open ? " is-open" : ""}`} ref={wrapRef}>
        <input
          ref={uploadRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
          hidden
          disabled={disabled || uploading}
          onChange={(e) => pickUpload(e.target.files?.[0], e.currentTarget)}
        />

        <button
          type="button"
          className={triggerClassName}
          title={triggerTitle}
          aria-label={triggerTitle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          disabled={disabled || uploading}
          onClick={() => setOpen((v) => !v)}
        >
          {uploading ? <IconSpinner size={14} /> : trigger}
        </button>

        {open && (
          <div
            id={menuId}
            className={`photo-source-menu photo-source-menu--${menuAlign}`}
            role="menu"
            aria-label="Origen de la foto"
          >
            <button
              type="button"
              role="menuitem"
              className="photo-source-menu-item"
              onClick={() => {
                setOpen(false);
                uploadRef.current?.click();
              }}
            >
              <PrimeIcon name="pi-images" size={16} />
              Subir foto
            </button>
            <button
              type="button"
              role="menuitem"
              className="photo-source-menu-item"
              onClick={() => {
                setOpen(false);
                setCameraOpen(true);
              }}
            >
              <PrimeIcon name="pi-camera" size={16} />
              Tomarse foto
            </button>
          </div>
        )}
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        facingMode={cameraFacing}
        title={cameraTitle}
        onClose={() => setCameraOpen(false)}
        onCapture={onSelect}
      />
    </>
  );
}
