import { api } from "./client";

export type NearbyExploreItem = {
  id?: string | number | null;
  name: string;
  subtitle?: string;
  distance_km?: number | null;
  rating?: number | null;
  image_url?: string | null;
  entry_price?: string;
  start_date?: string;
  href: string;
  source?: string;
};

export type NearbyExploreResponse = {
  lat: number;
  lng: number;
  radio_km: number;
  city: string;
  restaurantes: NearbyExploreItem[];
  lugares: NearbyExploreItem[];
  eventos: NearbyExploreItem[];
};

export function fetchNearbyExplore(params: {
  lat: number;
  lng: number;
  radio_km?: number;
  ciudad?: string;
}): Promise<NearbyExploreResponse> {
  const q = new URLSearchParams();
  q.set("lat", String(params.lat));
  q.set("lng", String(params.lng));
  if (params.radio_km != null) q.set("radio_km", String(params.radio_km));
  if (params.ciudad) q.set("ciudad", params.ciudad);
  return api.get(`/alrededores/?${q.toString()}`, false);
}
