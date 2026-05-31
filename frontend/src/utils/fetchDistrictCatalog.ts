import { api } from "../api/client";
import type { SearchFilters } from "../components/SearchBar";
import type { DestinationOption } from "../data/destinationOptions";
import type { UbigeoItem } from "../components/home/LocationExplorer";
import { normalizePlaceText } from "./normalizePlaceText";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    return await api.get<T>(path, false);
  } catch {
    return null;
  }
}

/**
 * Lista oficial de distritos (UBIGEO) para pintar secciones completas tras una búsqueda
 * por provincia, departamento o texto libre que resuelva a provincia/departamento.
 */
export async function fetchDistrictCatalogForSearch(
  filters: SearchFilters,
): Promise<UbigeoItem[]> {
  const dept = (filters.departamento ?? "").trim();
  const prov = (filters.provincia ?? "").trim();
  const ciudad = (filters.ciudad ?? "").trim();

  if (prov) {
    const q = new URLSearchParams({ provincia: prov });
    if (dept) q.set("departamento", dept);
    const data = await getJson<UbigeoItem[]>(`/ubigeo/distritos/?${q}`);
    return Array.isArray(data) ? data : [];
  }

  if (dept) {
    const q = new URLSearchParams({ departamento: dept });
    const data = await getJson<UbigeoItem[]>(`/ubigeo/distritos/?${q}`);
    return Array.isArray(data) ? data : [];
  }

  if (!ciudad) return [];

  const places = await getJson<DestinationOption[]>(
    `/ubigeo/buscar/?q=${encodeURIComponent(ciudad)}&limit=14`,
  );
  if (!Array.isArray(places) || places.length === 0) return [];

  const target = normalizePlaceText(ciudad);
  const exact =
    places.find((p) => normalizePlaceText(p.nombre) === target) ?? places[0];

  if (exact.tipo === "distrito") {
    return [];
  }

  if (exact.tipo === "provincia" && exact.provincia) {
    const q = new URLSearchParams({ provincia: exact.provincia });
    if (exact.departamento) q.set("departamento", exact.departamento);
    const data = await getJson<UbigeoItem[]>(`/ubigeo/distritos/?${q}`);
    return Array.isArray(data) ? data : [];
  }

  if (exact.tipo === "departamento" && exact.departamento) {
    const q = new URLSearchParams({ departamento: exact.departamento });
    const data = await getJson<UbigeoItem[]>(`/ubigeo/distritos/?${q}`);
    return Array.isArray(data) ? data : [];
  }

  return [];
}
