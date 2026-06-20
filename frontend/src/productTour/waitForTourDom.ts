import type { TourId } from "./types";

const DETAIL_READY_SELECTOR = '[data-tour="property-header"]';

export function waitForTourDom(tourId: TourId, timeoutMs = 10_000): Promise<boolean> {
  if (tourId !== "property-detail") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const isReady = () => Boolean(document.querySelector(DETAIL_READY_SELECTOR));

    if (isReady()) {
      resolve(true);
      return;
    }

    const started = Date.now();
    const tick = () => {
      if (isReady()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  });
}
