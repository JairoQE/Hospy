const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_TIMEOUT_MS = 15_000;
const TURNSTILE_READY_MS = 8_000;

let loadPromise: Promise<void> | null = null;

function waitForTurnstile(maxMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const started = Date.now();
    const tick = () => {
      if (window.turnstile) {
        resolve();
        return;
      }
      if (Date.now() - started >= maxMs) {
        reject(new Error("Turnstile API not ready"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }
      if (existing.dataset.loaded === "true") {
        waitForTurnstile(TURNSTILE_READY_MS).then(resolve).catch(reject);
        return;
      }

      const onLoad = () => {
        existing.dataset.loaded = "true";
        waitForTurnstile(TURNSTILE_READY_MS).then(resolve).catch(reject);
      };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile script failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      waitForTurnstile(TURNSTILE_READY_MS).then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(script);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export function loadTurnstileScript(options?: { force?: boolean }): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile && !options?.force) return Promise.resolve();

  if (options?.force) {
    loadPromise = null;
    document.getElementById(SCRIPT_ID)?.remove();
  }

  if (loadPromise) return loadPromise;

  loadPromise = withTimeout(
    injectScript(),
    SCRIPT_TIMEOUT_MS,
    "Turnstile script timeout",
  ).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/** Inicia la descarga del script antes de montar el widget (login/registro). */
export function preloadTurnstileScript(): void {
  void loadTurnstileScript().catch(() => {
    /* El widget mostrará reintento si falla */
  });
}
