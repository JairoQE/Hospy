import { api } from "./client";

export type ActifyCapacity = {
  max_capacity?: number | null;
  sold_tickets?: number | null;
  available_spots?: number | null;
  is_sold_out?: boolean;
};

export type ActifyEvent = {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  image_url?: string | null;
  capacity: ActifyCapacity;
  location: {
    city: string;
    address: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
  category: { name: string; slug: string };
  organizer: { name: string };
  ticket_types: { name: string; price?: string | number | null; currency?: string }[];
  external_url?: string | null;
  source?: string;
};

export type ActifyEventsResponse = {
  events: ActifyEvent[];
  count: number;
  meta?: Record<string, unknown>;
  provider?: string;
};

export type ActifyEventsQuery = {
  category_id?: string | number;
  location?: string;
  radius?: string | number;
  city?: string;
  page?: string | number;
  per_page?: string | number;
};

export async function fetchActifyEvents(
  params: ActifyEventsQuery = {},
): Promise<ActifyEventsResponse> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const qs = q.toString();
  return api.get(`/eventos/${qs ? `?${qs}` : ""}`, false);
}

export async function fetchActifyEvent(id: number | string): Promise<ActifyEvent> {
  return api.get(`/eventos/${id}/`, false);
}
