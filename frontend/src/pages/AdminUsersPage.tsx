import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import type { AdminUserListItem, Booking, Paginated, User } from "../api/types";
import { AdminUsersToastHost, showAdminToast } from "../components/admin/AdminUsersToast";
import { useAuth } from "../context/AuthContext";
import { PrimeIcon } from "../components/PrimeIcon";
import { StatusBadge } from "../components/StatusBadge";
import {
  buildGuestInsights,
  computeAdminUsersMetrics,
  exportTableCsv,
  matchesGuestQuickFilter,
  matchesStatusFilter,
  sortUsers,
  type GuestInsights,
  type SortDir,
  type UsersStatusFilter,
  type UsersTab,
} from "../utils/adminUsersData";
import { displayName, formatDate, formatMoney, roleLabel } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";

const TAB_PAGE_SIZE = 10;

type GuestQuickFilter = "all" | "30d" | "5plus" | "highSpend";

async function fetchAllPages<T>(path: string): Promise<T[]> {
  let page = 1;
  const all: T[] = [];
  for (;;) {
    const data = await api.get<Paginated<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`);
    all.push(...unwrapList(data));
    if (!data.next) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

function UserAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const src = resolveMediaUrl(photoUrl ?? undefined);
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return (
      <img
        className="admin-users-avatar admin-users-avatar--photo"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <span className="admin-users-avatar" aria-hidden>
      {initial}
    </span>
  );
}

function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: string;
  current: string;
  dir: SortDir;
  onSort: (key: string) => void;
}) {
  const active = current === sortKey;
  return (
    <th>
      <button type="button" className="admin-users-sort-btn" onClick={() => onSort(sortKey)}>
        {label}
        <PrimeIcon
          name={active ? (dir === "asc" ? "pi-sort-up" : "pi-sort-down") : "pi-sort-alt"}
          size={12}
        />
      </button>
    </th>
  );
}

function EmptyPanel({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-users-empty">
      <PrimeIcon name={icon} size={40} />
      <p className="admin-users-empty-title">{title}</p>
      <p className="muted">{hint}</p>
      {action}
    </div>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<UsersTab>("todos");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [pendingSponsors, setPendingSponsors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>("all");
  const [guestQuickFilter, setGuestQuickFilter] = useState<GuestQuickFilter>("all");
  const [tablePage, setTablePage] = useState(1);
  const [sortKey, setSortKey] = useState("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moderationOpen, setModerationOpen] = useState<"owners" | "sponsors" | null>(null);
  const [adminRoleLoading, setAdminRoleLoading] = useState<number | null>(null);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === "administrador" && u.is_active).length,
    [users],
  );

  const guestInsights = useMemo(() => buildGuestInsights(bookings), [bookings]);

  const load = useCallback(() => {
    setLoading(true);
    setListError("");
    Promise.all([
      fetchAllPages<AdminUserListItem>("/auth/admin-usuarios/"),
      fetchAllPages<Booking>("/reservas/"),
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      api.get<User[] | Paginated<User>>("/auth/patrocinadores-pendientes/"),
    ])
      .then(([allUsers, allBookings, owners, sponsors]) => {
        setUsers(allUsers);
        setBookings(allBookings);
        setPendingOwners(unwrapList(owners));
        setPendingSponsors(unwrapList(sponsors));
      })
      .catch(() => setListError("No se pudo cargar los datos de usuarios."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () =>
      computeAdminUsersMetrics(
        users,
        pendingOwners.length,
        pendingSponsors.length,
        guestInsights,
        bookings,
      ),
    [users, pendingOwners.length, pendingSponsors.length, guestInsights, bookings],
  );

  const avgGuestSpend = useMemo(() => {
    const vals = [...guestInsights.values()];
    if (vals.length === 0) return 0;
    return vals.reduce((s, g) => s + g.totalSpend, 0) / vals.length;
  }, [guestInsights]);

  const tabUsers = useMemo(() => {
    let rows = users;
    if (tab === "propietarios") rows = rows.filter((u) => u.role === "propietario");
    else if (tab === "patrocinadores") rows = rows.filter((u) => u.role === "patrocinador");
    else if (tab === "huespedes") rows = rows.filter((u) => u.role === "huesped");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.first_name.toLowerCase().includes(q) ||
          u.last_name.toLowerCase().includes(q),
      );
    }
    rows = rows.filter((u) => matchesStatusFilter(u, statusFilter));
    if (tab === "huespedes" && guestQuickFilter !== "all") {
      rows = rows.filter((u) =>
        matchesGuestQuickFilter(guestInsights.get(u.id), guestQuickFilter, avgGuestSpend),
      );
    }
    return sortUsers(rows, sortKey, sortDir, guestInsights);
  }, [users, tab, search, statusFilter, guestQuickFilter, sortKey, sortDir, guestInsights, avgGuestSpend]);

  const tabCounts = useMemo(
    () => ({
      propietarios: users.filter((u) => u.role === "propietario").length,
      patrocinadores: users.filter((u) => u.role === "patrocinador").length,
      huespedes: users.filter((u) => u.role === "huesped").length,
      todos: users.length,
    }),
    [users],
  );

  const totalTablePages = Math.max(1, Math.ceil(tabUsers.length / TAB_PAGE_SIZE));
  const pageRows = tabUsers.slice(
    (tablePage - 1) * TAB_PAGE_SIZE,
    tablePage * TAB_PAGE_SIZE,
  );

  useEffect(() => {
    setTablePage(1);
    setSelectedPending(new Set());
  }, [tab, search, statusFilter, guestQuickFilter, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const moderateBulk = async (
    role: "owners" | "sponsors",
    aprobado: boolean,
    ids: number[],
  ) => {
    if (ids.length === 0) return;
    const label = aprobado ? "aprobar" : "rechazar";
    if (!window.confirm(`¿${label} ${ids.length} cuenta(s) seleccionada(s)?`)) return;
    setBulkLoading(true);
    const base =
      role === "owners" ? "/auth/propietarios" : "/auth/patrocinadores";
    try {
      await Promise.all(
        ids.map((id) =>
          api.post(`${base}/${id}/aprobar/`, { aprobado, motivo: "" }),
        ),
      );
      showAdminToast(
        aprobado
          ? `${ids.length} cuenta(s) aprobada(s) correctamente.`
          : `${ids.length} cuenta(s) rechazada(s).`,
        "success",
      );
      setSelectedPending(new Set());
      load();
    } catch (e) {
      showAdminToast(
        e instanceof ApiError ? e.message : "No se pudo completar la moderación.",
        "error",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const togglePendingSelect = (id: number) => {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCurrentTab = () => {
    const headers =
      tab === "huespedes"
        ? ["Nombre", "Correo", "Reservas", "Gasto total", "Última reserva", "Estado"]
        : ["Nombre", "Correo", "Rol", "Estado moderación", "Cuenta activa", "Registro"];
    const rows = tabUsers.map((u) => {
      const g = guestInsights.get(u.id);
      if (tab === "huespedes") {
        return [
          displayName(u),
          u.email,
          String(g?.bookingsCount ?? 0),
          String(g?.totalSpend ?? 0),
          g?.lastBookingAt ? formatDate(g.lastBookingAt) : "",
          u.is_active ? "Activa" : "Inactiva",
        ];
      }
      return [
        displayName(u),
        u.email,
        roleLabel(u.role),
        u.moderation_status || "—",
        u.is_active ? "Sí" : "No",
        formatDate(u.date_joined),
      ];
    });
    exportTableCsv(`hospy-usuarios-${tab}.csv`, headers, rows);
    showAdminToast("Lista exportada en CSV.", "info");
  };

  const toggleAdministrator = async (user: AdminUserListItem, makeAdmin: boolean) => {
    const name = displayName(user);
    const action = makeAdmin ? "asignar como administrador" : "quitar el rol de administrador";
    if (
      !window.confirm(
        makeAdmin
          ? `¿Asignar a ${name} (${user.email}) como administrador? Tendrá acceso al panel /admin.`
          : `¿Quitar el rol de administrador a ${name}? Volverá a ser huésped.`,
      )
    ) {
      return;
    }
    setAdminRoleLoading(user.id);
    try {
      await api.post(`/auth/admin-usuarios/${user.id}/administrador/`, { admin: makeAdmin });
      showAdminToast(
        makeAdmin
          ? `${name} ahora es administrador.`
          : `Se quitó el rol de administrador a ${name}.`,
        "success",
      );
      load();
    } catch (e) {
      showAdminToast(
        e instanceof ApiError ? e.message : `No se pudo ${action}.`,
        "error",
      );
    } finally {
      setAdminRoleLoading(null);
    }
  };

  const pendingList =
    moderationOpen === "owners"
      ? pendingOwners
      : moderationOpen === "sponsors"
        ? pendingSponsors
        : [];

  return (
    <div className="admin-page admin-users-hub">
      <AdminUsersToastHost />

      <header className="admin-users-header">
        <div>
          <h1 className="admin-page-title">Usuarios</h1>
          <p className="admin-page-sub">
            Administra propietarios, patrocinadores y huéspedes desde un solo lugar.
          </p>
        </div>
        <div className="admin-users-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={exportCurrentTab}
            disabled={loading || tabUsers.length === 0}
            title="Descargar la vista actual en CSV"
          >
            <PrimeIcon name="pi-download" size={14} />
            Exportar CSV
          </button>
          <Link to="/admin/moderacion" className="btn btn-primary btn-sm">
            <PrimeIcon name="pi-shield" size={14} />
            Centro de moderación
          </Link>
        </div>
      </header>

      {!loading && !listError && (
        <section className="admin-users-kpi-grid" aria-label="Métricas de usuarios">
          <article className="admin-kpi-card">
            <div className="admin-kpi-card-top">
              <span className="admin-kpi-icon">
                <PrimeIcon name="pi-users" size={18} />
              </span>
            </div>
            <p className="admin-kpi-value">{metrics.totalUsers}</p>
            <p className="admin-kpi-label">Usuarios registrados</p>
            <p className="admin-kpi-sublabel">{metrics.activeAccounts} cuentas activas</p>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-card-top">
              <span className="admin-kpi-icon">
                <PrimeIcon name="pi-clock" size={18} />
              </span>
              {metrics.pendingModeration > 0 && (
                <span className="admin-users-badge admin-users-badge--warn">
                  {metrics.pendingModeration}
                </span>
              )}
            </div>
            <p className="admin-kpi-value">{metrics.pendingModeration}</p>
            <p className="admin-kpi-label">Pendientes de revisión</p>
            <p className="admin-kpi-sublabel">Propietarios y patrocinadores</p>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-card-top">
              <span className="admin-kpi-icon">
                <PrimeIcon name="pi-home" size={18} />
              </span>
            </div>
            <p className="admin-kpi-value">{metrics.ownersApproved}</p>
            <p className="admin-kpi-label">Propietarios aprobados</p>
            <p className="admin-kpi-sublabel">{tabCounts.propietarios} en total</p>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-card-top">
              <span className="admin-kpi-icon">
                <PrimeIcon name="pi-wallet" size={18} />
              </span>
            </div>
            <p className="admin-kpi-value">{formatMoney(metrics.guestRevenue)}</p>
            <p className="admin-kpi-label">Volumen de reservas</p>
            <p className="admin-kpi-sublabel">
              {metrics.guestsWithBookings} huéspedes · {metrics.totalBookings} reservas
            </p>
          </article>
        </section>
      )}

      <nav className="admin-users-tabs" aria-label="Grupos de usuarios">
        {(
          [
            ["todos", "Todos", tabCounts.todos],
            ["propietarios", "Propietarios", tabCounts.propietarios],
            ["patrocinadores", "Patrocinadores", tabCounts.patrocinadores],
            ["huespedes", "Huéspedes", tabCounts.huespedes],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`admin-users-tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
            <span className="admin-users-tab-count">{count}</span>
            {id === "propietarios" && pendingOwners.length > 0 && (
              <span className="admin-users-badge admin-users-badge--warn">
                {pendingOwners.length} pend.
              </span>
            )}
            {id === "patrocinadores" && pendingSponsors.length > 0 && (
              <span className="admin-users-badge admin-users-badge--warn">
                {pendingSponsors.length} pend.
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="admin-users-toolbar-card">
        <form className="admin-users-toolbar" onSubmit={handleSearch} role="search">
          <div className="admin-users-search">
            <span className="admin-users-search-icon" aria-hidden>
              <PrimeIcon name="pi-search" size={16} />
            </span>
            <input
              type="search"
              placeholder="Buscar por nombre o correo…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar por nombre o correo"
            />
          </div>
          <div className="admin-users-toolbar-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Buscar
            </button>
            {(search || statusFilter !== "all" || guestQuickFilter !== "all") && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("all");
                  setGuestQuickFilter("all");
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </form>

        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Estado</span>
          {(
            [
              ["all", "Todos"],
              ["pendiente", "Pendientes"],
              ["aprobado", "Aprobados"],
              ["rechazado", "Rechazados"],
              ["inactivo", "Inactivos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${statusFilter === id ? " is-active" : ""}`}
              onClick={() => setStatusFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "huespedes" && (
          <div className="admin-users-filters">
            <span className="admin-users-filters-label">Huéspedes</span>
            {(
              [
                ["all", "Todos"],
                ["30d", "Últimos 30 días"],
                ["5plus", "5+ reservas"],
                ["highSpend", "Alto gasto"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`admin-users-chip${guestQuickFilter === id ? " is-active" : ""}`}
                onClick={() => setGuestQuickFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {(tab === "propietarios" || tab === "todos") && (
          <div className="admin-users-quick-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setModerationOpen("owners")}
            >
              Propietarios pendientes ({pendingOwners.length})
            </button>
          </div>
        )}
        {(tab === "patrocinadores" || tab === "todos") && (
          <div className="admin-users-quick-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setModerationOpen("sponsors")}
            >
              Patrocinadores pendientes ({pendingSponsors.length})
            </button>
          </div>
        )}
      </div>

      {listError && <p className="error-msg">{listError}</p>}
      {loading && <p className="admin-loading">Cargando usuarios…</p>}

      {!loading && !listError && (
        <section className="admin-users-table-card">
          {tab === "huespedes" && (
            <div className="admin-users-tab-metrics">
              <span>
                Con reservas: <strong>{metrics.guestsWithBookings}</strong>
              </span>
              <span>
                Reservas totales: <strong>{metrics.totalBookings}</strong>
              </span>
              <span>
                Gasto promedio: <strong>{formatMoney(avgGuestSpend)}</strong>
              </span>
            </div>
          )}
          {tab === "patrocinadores" && (
            <div className="admin-users-tab-metrics">
              <span>
                Activos: <strong>{metrics.sponsorsApproved}</strong>
              </span>
              <span>
                Pendientes: <strong>{pendingSponsors.length}</strong>
              </span>
            </div>
          )}

          {tabUsers.length === 0 ? (
            <EmptyPanel
              icon="pi-users"
              title="Sin resultados"
              hint="Prueba otros filtros o limpia la búsqueda."
            />
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--users">
                  <thead>
                    <tr>
                      <SortableTh
                        label="Nombre"
                        sortKey="name"
                        current={sortKey}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <SortableTh
                        label="Correo"
                        sortKey="email"
                        current={sortKey}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      {tab === "huespedes" ? (
                        <>
                          <SortableTh
                            label="Reservas"
                            sortKey="bookings"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <SortableTh
                            label="Gasto total"
                            sortKey="spend"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <th>Última reserva</th>
                          <th>Estado</th>
                        </>
                      ) : tab === "propietarios" ? (
                        <>
                          <SortableTh
                            label="Hospedajes"
                            sortKey="hospedajes"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <th>Moderación</th>
                          <SortableTh
                            label="Registro"
                            sortKey="joined"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                        </>
                      ) : (
                        <>
                          {tab === "todos" && <th>Rol</th>}
                          <th>Estado</th>
                          <SortableTh
                            label="Reservas"
                            sortKey="bookings"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                          <SortableTh
                            label="Registro"
                            sortKey="joined"
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                          />
                        </>
                      )}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        tab={tab}
                        insights={guestInsights.get(u.id)}
                        currentUserId={me?.id}
                        adminCount={adminCount}
                        adminRoleLoading={adminRoleLoading === u.id}
                        onToggleAdministrator={toggleAdministrator}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {totalTablePages > 1 && (
                <div className="admin-users-pagination">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <span className="muted">
                    {tablePage} / {totalTablePages} · {tabUsers.length} resultados
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={tablePage >= totalTablePages}
                    onClick={() => setTablePage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {moderationOpen && (
        <div
          className="admin-users-drawer-overlay"
          role="presentation"
          onClick={() => setModerationOpen(null)}
        >
          <aside
            className="admin-users-drawer"
            role="dialog"
            aria-labelledby="moderation-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-users-drawer-header">
              <h2 id="moderation-drawer-title">
                {moderationOpen === "owners"
                  ? "Propietarios pendientes"
                  : "Patrocinadores pendientes"}
              </h2>
              <button
                type="button"
                className="map-modal-close"
                onClick={() => setModerationOpen(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            {pendingList.length === 0 ? (
              <EmptyPanel
                icon="pi-check-circle"
                title="Sin solicitudes pendientes"
                hint="Cuando lleguen nuevas cuentas aparecerán aquí."
                action={
                  <Link to="/admin/moderacion" className="admin-link-btn">
                    Ver historial en moderación
                  </Link>
                }
              />
            ) : (
              <>
                <div className="admin-users-drawer-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={bulkLoading || selectedPending.size === 0}
                    onClick={() =>
                      moderateBulk(moderationOpen, true, [...selectedPending])
                    }
                    title="Aprobar cuentas seleccionadas"
                  >
                    Aprobar seleccionados ({selectedPending.size})
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={bulkLoading || selectedPending.size === 0}
                    onClick={() =>
                      moderateBulk(moderationOpen, false, [...selectedPending])
                    }
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setSelectedPending(new Set(pendingList.map((p) => p.id)))
                    }
                  >
                    Seleccionar todos
                  </button>
                </div>
                <ul className="admin-users-pending-list">
                  {pendingList.map((p) => (
                    <li key={p.id} className="admin-users-pending-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedPending.has(p.id)}
                          onChange={() => togglePendingSelect(p.id)}
                        />
                        <span>
                          <strong>{displayName(p)}</strong>
                          <span className="muted"> · {p.email}</span>
                        </span>
                      </label>
                      <Link
                        to={`/perfil/${p.id}`}
                        className="admin-users-row-link"
                        title="Ver perfil"
                      >
                        Ver perfil
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/admin/moderacion"
                  className="admin-link-btn"
                  onClick={() => setModerationOpen(null)}
                >
                  Abrir moderación completa
                </Link>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user: u,
  tab,
  insights,
  currentUserId,
  adminCount,
  adminRoleLoading,
  onToggleAdministrator,
}: {
  user: AdminUserListItem;
  tab: UsersTab;
  insights?: GuestInsights;
  currentUserId?: number;
  adminCount: number;
  adminRoleLoading: boolean;
  onToggleAdministrator: (user: AdminUserListItem, makeAdmin: boolean) => void;
}) {
  const name = displayName(u);
  const isAdmin = u.role === "administrador";
  const isSelf = currentUserId === u.id;
  const canDemote =
    isAdmin && !isSelf && adminCount > 1 && u.is_active;
  const canPromote = !isAdmin && u.is_active;
  const moderationBadge =
    u.moderation_status ? (
      <StatusBadge status={u.moderation_status} />
    ) : u.is_active ? (
      <span className="badge badge-ok">Activo</span>
    ) : (
      <span className="badge badge-muted">Inactivo</span>
    );

  return (
    <tr>
      <td>
        <div className="admin-users-name-cell">
          <UserAvatar name={name} photoUrl={u.photo_url} />
          <span>{name}</span>
        </div>
      </td>
      <td>{u.email}</td>
      {tab === "huespedes" ? (
        <>
          <td>
            <strong>{insights?.bookingsCount ?? 0}</strong>
            {(insights?.bookingsCount ?? 0) > 0 && (
              <Link
                to="/admin/reservas"
                className="admin-users-row-link"
                title="Ver reservas en el panel"
              >
                Ver
              </Link>
            )}
          </td>
          <td>{formatMoney(insights?.totalSpend ?? 0)}</td>
          <td>
            {insights?.lastBookingAt ? formatDate(insights.lastBookingAt) : "—"}
          </td>
          <td>
            {insights?.hasActiveBooking ? (
              <span className="badge badge-ok">Con reserva activa</span>
            ) : (
              <span className="badge badge-muted">Sin reserva activa</span>
            )}
          </td>
        </>
      ) : tab === "propietarios" ? (
        <>
          <td>{u.hospedajes_count}</td>
          <td>{moderationBadge}</td>
          <td>{formatDate(u.date_joined)}</td>
        </>
      ) : (
        <>
          {tab === "todos" && <td>{roleLabel(u.role)}</td>}
          <td>{moderationBadge}</td>
          <td>{insights?.bookingsCount ?? u.bookings_count}</td>
          <td>{formatDate(u.date_joined)}</td>
        </>
      )}
      <td>
        <div className="admin-users-row-actions">
          <Link
            to={`/perfil/${u.id}`}
            className="btn btn-ghost btn-sm"
            title="Ver perfil público"
          >
            Perfil
          </Link>
          {u.role === "propietario" && u.moderation_status === "aprobado" && (
            <Link
              to={`/anfitrion/${u.id}`}
              className="btn btn-ghost btn-sm"
              title="Ver tienda del anfitrión"
            >
              Tienda
            </Link>
          )}
          {canPromote && (
            <button
              type="button"
              className="btn btn-outline btn-sm admin-users-admin-btn"
              disabled={adminRoleLoading}
              title="Dar acceso al panel de administración"
              onClick={() => onToggleAdministrator(u, true)}
            >
              {adminRoleLoading ? "…" : "Hacer admin"}
            </button>
          )}
          {isAdmin && (
            <span className="badge badge-ok admin-users-admin-badge">Admin</span>
          )}
          {canDemote && (
            <button
              type="button"
              className="btn btn-ghost btn-sm admin-users-admin-btn admin-users-admin-btn--danger"
              disabled={adminRoleLoading}
              title="Quitar acceso al panel de administración"
              onClick={() => onToggleAdministrator(u, false)}
            >
              {adminRoleLoading ? "…" : "Quitar admin"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
