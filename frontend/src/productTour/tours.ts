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

function bookingsNavStep(): TourStepDef {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return {
    element: mobile ? '[data-tour="nav-bookings-mobile"]' : '[data-tour="nav-bookings-desktop"]',
    titleKey: "tour.bookingsTitle",
    descriptionKey: "tour.bookingsDesc",
    side: mobile ? "top" : "bottom",
    optional: true,
  };
}

function mobileNavStep(
  descKey: "tour.mobileNavDescGuest" | "tour.mobileNavDescOwner",
): TourStepDef {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  if (mobile) {
    return {
      element: '[data-tour="mobile-bottom-nav"]',
      titleKey: "tour.mobileNavTitle",
      descriptionKey: descKey,
      side: "top",
      optional: true,
    };
  }

  const owner = descKey === "tour.mobileNavDescOwner";
  return {
    element: owner ? OWNER_NAV_DESKTOP : '[data-tour="home-header-nav"]',
    titleKey: "tour.mobileNavTitleDesktop",
    descriptionKey: owner ? "tour.mobileNavDescDesktopOwner" : "tour.mobileNavDescDesktopGuest",
    side: owner ? "right" : "bottom",
    optional: true,
  };
}

function hospixStep(owner = false): TourStepDef {
  return {
    element: '[data-tour="hospix-assistant"]',
    titleKey: "tour.hospixTitle",
    descriptionKey: owner ? "tour.hospixDescOwner" : "tour.hospixDesc",
    side: "top",
    align: "end",
    optional: true,
  };
}

/** Secciones de exploración del home (compartidas por tour anónimo y huésped). */
const HOME_BROWSE_STEPS: TourStepDef[] = [
  {
    element: '[data-tour="home-geo"]',
    titleKey: "tour.homeGeoTitle",
    descriptionKey: "tour.homeGeoDesc",
    side: "bottom",
    optional: true,
  },
  {
    element: '[data-tour="home-featured"]',
    titleKey: "tour.homeFeaturedTitle",
    descriptionKey: "tour.homeFeaturedDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-recent"]',
    titleKey: "tour.homeRecentTitle",
    descriptionKey: "tour.homeRecentDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-browse-types"]',
    titleKey: "tour.homeBrowseTypesTitle",
    descriptionKey: "tour.homeBrowseTypesDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-browse-regions"]',
    titleKey: "tour.homeBrowseRegionsTitle",
    descriptionKey: "tour.homeBrowseRegionsDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-locations"]',
    titleKey: "tour.homeLocationsTitle",
    descriptionKey: "tour.homeLocationsDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-nearby"]',
    titleKey: "tour.homeNearbyTitle",
    descriptionKey: "tour.homeNearbyDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-app-promo"]',
    titleKey: "tour.homeAppPromoTitle",
    descriptionKey: "tour.homeAppPromoDesc",
    side: "top",
    optional: true,
  },
  {
    element: '[data-tour="home-results"]',
    titleKey: "tour.homeResultsTitle",
    descriptionKey: "tour.homeResultsDesc",
    side: "top",
    optional: true,
  },
];

