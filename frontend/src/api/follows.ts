import { api } from "./client";
import type { FollowListUser, Paginated } from "./types";

function unwrapList(data: FollowListUser[] | Paginated<FollowListUser>): FollowListUser[] {
  return Array.isArray(data) ? data : data.results;
}

export async function fetchUserFollowers(userId: number): Promise<FollowListUser[]> {
  const data = await api.get<FollowListUser[] | Paginated<FollowListUser>>(
    `/auth/usuarios/${userId}/seguidores/?page_size=100`,
    false,
  );
  return unwrapList(data);
}

export async function fetchUserFollowing(userId: number): Promise<FollowListUser[]> {
  const data = await api.get<FollowListUser[] | Paginated<FollowListUser>>(
    `/auth/usuarios/${userId}/siguiendo/?page_size=100`,
    false,
  );
  return unwrapList(data);
}

export async function toggleUserFollow(userId: number): Promise<{ following: boolean }> {
  return api.post<{ following: boolean; followers_count: number }>(
    `/auth/usuarios/${userId}/seguir/`,
  );
}
