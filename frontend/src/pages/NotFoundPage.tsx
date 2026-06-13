import { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import "../styles/not-found.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SPLINE_SCENE =
  "https://prod.spline.design/uVVJwHUMQ0aCv8Wv/scene.splinecode";

export function NotFoundPage() {
  const { t } = useLocaleCurrency();

  useEffect(() => {
    document.title = "404 · Hospy";
  }, []);

  useEffect(() => {
    const hideSplineBadge = () => {
      const root = document.querySelector(".not-found-page");
      if (!root) return;
      root.querySelectorAll('a[href*="spline"]').forEach((el) => {
        el.setAttribute("aria-hidden", "true");
        (el as HTMLElement).style.cssText =
          "display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;";
      });
    };

    hideSplineBadge();
    const root = document.querySelector(".not-found-page");
    if (!root) return;

    const observer = new MutationObserver(hideSplineBadge);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="not-found-page">
      <Link to="/" className="not-found-home-link">
        {t("notFound.backHome")}
      </Link>
      <Suspense fallback={<div className="not-found-spline-loading" />}>
        <Spline scene={SPLINE_SCENE} />
      </Suspense>
    </main>
  );
}
