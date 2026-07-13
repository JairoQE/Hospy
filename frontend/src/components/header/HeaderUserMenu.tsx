import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../../api/types";
import { displayName } from "../../utils/format";
import { IconChevronDown } from "../icons";
import { UserAvatar } from "../UserAvatar";

type Props = {
  user: User;
  onLogout: () => void;
  className?: string;
};

export function HeaderUserMenu({ user, onLogout, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  const handleLogout = () => {
    close();
    onLogout();
    navigate("/");
  };

  const name = displayName(user);

  return (
    <div
      className={`header-user-menu ${className}`.trim()}
      ref={wrapRef}
      data-tour="header-user-menu"
    >
      <button
        type="button"
        className="header-user-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <UserAvatar user={user} size="sm" />
        <span className="header-user-name">{name}</span>
        <IconChevronDown
          size={18}
          className={`header-user-chevron${open ? " is-open" : ""}`}
        />
      </button>
      {open && (
        <div
          id={menuId}
          className="header-user-dropdown"
          role="menu"
          aria-label="Menú de cuenta"
        >
          <div className="header-user-dropdown-head">
            <UserAvatar user={user} size="md" />
            <div>
              <strong>{name}</strong>
              <span className="muted">{user.email}</span>
            </div>
          </div>
          <Link to="/perfil" role="menuitem" className="header-user-item" onClick={close}>
            Mi perfil
          </Link>
          <Link
            to="/mis-reservas"
            role="menuitem"
            className="header-user-item"
            onClick={close}
          >
            Mis reservas
          </Link>
          {user.role === "propietario" && (
            <Link to="/panel" role="menuitem" className="header-user-item" onClick={close}>
              Mi panel
            </Link>
          )}
          {user.role === "patrocinador" && (
            <Link to="/patrocinio" role="menuitem" className="header-user-item" onClick={close}>
              Mis anuncios
            </Link>
          )}
          {user.role === "administrador" && (
            <>
              <Link to="/admin" role="menuitem" className="header-user-item" onClick={close}>
                Panel
              </Link>
              <Link
                to="/admin/inicio"
                role="menuitem"
                className="header-user-item"
                onClick={close}
              >
                Contenido inicio
              </Link>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className="header-user-item header-user-item--danger"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
