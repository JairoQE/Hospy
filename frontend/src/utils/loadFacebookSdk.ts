const SDK_URL = "https://connect.facebook.net/es_ES/sdk.js";

let loadPromise: Promise<void> | null = null;

export function isFacebookSdkConfigured() {
  return Boolean(import.meta.env.VITE_FACEBOOK_APP_ID?.trim());
}

export function loadFacebookSdk(appId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK no disponible en el servidor."));
  }
  if (window.FB) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
    };

    if (document.querySelector(`script[src="${SDK_URL}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("No se pudo cargar el SDK de Facebook."));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}
