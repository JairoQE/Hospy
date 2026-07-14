import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconSpinner } from "../icons";
import { PrimeIcon } from "../PrimeIcon";

type Props = {
  /** Cómo se muestra el disparador */
  trigger: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
  disabled?: boolean;
  uploading?: boolean;
  /** Cámara frontal (selfie) o trasera (portada) */
  cameraFacing?: "user" | "environment";
  onSelect: (file: File) => void;
  menuAlign?: "left" | "right";
};

/**
 * Disparador con menú: subir desde galería / archivo, o capturar con la cámara.
 */
export function PhotoSourcePicker({
  trigger,
  triggerClassName = "",
  triggerTitle,
  disabled,
  uploading,
  cameraFacing = "user",
  onSelect,
  menuAlign = "right",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
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

  const pickFile = (file: File | undefined, input: HTMLInputElement) => {
    if (file) onSelect(file);
    input.value = "";
    setOpen(false);
  };

  return (
    <div
      className={`photo-source-picker${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={disabled || uploading}
        onChange={(e) => pickFile(e.target.files?.[0], e.currentTarget)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={cameraFacing}
        hidden
        disabled={disabled || uploading}
        onChange={(e) => pickFile(e.target.files?.[0], e.currentTarget)}
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
            onClick={() => uploadRef.current?.click()}
          >
            <PrimeIcon name="pi-images" size={16} />
            Subir foto
          </button>
          <button
            type="button"
            role="menuitem"
            className="photo-source-menu-item"
            onClick={() => cameraRef.current?.click()}
          >
            <PrimeIcon name="pi-camera" size={16} />
            Tomarse foto
          </button>
        </div>
      )}
    </div>
  );
}
