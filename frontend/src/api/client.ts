const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

const ACCESS_KEY = "hospy_access";
const REFRESH_KEY = "hospy_refresh";

import { formatApiError } from "./errors";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(formatApiError(data));
    this.status = status;
    this.data = data;
  }
}

function tokenStorage(): Storage {
  if (
    sessionStorage.getItem(ACCESS_KEY) ||
    sessionStorage.getItem(REFRESH_KEY)
  ) {
    return sessionStorage;
  }
  return localStorage;
}

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY)
  );
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
  );
}

/** @param persist Si es false, la sesión solo dura hasta cerrar el navegador. */
export function setTokens(access: string, refresh: string, persist = true) {
  clearTokens();
  const store = persist ? localStorage : sessionStorage;
  store.setItem(ACCESS_KEY, access);
  store.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

/** Notifica actividad de sesión (p. ej. tras una petición autenticada). */
export function signalUserActivity() {
  window.dispatchEvent(new Event("hospy:activity"));
}

/** Renueva el access token (y el refresh si el servidor rota tokens). */
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  const store = tokenStorage();
  store.setItem(ACCESS_KEY, data.access);
  if (data.refresh) {
    store.setItem(REFRESH_KEY, data.refresh);
  }
  return data.access;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retry = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { ...options, retry: false });
    }
    window.dispatchEvent(new Event("hospy:session-expired"));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  if (auth) {
    signalUserActivity();
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "PATCH", body, auth }),
  delete: (path: string, auth = true) => request<void>(path, { method: "DELETE", auth }),
};

export function buildQuery(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
