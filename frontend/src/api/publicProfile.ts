import { api } from "./client";
import type { Paginated, PublicProfileBooking, PublicProfileReview } from "./types";

function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function fetchPublicProfileBookings(userId: number): Promise<PublicProfileBooking[]> {
  const data = await api.get<PublicProfileBooking[] | Paginated<PublicProfileBooking>>(
    `/auth/usuarios/${userId}/reservas-publicas/?page_size=50`,
    false,
  );
  return unwrapList(data);
}

export async function fetchPublicProfileReviews(userId: number): Promise<PublicProfileReview[]> {
  const data = await api.get<PublicProfileReview[] | Paginated<PublicProfileReview>>(
    `/auth/usuarios/${userId}/resenas-publicas/?page_size=50`,
    false,
  );
  return unwrapList(data);
}
