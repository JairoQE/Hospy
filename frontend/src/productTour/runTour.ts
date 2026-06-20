import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { TourDefinition } from "./types";

type TranslateFn = (key: string) => string;

function buildSteps(definition: TourDefinition, t: TranslateFn): DriveStep[] {
  const steps: DriveStep[] = [];

  for (const step of definition.steps) {
    if (step.element && !document.querySelector(step.element)) {
      if (step.optional) continue;
      return [];
    }

    steps.push({
      element: step.element,
      popover: {
        title: t(step.titleKey),
        description: t(step.descriptionKey),
        side: step.side,
        align: "center",
      },
    });
  }

  return steps.length ? steps : [];
}

let activeDriver: Driver | null = null;

export function destroyActiveTour() {
  if (activeDriver?.isActive()) {
    activeDriver.destroy();
  }
  activeDriver = null;
}

export function isTourRunning(): boolean {
  return Boolean(activeDriver?.isActive());
}

export function runProductTour(
  definition: TourDefinition,
  t: TranslateFn,
  onComplete?: () => void,
): boolean {
  destroyActiveTour();

  const steps = buildSteps(definition, t);
  if (!steps.length) return false;

  activeDriver = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.62,
    stagePadding: 10,
    stageRadius: 12,
    popoverClass: "hospy-product-tour-popover",
    progressText: t("tour.progress"),
    nextBtnText: t("tour.next"),
    prevBtnText: t("tour.prev"),
    doneBtnText: t("tour.done"),
    onDestroyed: () => {
      activeDriver = null;
      onComplete?.();
    },
    steps,
  });

  activeDriver.drive();
  return true;
}
