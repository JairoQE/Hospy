import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { useInboxSummary, type InboxSummary } from "../../hooks/useInboxSummary";
import { playInboxNotificationSound } from "../../utils/inboxNotificationSound";
import { HospyLogo } from "../brand/HospyLogo";
import { IconClose } from "../icons";
import "../../styles/inbox-notification.css";

type BannerItem = {
  id: number;
  message: string;
  href: string;
};

const AUTO_DISMISS_MS = 6000;

function buildMessage(
  prev: InboxSummary,
  next: InboxSummary,
  t: (key: string) => string,
  tVars: (key: string, vars: Record<string, string | number>) => string,
): { message: string; href: string } | null {
  const notifDelta = next.notificaciones - prev.notificaciones;
  const msgDelta = next.mensajes - prev.mensajes;

  if (notifDelta <= 0 && msgDelta <= 0) return null;

  if (notifDelta > 0 && msgDelta > 0) {
    return {
      message: t("inboxNotify.both"),
      href: "/bandeja",
    };
  }

  if (msgDelta > 0) {
    const key = msgDelta === 1 ? "inboxNotify.mensaje" : "inboxNotify.mensaje_plural";
    return {
      message: tVars(key, { n: msgDelta }),
      href: "/bandeja?canal=mensaje",
    };
  }

  const key = notifDelta === 1 ? "inboxNotify.notificacion" : "inboxNotify.notificacion_plural";
  return {
    message: tVars(key, { n: notifDelta }),
    href: "/bandeja?canal=notificacion",
  };
}

export function InboxNotificationWatcher() {
  const { user } = useAuth();
  const { t, tVars } = useLocaleCurrency();
  const { summary, refresh } = useInboxSummary();
  const prevRef = useRef<InboxSummary | null>(null);
  const readyRef = useRef(false);
  const [banners, setBanners] = useState<BannerItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const pushBanner = useCallback((message: string, href: string) => {
    const id = Date.now() + Math.random();
    setBanners((prev) => [...prev.slice(-2), { id, message, href }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  useEffect(() => {
    if (!user) {
      prevRef.current = null;
      readyRef.current = false;
      setBanners([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const prev = prevRef.current;
    if (!readyRef.current) {
      prevRef.current = summary;
      readyRef.current = true;
      return;
    }

    if (!prev) {
      prevRef.current = summary;
      return;
    }

    const payload = buildMessage(prev, summary, t, tVars);
    if (payload) {
      playInboxNotificationSound();
      pushBanner(payload.message, payload.href);
    }

    prevRef.current = summary;
  }, [summary, user, t, tVars, pushBanner]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refresh]);

  if (!user || banners.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="inbox-notification-host" aria-live="polite">
      {banners.map((item) => (
        <div key={item.id} className="inbox-notification-banner" role="status">
          <Link to={item.href} className="inbox-notification-banner-main" onClick={() => dismiss(item.id)}>
            <span className="inbox-notification-logo" aria-hidden>
              <HospyLogo height={28} variant="mark" alt="" />
            </span>
            <span className="inbox-notification-text">
              <span className="inbox-notification-brand">{t("inboxNotify.brandLine")}</span>
              <span className="inbox-notification-message">{item.message}</span>
            </span>
          </Link>
          <button
            type="button"
            className="inbox-notification-close"
            aria-label={t("inboxNotify.dismiss")}
            onClick={() => dismiss(item.id)}
          >
            <IconClose size={18} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
