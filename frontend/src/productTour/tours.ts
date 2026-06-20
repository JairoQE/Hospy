import type { TourDefinition, TourId, TourStepDef } from "./types";

const OWNER_NAV_MOBILE = '[data-tour="owner-menu-toggle"]';
const OWNER_NAV_DESKTOP = '[data-tour="owner-sidebar-nav"]';

function ownerNavStep(): TourStepDef {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return {
    element: mobile ? OWNER_NAV_MOBILE : OWNER_NAV_DESKTOP,
    titleKey: "tour.ownerNavTitle",
    descriptionKey: mobile ? "tour.ownerNavDescMobile" : "tour.ownerNavDescDesktop",
    side: mobile ? "bottom" : "right",
    optional: true,
  };
}

export const TOUR_DEFINITIONS: Record<TourId, TourDefinition> = {
  home: {
    id: "home",
    steps: [
      {
        titleKey: "tour.homeWelcomeTitle",
        descriptionKey: "tour.homeWelcomeDesc",
      },
      {
        element: '[data-tour="home-search"]',
        titleKey: "tour.homeSearchTitle",
        descriptionKey: "tour.homeSearchDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="home-browse"]',
        titleKey: "tour.homeBrowseTitle",
        descriptionKey: "tour.homeBrowseDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="mobile-bottom-nav"]',
        titleKey: "tour.mobileNavTitle",
        descriptionKey: "tour.mobileNavDescGuest",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="hospix-assistant"]',
        titleKey: "tour.hospixTitle",
        descriptionKey: "tour.hospixDesc",
        side: "left",
        optional: true,
      },
    ],
  },
  "guest-app": {
    id: "guest-app",
    steps: [
      {
        titleKey: "tour.guestWelcomeTitle",
        descriptionKey: "tour.guestWelcomeDesc",
      },
      {
        element: '[data-tour="home-search"]',
        titleKey: "tour.homeSearchTitle",
        descriptionKey: "tour.homeSearchDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="header-inbox"]',
        titleKey: "tour.inboxTitle",
        descriptionKey: "tour.inboxDesc",
        side: "bottom",
        optional: true,
      },
      {
        element: '[data-tour="nav-bookings"]',
        titleKey: "tour.bookingsTitle",
        descriptionKey: "tour.bookingsDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="mobile-bottom-nav"]',
        titleKey: "tour.mobileNavTitle",
        descriptionKey: "tour.mobileNavDescGuest",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="hospix-assistant"]',
        titleKey: "tour.hospixTitle",
        descriptionKey: "tour.hospixDesc",
        side: "left",
        optional: true,
      },
    ],
  },
  "owner-panel": {
    id: "owner-panel",
    steps: [
      {
        titleKey: "tour.ownerWelcomeTitle",
        descriptionKey: "tour.ownerWelcomeDesc",
      },
      ownerNavStep(),
      {
        element: '[data-tour="owner-dashboard"]',
        titleKey: "tour.ownerDashboardTitle",
        descriptionKey: "tour.ownerDashboardDesc",
        side: "bottom",
        optional: true,
      },
      {
        element: '[data-tour="mobile-bottom-nav"]',
        titleKey: "tour.mobileNavTitle",
        descriptionKey: "tour.mobileNavDescOwner",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="hospix-assistant"]',
        titleKey: "tour.hospixTitle",
        descriptionKey: "tour.hospixDescOwner",
        side: "left",
        optional: true,
      },
    ],
  },
};

export function resolveTourForRoute(pathname: string, role?: string): TourId | null {
  if (
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar")
  ) {
    return null;
  }

  if (pathname.startsWith("/panel")) {
    if (/^\/panel\/hospedajes\/\d+/.test(pathname)) return null;
    return role === "propietario" ? "owner-panel" : null;
  }

  if (pathname === "/" || pathname.startsWith("/hospedajes/")) {
    if (role === "propietario" || role === "administrador" || role === "patrocinador") {
      return "home";
    }
    return role === "huesped" ? "guest-app" : "home";
  }

  return null;
}
