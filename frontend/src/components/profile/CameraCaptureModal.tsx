import { useEffect, useRef, useState } from "react";
import { PrimeIcon } from "../PrimeIcon";
import { IconSpinner } from "../icons";

type Props = {
  open: boolean;
  facingMode?: "user" | "environment";
  title?: string;
  onClose: () => void;
  onCapture: (file: File) => void;
};

/**
 * Captura real con getUserMedia (PC y móvil), luego entrega un JPEG.
 */
export function CameraCaptureModal({
  open,
  facingMode = "user",
  title = "Tomar foto",
  onClose,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facing, setFacing] = useState(facingMode);

  useEffect(() => {
    setFacing(facingMode);
  }, [facingMode]);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;
    setError("");
    setStarting(true);

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Este navegador no permite usar la cámara. Prueba en Chrome/Edge o en el celular con HTTPS.",
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo acceder a la cámara. Revisa los permisos del navegador.";
        setError(
          /Permission|NotAllowed|denied/i.test(msg)
            ? "Permiso de cámara denegado. Actívalo en el navegador e inténtalo de nuevo."
            : msg,
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const snap = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo capturar.");
      // Espejo para selfie frontal
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo guardar la foto."))),
          "image/jpeg",
          0.92,
        );
      });
      const file = new File([blob], `hospy-camara-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      stopStream();
      onCapture(file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo tomar la foto.");
    } finally {
      setCapturing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="camera-capture-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="camera-capture-modal">
        <div className="camera-capture-head">
          <h3>{title}</h3>
          <button type="button" className="camera-capture-close" onClick={onClose} aria-label="Cerrar">
            <PrimeIcon name="pi-times" size={18} />
          </button>
        </div>

        <div className={`camera-capture-stage${facing === "user" ? " is-mirrored" : ""}`}>
          {starting && (
            <div className="camera-capture-loading">
              <IconSpinner size={28} />
              <span>Abriendo cámara…</span>
            </div>
          )}
          <video ref={videoRef} playsInline muted autoPlay className="camera-capture-video" />
        </div>

        {error && <p className="error-msg camera-capture-error">{error}</p>}

        <div className="camera-capture-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            disabled={starting || capturing || !!error}
          >
            <PrimeIcon name="pi-refresh" size={16} />
            Cambiar cámara
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void snap()}
            disabled={starting || capturing || !!error}
          >
            {capturing ? "Guardando…" : "Capturar foto"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={capturing}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