function guestProfileStep(): TourStepDef {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return {
    element: mobile ? '[data-tour="nav-profile-mobile"]' : '[data-tour="header-user-menu"]',
    titleKey: "tour.guestProfileTitle",
    descriptionKey: mobile ? "tour.guestProfileDescMobile" : "tour.guestProfileDescDesktop",
    side: mobile ? "top" : "bottom",
    align: mobile ? "center" : "end",
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
        element: '[data-tour="home-header-nav"]',
        titleKey: "tour.homeHeaderNavTitle",
        descriptionKey: "tour.homeHeaderNavDesc",
        side: "bottom",
        optional: true,
      },
      {
        element: '[data-tour="home-header-tools"]',
        titleKey: "tour.homeHeaderToolsTitle",
        descriptionKey: "tour.homeHeaderToolsDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="home-hero"]',
        titleKey: "tour.homeHeroTitle",
        descriptionKey: "tour.homeHeroDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="home-search"]',
        titleKey: "tour.homeSearchTitle",
        descriptionKey: "tour.homeSearchDesc",
        side: "bottom",
      },
      ...HOME_BROWSE_STEPS,
      mobileNavStep("tour.mobileNavDescGuest"),
      {
        element: '[data-tour="product-tour-launcher"]',
        titleKey: "tour.homeTourLauncherTitle",
        descriptionKey: "tour.homeTourLauncherDesc",
        side: "left",
        optional: true,
      },
      hospixStep(),
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
        element: '[data-tour="home-header-nav"]',
        titleKey: "tour.homeHeaderNavTitle",
        descriptionKey: "tour.homeHeaderNavDesc",
        side: "bottom",
        optional: true,
      },
      {
        element: '[data-tour="home-header-tools"]',
        titleKey: "tour.guestHeaderToolsTitle",
        descriptionKey: "tour.guestHeaderToolsDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="header-inbox"]',
        titleKey: "tour.inboxTitle",
        descriptionKey: "tour.guestInboxDesc",
        side: "bottom",
        align: "end",
        optional: true,
      },
      {
        element: '[data-tour="home-hero"]',
        titleKey: "tour.homeHeroTitle",
        descriptionKey: "tour.homeHeroDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="home-search"]',
        titleKey: "tour.homeSearchTitle",
        descriptionKey: "tour.homeSearchDesc",
        side: "bottom",
      },
      ...HOME_BROWSE_STEPS.map((step) =>
        step.element === '[data-tour="home-recent"]'
          ? {
              ...step,
              titleKey: "tour.guestRecentTitle",
              descriptionKey: "tour.guestRecentDesc",
            }
          : step,
      ),
      bookingsNavStep(),
      guestProfileStep(),
      mobileNavStep("tour.mobileNavDescGuest"),
      {
        element: '[data-tour="product-tour-launcher"]',
        titleKey: "tour.homeTourLauncherTitle",
        descriptionKey: "tour.homeTourLauncherDesc",
        side: "left",
        optional: true,
      },
      hospixStep(),
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
      mobileNavStep("tour.mobileNavDescOwner"),
      hospixStep(true),
    ],
  },
  "property-detail": {
    id: "property-detail",
    steps: [
      {
        titleKey: "tour.detailWelcomeTitle",
        descriptionKey: "tour.detailWelcomeDesc",
      },
      {
        element: '[data-tour="property-header"]',
        titleKey: "tour.detailHeaderTitle",
        descriptionKey: "tour.detailHeaderDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="property-gallery"]',
        titleKey: "tour.detailGalleryTitle",
        descriptionKey: "tour.detailGalleryDesc",
        side: "bottom",
      },
      {
        element: '[data-tour="property-offers"]',
        titleKey: "tour.detailOffersTitle",
        descriptionKey: "tour.detailOffersDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="property-amenities"]',
        titleKey: "tour.detailAmenitiesTitle",
        descriptionKey: "tour.detailAmenitiesDesc",
        side: "bottom",
        optional: true,
      },
      {
        element: '[data-tour="property-description"]',
        titleKey: "tour.detailAboutTitle",
        descriptionKey: "tour.detailAboutDesc",
        side: "top",
      },
      {
        element: '[data-tour="property-contact"]',
        titleKey: "tour.detailContactTitle",
        descriptionKey: "tour.detailContactDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="property-availability"]',
        titleKey: "tour.detailAvailabilityTitle",
        descriptionKey: "tour.detailAvailabilityDesc",
        side: "top",
      },
      {
        element: '[data-tour="property-rooms"]',
        titleKey: "tour.detailRoomsTitle",
        descriptionKey: "tour.detailRoomsDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="property-sidebar-book"]',
        titleKey: "tour.detailSidebarTitle",
        descriptionKey: "tour.detailSidebarDesc",
        side: "left",
        optional: true,
      },
      {
        element: '[data-tour="property-services"]',
        titleKey: "tour.detailServicesTitle",
        descriptionKey: "tour.detailServicesDesc",
        side: "top",
      },
      {
        element: '[data-tour="property-policies"]',
        titleKey: "tour.detailPoliciesTitle",
        descriptionKey: "tour.detailPoliciesDesc",
        side: "top",
      },
      {
        element: '[data-tour="property-faq"]',
        titleKey: "tour.detailFaqTitle",
        descriptionKey: "tour.detailFaqDesc",
        side: "top",
        optional: true,
      },
      {
        element: '[data-tour="property-reviews"]',
        titleKey: "tour.detailReviewsTitle",
        descriptionKey: "tour.detailReviewsDesc",
        side: "top",
      },
      {
        element: '[data-tour="property-location"]',
        titleKey: "tour.detailLocationTitle",
        descriptionKey: "tour.detailLocationDesc",
        side: "top",
      },
      mobileNavStep("tour.mobileNavDescGuest"),
      hospixStep(),
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

  if (/^\/hospedajes\/\d+/.test(pathname)) {
    return "property-detail";
  }

  if (pathname.startsWith("/panel")) {
    if (/^\/panel\/hospedajes\/\d+/.test(pathname)) return null;
    return role === "propietario" ? "owner-panel" : null;
  }

  if (pathname === "/") {
    if (role === "propietario" || role === "administrador" || role === "patrocinador") {
      return "home";
    }
    return role === "huesped" ? "guest-app" : "home";
  }

  return null;
}