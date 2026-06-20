import type { TourId } from "./types";

const STORAGE_KEY = "hospy-product-tours-v1";

type StoredTours = Partial<Record<TourId, number>>;

function readAll(): StoredTours {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredTours;
  } catch {
    return {};
  }
}

function writeAll(data: StoredTours) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isTourCompleted(id: TourId): boolean {
  return Boolean(readAll()[id]);
}

export function markTourCompleted(id: TourId) {
  const data = readAll();
  data[id] = Date.now();
  writeAll(data);
}

export function resetTour(id: TourId) {
  const data = readAll();
  delete data[id];
  writeAll(data);
}

export function resetAllTours() {
  localStorage.removeItem(STORAGE_KEY);
}
