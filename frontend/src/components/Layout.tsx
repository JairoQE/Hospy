import { Outlet, useLocation } from "react-router-dom";
import { SessionTimeoutWatcher } from "./SessionTimeoutWatcher";
import { SiteHeader } from "./header/SiteHeader";
import { MobileBottomNav } from "./MobileBottomNav";

export function Layout() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <div className={`app-shell${isAdminRoute ? " app-shell--admin" : ""}`}>
      <SessionTimeoutWatcher />
      {!isAdminRoute && <SiteHeader />}
      <main className="site-main">
        <Outlet />
      </main>
      {!isAdminRoute && (
        <footer className="site-footer">
          <div className="container">
            <p>Hospy — Hoteles · Hostales · Hospedajes verificados en Perú</p>
          </div>
        </footer>
      )}
      {!isAdminRoute && <MobileBottomNav />}
    </div>
  );
}
