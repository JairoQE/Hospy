export {};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          retry?: "auto" | "never";
          "refresh-expired"?: "auto" | "manual" | "never";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}
