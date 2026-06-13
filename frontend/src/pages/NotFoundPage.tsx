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
    document.title = `404 · Hospy`;
  }, []);

  return (
    <main className="not-found-page">
      <div className="not-found-spline" aria-hidden="true">
        <Suspense fallback={<div className="not-found-spline-loading" />}>
          <Spline scene={SPLINE_SCENE} />
        </Suspense>
      </div>
      <div className="not-found-overlay">
        <p className="not-found-code">404</p>
        <h1 className="not-found-title">{t("notFound.title")}</h1>
        <p className="not-found-message">{t("notFound.message")}</p>
        <Link to="/" className="btn btn-primary not-found-home">
          {t("notFound.backHome")}
        </Link>
      </div>
    </main>
  );
}
