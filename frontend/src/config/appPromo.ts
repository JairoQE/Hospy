const DEFAULT_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://hospy.pe";

export function isAppPromoEnabled(): boolean {
  return import.meta.env.VITE_APP_PROMO_ENABLED !== "false";
}

export function appPromoUrl(): string {
  const configured = import.meta.env.VITE_APP_PROMO_URL?.trim();
  return configured || DEFAULT_ORIGIN;
}

export function googlePlayUrl(): string | null {
  const url = import.meta.env.VITE_GOOGLE_PLAY_URL?.trim();
  return url || null;
}

export function appStoreUrl(): string | null {
  const url = import.meta.env.VITE_APP_STORE_URL?.trim();
  return url || null;
}

export function qrCodeImageUrl(targetUrl: string, size = 168): string {
  const params = new URLSearchParams({
    text: targetUrl,
    size: String(size),
    margin: "1",
    dark: "1a2e4a",
    light: "ffffff",
  });
  return `https://quickchart.io/qr?${params.toString()}`;
}
