import { useEffect, useState } from "react";
import { api } from "../api/client";

export type CaptchaConfig = {
  enabled: boolean;
  siteKey: string;
  loading: boolean;
};

export function useCaptchaConfig(): CaptchaConfig {
  const envKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
  const [config, setConfig] = useState<CaptchaConfig>({
    enabled: false,
    siteKey: envKey,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ enabled: boolean; site_key: string }>("/auth/captcha/", false)
      .then((data) => {
        if (cancelled) return;
        const siteKey = data.site_key?.trim() || envKey;
        setConfig({
          enabled: Boolean(data.enabled && siteKey),
          siteKey,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setConfig({
          enabled: Boolean(envKey),
          siteKey: envKey,
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [envKey]);

  return config;
}
