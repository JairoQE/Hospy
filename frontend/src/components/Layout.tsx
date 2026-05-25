import { Outlet, useLocation } from "react-router-dom";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { SponsorAdsProvider } from "../context/SponsorAdsContext";
import { SponsorAdSlot } from "./ads/SponsorAdSlot";
import { SessionTimeoutWatcher } from "./SessionTimeoutWatcher";
import { SiteHeader } from "./header/SiteHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { SiteFooter } from "./footer/SiteFooter";

export function Layout() {
  const { pathname } = useLocation();
  const { language, currency } = useLocaleCurrency();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthMinimal =
    pathname === "/login" ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar");

  return (
    <div
      key={`${language}-${currency}`}
      className={`app-shell${isAdminRoute ? " app-shell--admin" : ""}`}
    >
      <SessionTimeoutWatcher />
      {!isAdminRoute && !isAuthMinimal && (
        <SponsorAdsProvider>
          <SiteHeader />
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
      {(isAdminRoute || isAuthMinimal) && (
        <>
          {!isAdminRoute && <SiteHeader />}
          <main className="site-main">
            <Outlet />
          </main>
        </>
      )}
      {!isAdminRoute && <SiteFooter />}
      {!isAdminRoute && <MobileBottomNav />}
    </div>
  );
}
