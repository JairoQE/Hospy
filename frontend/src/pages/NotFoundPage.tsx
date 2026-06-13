import { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { hideSplineBadge, watchSplineBadge } from "../utils/hideSplineBadge";
import "../styles/not-found.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SPLINE_SCENE =
  "https://prod.spline.design/uVVJwHUMQ0aCv8Wv/scene.splinecode";

export function NotFoundPage() {
  const { t } = useLocaleCurrency();

  useEffect(() => {
    document.title = "404 · Hospy";
    return watchSplineBadge();
  }, []);

  return (
    <main className="not-found-page">
      <Link to="/" className="not-found-home-link">
        {t("notFound.backHome")}
      </Link>
      <div className="not-found-spline-wrap">
        <Suspense fallback={<div className="not-found-spline-loading" />}>
          <Spline scene={SPLINE_SCENE} onLoad={() => hideSplineBadge()} />
        </Suspense>
        <div className="not-found-spline-badge-cover" aria-hidden="true" />
      </div>
    </main>
  );
}
