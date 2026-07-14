import { Outlet, useLocation } from "react-router-dom";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { SponsorAdsProvider } from "../context/SponsorAdsContext";
import { SponsorAdSlot } from "./ads/SponsorAdSlot";
import { SessionTimeoutWatcher } from "./SessionTimeoutWatcher";
import { SiteHeader } from "./header/SiteHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { SiteFooter } from "./footer/SiteFooter";
import { AppToastHost } from "./ui/AppToast";
import { VerifyIdentityPromoBanner } from "./profile/VerifyIdentityPromoBanner";

export function Layout() {
  const { pathname } = useLocation();
  const { language, currency } = useLocaleCurrency();
  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerPanelRoute = pathname.startsWith("/panel");
  const isSponsorPanelRoute = pathname.startsWith("/patrocinio");
  const isPanelShellRoute = isAdminRoute || isOwnerPanelRoute || isSponsorPanelRoute;
  const isAuthMinimal =
    pathname === "/login" ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar");
  const hideBottomNav = isAdminRoute || isAuthMinimal;

  return (
    <div
      key={`${language}-${currency}`}
      className={`app-shell${isAdminRoute ? " app-shell--admin" : ""}${isOwnerPanelRoute ? " app-shell--owner" : ""}${isSponsorPanelRoute ? " app-shell--sponsor" : ""}`}
    >
      <SessionTimeoutWatcher />
      {!isPanelShellRoute && !isAuthMinimal && (
        <SponsorAdsProvider>
          <SiteHeader />
          <VerifyIdentityPromoBanner variant="compact" />
          <SponsorAdSlot variant="mobile-banner" />
          <div className="site-content-grid">
            <SponsorAdSlot variant="sidebar" side="left" />
            <main className="site-main">
              <Outlet />
            </main>
            <SponsorAdSlot variant="sidebar" side="right" />
          </div>
        </SponsorAdsProvider>
      )}
      {(isPanelShellRoute || isAuthMinimal) && (
        <>
          {!isPanelShellRoute && <SiteHeader />}
          <main className="site-main">
            <Outlet />
          </main>
        </>
      )}
      {!isPanelShellRoute && <SiteFooter />}
      {!hideBottomNav && <MobileBottomNav />}
      <AppToastHost />
    </div>
  );
}
