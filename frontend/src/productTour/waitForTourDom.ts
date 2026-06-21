import type { TourId } from "./types";

const DETAIL_READY_SELECTOR = '[data-tour="property-header"]';
const HOME_READY_SELECTOR = '[data-tour="home-search"]';

export function waitForTourDom(tourId: TourId, timeoutMs = 10_000): Promise<boolean> {
  const selector =
    tourId === "property-detail"
      ? DETAIL_READY_SELECTOR
      : tourId === "home"
        ? HOME_READY_SELECTOR
        : null;

  if (!selector) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const isReady = () => Boolean(document.querySelector(selector));

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
