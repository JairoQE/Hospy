import { api } from "./client";

export type NearbyExploreItem = {
  kind?: "restaurant" | "place" | "event";
  id?: string | number | null;
  name: string;
  subtitle?: string;
  address?: string;
  distance_km?: number | null;
  rating?: number | null;
  image_url?: string | null;
  entry_price?: string;
  interest_level?: number | null;
  start_date?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  href: string;
  external_url?: string | null;
  provider_label?: string;
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

export type ConectaTingoPlace = {
  name: string;
  slug: string;
  public_id?: number | null;
  zone?: string;
  interest_level?: number;
  entry_price?: string;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  external_url?: string | null;
  source?: string;
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

export function fetchTouristPlace(slug: string): Promise<ConectaTingoPlace> {
  return api.get(`/lugares-turisticos/${encodeURIComponent(slug)}/`, false);
}
