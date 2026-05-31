import { api } from "./client";

/** Registra un clic en una tarjeta del home (no bloquea la UI si falla). */
export function recordBrowseTileClick(tileId: number) {
  return api.post<{ ok: boolean }>(`/inicio-bloques/${tileId}/registrar-clic/`, {}, false);
}
