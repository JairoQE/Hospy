import { api } from "./client";

export type RestoPointRestaurant = {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  avg_rating?: number | null;
  total_capacity?: number | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  maps_url?: string | null;
  source?: string;
};

export type RestoPointListResponse = {
  restaurants: RestoPointRestaurant[];
  count: number;
  page: number;
  size: number;
  provider?: string;
  success?: boolean;
};

export function fetchRestaurants(params?: {
  page?: number;
  size?: number;
}): Promise<RestoPointListResponse> {
  const q = new URLSearchParams();
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const qs = q.toString();
  return api.get(`/restaurantes/${qs ? `?${qs}` : ""}`, false);
}

export function fetchRestaurant(id: string): Promise<RestoPointRestaurant> {
  return api.get(`/restaurantes/${encodeURIComponent(id)}/`, false);
}
