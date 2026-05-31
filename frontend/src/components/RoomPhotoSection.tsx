import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../api/client";
import { formatApiError } from "../api/errors";
import type { RoomPhoto } from "../api/types";
import { resolveMediaUrl } from "../utils/media";

const MAX_PHOTOS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Props {
  roomId: number;
}

export function RoomPhotoSection({ roomId }: Props) {
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<RoomPhoto[]>(`/habitaciones/${roomId}/fotos/`)
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      alert("La imagen no puede superar 5 MB.");
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append("image", file);
    try {
      await api.post<RoomPhoto>(`/habitaciones/${roomId}/fotos/`, body);
      load();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : formatApiError(null);
      alert(msg || "Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (fotoId: number) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      await api.delete(`/habitaciones/${roomId}/fotos/${fotoId}/`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    }
  };

  return (
    <div className="room-photos">
      <p className="room-photos-label">
        Fotos de la habitación <span className="muted">(máx. {MAX_PHOTOS})</span>
      </p>
      {loading ? (
        <p className="muted">Cargando fotos…</p>
      ) : (
        <>
          {photos.length > 0 && (
            <div className="photo-grid room-photo-grid">
              {photos.map((f) => (
                <div key={f.id} className="photo-thumb">
                  <img
                    src={resolveMediaUrl(f.image_url ?? f.image)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => remove(f.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="upload-label">
            <span className="btn btn-ghost">
              {uploading ? "Subiendo…" : "Añadir foto"}
            </span>
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={uploading || photos.length >= MAX_PHOTOS}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
          </label>
          {photos.length >= MAX_PHOTOS && (
            <p className="muted room-photos-limit">Límite de {MAX_PHOTOS} fotos alcanzado.</p>
          )}
        </>
      )}
    </div>
  );
}
