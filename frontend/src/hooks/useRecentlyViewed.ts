import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const LEGACY_KEY = "hospy_recent_views";
const MAX_ITEMS = 12;

export interface RecentViewItem {
  id: number;
  name: string;
  city: string;
  type: string;
  foto_principal: string | null;
  average_rating: string | number;
  precio_desde: string | number | null;
  viewedAt: number;
}

function storageKey(userId: number): string {
  return `hospy_recent_views_u_${userId}`;
}

function readForUser(userId: number): RecentViewItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentViewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeForUser(userId: number, items: RecentViewItem[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
  window.dispatchEvent(
    new CustomEvent("hospy-recent-views-changed", { detail: { userId } }),
  );
}

/** Elimina clave global antigua (compartida entre todos los usuarios del navegador). */
function dropLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function useRecentlyViewed() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const load = useCallback((): RecentViewItem[] => {
    if (userId == null) return [];
    return readForUser(userId);
  }, [userId]);

  const [items, setItems] = useState<RecentViewItem[]>([]);

  useEffect(() => {
    dropLegacyStorage();
  }, []);

  useEffect(() => {
    setItems(load());
  }, [load]);

  useEffect(() => {
    if (userId == null) return;
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ userId?: number }>;
      if (ev.detail?.userId === userId) setItems(load());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(userId)) setItems(load());
    };
    window.addEventListener("hospy-recent-views-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hospy-recent-views-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId, load]);

  const add = useCallback(
    (item: Omit<RecentViewItem, "viewedAt">) => {
      if (userId == null) return;
      const next = [
        { ...item, viewedAt: Date.now() },
        ...readForUser(userId).filter((x) => x.id !== item.id),
      ].slice(0, MAX_ITEMS);
      writeForUser(userId, next);
      setItems(next);
    },
    [userId],
  );

  const remove = useCallback(
    (id: number) => {
      if (userId == null) return;
      const next = readForUser(userId).filter((x) => x.id !== id);
      writeForUser(userId, next);
      setItems(next);
    },
    [userId],
  );

  return { items, add, remove, isLoggedIn: userId != null };
}

/** Registra una visita al detalle; solo si hay sesión iniciada. */
export function recordRecentView(
  item: Omit<RecentViewItem, "viewedAt">,
  userId: number | null | undefined,
) {
  if (userId == null) return;
  const next = [
    { ...item, viewedAt: Date.now() },
    ...readForUser(userId).filter((x) => x.id !== item.id),
  ].slice(0, MAX_ITEMS);
  writeForUser(userId, next);
}
