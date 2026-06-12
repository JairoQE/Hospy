/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_SESSION_IDLE_MINUTES?: string;
  readonly VITE_PEN_PER_USD?: string;
  readonly VITE_HOSPIX_USE_LOCAL?: string;
  readonly VITE_APP_PROMO_ENABLED?: string;
  readonly VITE_APP_PROMO_URL?: string;
  readonly VITE_GOOGLE_PLAY_URL?: string;
  readonly VITE_APP_STORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
