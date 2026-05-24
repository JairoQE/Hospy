import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "hospy_recent_views";
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

function read(): RecentViewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentViewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentViewItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentViewItem[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  const add = useCallback((item: Omit<RecentViewItem, "viewedAt">) => {
    const next = [
      { ...item, viewedAt: Date.now() },
      ...read().filter((x) => x.id !== item.id),
    ].slice(0, MAX_ITEMS);
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((id: number) => {
    const next = read().filter((x) => x.id !== id);
    write(next);
    setItems(next);
  }, []);

  return { items, add, remove };
}

export function recordRecentView(item: Omit<RecentViewItem, "viewedAt">) {
  const next = [
    { ...item, viewedAt: Date.now() },
    ...read().filter((x) => x.id !== item.id),
  ].slice(0, MAX_ITEMS);
  write(next);
}
