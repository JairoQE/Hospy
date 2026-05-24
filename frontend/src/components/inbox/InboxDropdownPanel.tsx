import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useInboxChannel } from "../../hooks/useInboxChannel";
import type { InboxCanal } from "../../types/inbox";
import { InboxItemRow } from "./InboxItemRow";

const PREVIEW_LIMIT = 8;

interface Props {
  canal: InboxCanal;
  open: boolean;
  onClose: () => void;
}

export function InboxDropdownPanel({ canal, open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { items, loading, filter, setFilter, openItem, markAllRead, load } =
    useInboxChannel(canal, open);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = canal === "mensaje" ? "Mensajes" : "Notificaciones";
  const preview = items.slice(0, PREVIEW_LIMIT);
  const unreadInList = items.filter((i) => !i.is_read).length;

  return (
    <>
      <button
        type="button"
        className="inbox-dropdown-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="inbox-dropdown-panel"
        role="dialog"
        aria-label={title}
      >
        <header className="inbox-dropdown-head">
          <h2>{title}</h2>
        </header>

        <div className="inbox-dropdown-filters">
          <button
            type="button"
            className={filter === "todas" ? "is-active" : ""}
            onClick={() => setFilter("todas")}
          >
            Todas
          </button>
          <button
            type="button"
            className={filter === "no_leidas" ? "is-active" : ""}
            onClick={() => setFilter("no_leidas")}
          >
            No leídas
          </button>
        </div>

        {unreadInList > 0 && (
          <div className="inbox-dropdown-toolbar">
            <button type="button" className="inbox-dropdown-link" onClick={markAllRead}>
              Marcar todo como leído
            </button>
          </div>
        )}

        <div className="inbox-dropdown-section-head">
          <span>Anteriores</span>
          <Link
            to={`/bandeja?canal=${canal}`}
            className="inbox-dropdown-see-all"
            onClick={onClose}
          >
            Ver todas
          </Link>
        </div>

        <div className="inbox-dropdown-list">
          {loading && <p className="inbox-dropdown-empty muted">Cargando…</p>}
          {!loading && preview.length === 0 && (
            <p className="inbox-dropdown-empty muted">
              {filter === "no_leidas"
                ? "No tienes elementos sin leer."
                : canal === "mensaje"
                  ? "No tienes mensajes."
                  : "No tienes notificaciones."}
            </p>
          )}
          {!loading &&
            preview.map((item) => (
              <InboxItemRow
                key={item.id}
                item={item}
                compact
                onClick={() => openItem(item, onClose)}
              />
            ))}
        </div>
      </div>
    </>
  );
}
