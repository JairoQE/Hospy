import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { fetchMessageReports, resolveMessageReport } from "../api/messaging";
import {
  fetchDisputedRefunds,
  resolveDisputedRefund,
  type DisputedRefund,
} from "../api/bookingRefunds";
import { unwrapList } from "../api/unwrap";
import type {
  AccommodationDetail,
  MessageReport,
  Paginated,
  SponsorAdReport,
  User,
} from "../api/types";
import { AdminUsersToastHost, showAdminToast } from "../components/admin/AdminUsersToast";
import { RejectReasonPanel } from "../components/admin/moderation/RejectReasonPanel";
import { PrimeIcon } from "../components/PrimeIcon";
import {
  buildRejectMotivo,
  daysPending,
  isWithinAgeFilter,
  isModerationAlreadyHandledError,
  matchesSearchQuery,
  REJECT_PRESETS_ACCOUNT,
  REJECT_PRESETS_ACCOMMODATION,
  type ModerationAgeFilter,
  type ModerationTab,
} from "../utils/adminModerationData";
import { displayName, formatDate, formatMoney, typeLabel } from "../utils/format";
import { resolveMediaUrl } from "../utils/media";
import { formatRelativeTime } from "../utils/relativeTime";

type RejectState = {
  preset: string;
  custom: string;
};

const emptyReject = (): RejectState => ({ preset: "", custom: "" });

export function AdminModerationPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<ModerationTab>("hospedajes");
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [pendingSponsors, setPendingSponsors] = useState<User[]>([]);
  const [adReports, setAdReports] = useState<SponsorAdReport[]>([]);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [refundDisputes, setRefundDisputes] = useState<DisputedRefund[]>([]);
  const [refundWarnings, setRefundWarnings] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<AccommodationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState<ModerationAgeFilter>("all");

  const [selectedAcc, setSelectedAcc] = useState<Set<number>>(new Set());
  const [rejectingAcc, setRejectingAcc] = useState<number | null>(null);
  const [rejectingOwner, setRejectingOwner] = useState<number | null>(null);
  const [rejectingSponsor, setRejectingSponsor] = useState<number | null>(null);

  const [rejectAcc, setRejectAcc] = useState<Record<number, RejectState>>({});
  const [rejectOwner, setRejectOwner] = useState<Record<number, RejectState>>({});
  const [rejectSponsor, setRejectSponsor] = useState<Record<number, RejectState>>({});

  const [warningAnuncio, setWarningAnuncio] = useState<Record<number, string>>({});
  const [notasAnuncio] = useState<Record<number, string>>({});
  const [msgNotes, setMsgNotes] = useState<Record<number, string>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [moderating, setModerating] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      api.get<User[] | Paginated<User>>("/auth/patrocinadores-pendientes/"),
      api.get<SponsorAdReport[] | Paginated<SponsorAdReport>>("/anuncios/reportados/"),
      api.get<Paginated<AccommodationDetail> | AccommodationDetail[]>(
        "/hospedajes/pendientes/",
      ),
      fetchMessageReports("pendiente").catch(() => [] as MessageReport[]),
      fetchDisputedRefunds().catch(() => [] as DisputedRefund[]),
    ])
      .then(([owners, sponsors, reports, hospedajes, messages, refunds]) => {
        setPendingOwners(unwrapList(owners));
        setPendingSponsors(unwrapList(sponsors));
        setAdReports(unwrapList(reports));
        setPending(unwrapList(hospedajes));
        setMessageReports(messages);
        setRefundDisputes(refunds);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("tab") === "mensajes" || searchParams.get("tab") === "reembolsos") {
      setTab("reportes");
    }
    const hash = location.hash.replace("#", "");
    if (hash === "propietarios-pendientes" || hash === "patrocinadores-pendientes") {
      setTab("cuentas");
    } else if (hash === "hospedajes-pendientes") setTab("hospedajes");
    else if (hash === "anuncios-reportados" || hash === "mensajes-reportados") {
      setTab("reportes");
    }
  }, [location.hash, searchParams]);

  const metrics = useMemo(
    () => ({
      hospedajes: pending.length,
      propietarios: pendingOwners.length,
      patrocinadores: pendingSponsors.length,
      reportes: adReports.length + messageReports.length + refundDisputes.length,
      total:
        pending.length +
        pendingOwners.length +
        pendingSponsors.length +
        adReports.length +
        messageReports.length +
        refundDisputes.length,
    }),
    [pending, pendingOwners, pendingSponsors, adReports, messageReports, refundDisputes],
  );

  const filteredPending = useMemo(
    () =>
      pending.filter(
        (h) =>
          matchesSearchQuery(search, [
            h.name,
            h.city,
            h.owner_email,
            h.propietario_nombre,
            String(h.id),
          ]) && isWithinAgeFilter(h.created_at, ageFilter),
      ),
    [pending, search, ageFilter],
  );

  const filteredOwners = useMemo(
    () =>
      pendingOwners.filter(
        (o) =>
          matchesSearchQuery(search, [displayName(o), o.email, o.phone, String(o.id)]) &&
          isWithinAgeFilter(o.date_joined, ageFilter),
      ),
    [pendingOwners, search, ageFilter],
  );

  const filteredSponsors = useMemo(
    () =>
      pendingSponsors.filter(
        (s) =>
          matchesSearchQuery(search, [displayName(s), s.email, String(s.id)]) &&
          isWithinAgeFilter(s.date_joined, ageFilter),
      ),
    [pendingSponsors, search, ageFilter],
  );

  const filteredAdReports = useMemo(
    () =>
      adReports.filter(
        (r) =>
          matchesSearchQuery(search, [
            r.ad_title,
            r.sponsor_email,
            r.sponsor_name,
            r.reporter_name,
            String(r.id),
          ]) && isWithinAgeFilter(r.created_at, ageFilter),
      ),
    [adReports, search, ageFilter],
  );

  const filteredMessages = useMemo(
    () =>
      messageReports.filter(
        (r) =>
          matchesSearchQuery(search, [
            r.reporter_name,
            r.reporter_email,
            r.sender_name,
            r.accommodation_name,
            String(r.id),
          ]) && isWithinAgeFilter(r.created_at, ageFilter),
      ),
    [messageReports, search, ageFilter],
  );

  const getReject = (
    map: Record<number, RejectState>,
    id: number,
    setMap: Dispatch<SetStateAction<Record<number, RejectState>>>,
  ) => {
    const cur = map[id] ?? emptyReject();
    return {
      preset: cur.preset,
      custom: cur.custom,
      setPreset: (v: string) => setMap({ ...map, [id]: { ...cur, preset: v } }),
      setCustom: (v: string) => setMap({ ...map, [id]: { ...cur, custom: v } }),
    };
  };

  const runModeration = async (
    key: string,
    request: () => Promise<unknown>,
    onSuccess: () => void,
    successMessage: string,
  ) => {
    if (moderating.has(key)) return;
    setModerating((prev) => new Set(prev).add(key));
    try {
      await request();
      showAdminToast(successMessage, "success");
      onSuccess();
      load();
    } catch (e) {
      if (isModerationAlreadyHandledError(e)) {
        showAdminToast(successMessage, "success");
        onSuccess();
        load();
        return;
      }
      showAdminToast(e instanceof ApiError ? e.message : "Error", "error");
    } finally {
      setModerating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const moderateOwner = (id: number, aprobado: boolean, motivo = "") =>
    runModeration(
      `owner-${id}`,
      () => api.post(`/auth/propietarios/${id}/aprobar/`, { aprobado, motivo }),
      () => setRejectingOwner(null),
      aprobado ? "Propietario aprobado." : "Cuenta rechazada.",
    );

  const moderateSponsor = (id: number, aprobado: boolean, motivo = "") =>
    runModeration(
      `sponsor-${id}`,
      () => api.post(`/auth/patrocinadores/${id}/aprobar/`, { aprobado, motivo }),
      () => setRejectingSponsor(null),
      aprobado ? "Patrocinador aprobado." : "Cuenta rechazada.",
    );

  const moderateAccommodation = (id: number, aprobado: boolean, motivo = "") =>
    runModeration(
      `acc-${id}`,
      () => api.post(`/hospedajes/${id}/aprobar/`, { aprobado, motivo }),
      () => {
        setRejectingAcc(null);
        setSelectedAcc((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      aprobado ? "Hospedaje publicado." : "Hospedaje rechazado.",
    );

  const resolveAdReport = async (id: number, accion: "baja" | "descartar") => {
    try {
      await api.post(`/anuncios/reportados/${id}/resolver/`, {
        accion,
        warning: accion === "baja" ? warningAnuncio[id] ?? "" : "",
        admin_notes: notasAnuncio[id] ?? "",
      });
      showAdminToast(
        accion === "baja" ? "Anuncio dado de baja." : "Reporte descartado.",
        "success",
      );
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "Error", "error");
    }
  };

  const resolveMessage = async (id: number, status: "revisado" | "descartado") => {
    try {
      await resolveMessageReport(id, { status, admin_notes: msgNotes[id] ?? "" });
      showAdminToast("Reporte de mensaje actualizado.", "success");
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "Error", "error");
    }
  };

  const bulkApproveAccommodations = async () => {
    const ids = [...selectedAcc];
    if (ids.length === 0) return;
    if (!window.confirm(`¿Aprobar ${ids.length} hospedaje(s) seleccionado(s)?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        ids.map((id) => api.post(`/hospedajes/${id}/aprobar/`, { aprobado: true, motivo: "" })),
      );
      showAdminToast(`${ids.length} hospedaje(s) aprobado(s).`, "success");
      setSelectedAcc(new Set());
      load();
    } catch (e) {
      showAdminToast(e instanceof ApiError ? e.message : "Error en aprobación masiva", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const toggleAcc = (id: number) => {
    setSelectedAcc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showHospedajes = tab === "hospedajes" || tab === "todos";
  const showCuentas = tab === "cuentas" || tab === "todos";
  const showReportes = tab === "reportes" || tab === "todos";

  return (
    <div className="admin-page admin-mod-hub">
      <AdminUsersToastHost />

      <header className="admin-users-header">
        <div>
          <h1 className="admin-page-title">Moderación</h1>
          <p className="admin-page-sub">
            Revisa hospedajes, cuentas y reportes. Aprueba o rechaza con motivo claro para el
            usuario.
          </p>
        </div>
        <Link to="/admin/usuarios" className="btn btn-outline btn-sm">
          <PrimeIcon name="pi-users" size={14} />
          Ver usuarios
        </Link>
      </header>

      {!loading && (
        <section className="admin-users-kpi-grid" aria-label="Resumen de pendientes">
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{metrics.total}</p>
            <p className="admin-kpi-label">Total pendientes</p>
          </article>
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{metrics.hospedajes}</p>
            <p className="admin-kpi-label">Hospedajes</p>
          </article>
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{metrics.propietarios + metrics.patrocinadores}</p>
            <p className="admin-kpi-label">Cuentas por revisar</p>
          </article>
          <article className="admin-kpi-card">
            <p className="admin-kpi-value">{metrics.reportes}</p>
            <p className="admin-kpi-label">Reportes</p>
          </article>
        </section>
      )}

      <nav className="admin-users-tabs" aria-label="Categorías de moderación">
        {(
          [
            ["todos", "Todos", metrics.total],
            ["hospedajes", "Hospedajes", metrics.hospedajes],
            ["cuentas", "Cuentas", metrics.propietarios + metrics.patrocinadores],
            ["reportes", "Reportes", metrics.reportes],
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
              placeholder="Buscar por título, nombre, correo o ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar pendientes"
            />
          </div>
          <div className="admin-users-toolbar-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Buscar
            </button>
            {(search || ageFilter !== "all") && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setAgeFilter("all");
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
        <div className="admin-users-filters">
          <span className="admin-users-filters-label">Antigüedad</span>
          {(
            [
              ["all", "Todos"],
              ["7d", "Últimos 7 días"],
              ["30d", "Últimos 30 días"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-users-chip${ageFilter === id ? " is-active" : ""}`}
              onClick={() => setAgeFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="admin-loading">Cargando cola de moderación…</p>}

      {!loading && showHospedajes && (
        <section className="admin-mod-section" id="hospedajes-pendientes">
          <div className="admin-mod-section-head">
            <h2 className="admin-section-title">Hospedajes pendientes</h2>
            {filteredPending.length > 0 && tab === "hospedajes" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setSelectedAcc(
                    selectedAcc.size === filteredPending.length
                      ? new Set()
                      : new Set(filteredPending.map((h) => h.id)),
                  )
                }
              >
                {selectedAcc.size === filteredPending.length
                  ? "Quitar selección"
                  : "Seleccionar todos"}
              </button>
            )}
          </div>
          {filteredPending.length === 0 ? (
            <ModEmpty icon="pi-home" title="Sin hospedajes pendientes" />
          ) : (
            <div className="admin-mod-card-grid">
              {filteredPending.map((h) => {
                const photo =
                  h.fotos?.find((f) => f.is_primary) ?? h.fotos?.[0];
                const imgUrl = resolveMediaUrl(photo?.image_url ?? photo?.image);
                const rej = getReject(rejectAcc, h.id, setRejectAcc);
                const waiting = daysPending(h.created_at);
                return (
                  <article key={h.id} className="admin-mod-card">
                    <div className="admin-mod-card-top">
                      <label className="admin-mod-check">
                        <input
                          type="checkbox"
                          checked={selectedAcc.has(h.id)}
                          onChange={() => toggleAcc(h.id)}
                        />
                      </label>
                      {waiting >= 3 && (
                        <span className="admin-users-badge admin-users-badge--warn">
                          {waiting} días esperando
                        </span>
                      )}
                    </div>
                    <div className="admin-mod-card-body">
                      {imgUrl ? (
                        <img className="admin-mod-thumb" src={imgUrl} alt="" />
                      ) : (
                        <div className="admin-mod-thumb admin-mod-thumb--empty">
                          <PrimeIcon name="pi-image" size={28} />
                        </div>
                      )}
                      <div className="admin-mod-card-main">
                        <h3>{h.name}</h3>
                        <p className="muted">
                          {typeLabel(h.type)} · {h.city}
                          {h.region ? `, ${h.region}` : ""}
                        </p>
                        <p className="admin-mod-owner">
                          {h.propietario_foto_url ? (
                            <img
                              src={resolveMediaUrl(h.propietario_foto_url)}
                              alt=""
                              className="admin-mod-owner-photo"
                            />
                          ) : null}
                          <span>
                            {h.propietario_nombre || h.owner_email} · {h.owner_email}
                          </span>
                        </p>
                        <p className="admin-mod-desc">{h.description.slice(0, 160)}…</p>
                        <p className="muted admin-mod-meta">
                          Enviado {formatRelativeTime(h.created_at)} ·{" "}
                          <Link to={`/hospedajes/${h.id}`} target="_blank" rel="noreferrer">
                            Ver ficha
                          </Link>
                        </p>
                      </div>
                    </div>
                    {rejectingAcc === h.id ? (
                      <RejectReasonPanel
                        presets={REJECT_PRESETS_ACCOMMODATION}
                        preset={rej.preset}
                        custom={rej.custom}
                        onPresetChange={rej.setPreset}
                        onCustomChange={rej.setCustom}
                        onCancel={() => setRejectingAcc(null)}
                        onConfirm={() => {
                          const motivo = buildRejectMotivo(
                            rej.preset,
                            rej.custom,
                            REJECT_PRESETS_ACCOMMODATION,
                          );
                          if (!motivo) {
                            showAdminToast("Indica un motivo de rechazo.", "error");
                            return;
                          }
                          moderateAccommodation(h.id, false, motivo);
                        }}
                      />
                    ) : (
                      <div className="admin-mod-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={moderating.has(`acc-${h.id}`)}
                          onClick={() => moderateAccommodation(h.id, true)}
                        >
                          {moderating.has(`acc-${h.id}`) ? "Procesando…" : "Aprobar"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm admin-mod-btn-reject"
                          onClick={() => setRejectingAcc(h.id)}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!loading && showCuentas && (
        <>
          <section className="admin-mod-section" id="propietarios-pendientes">
            <h2 className="admin-section-title">
              Propietarios pendientes ({filteredOwners.length})
            </h2>
            {filteredOwners.length === 0 ? (
              <ModEmpty icon="pi-user" title="Sin propietarios pendientes" />
            ) : (
              <div className="admin-mod-card-grid admin-mod-card-grid--compact">
                {filteredOwners.map((o) => {
                  const rej = getReject(rejectOwner, o.id, setRejectOwner);
                  return (
                    <AccountModCard
                      key={o.id}
                      user={o}
                      rejecting={rejectingOwner === o.id}
                      approveBusy={moderating.has(`owner-${o.id}`)}
                      onApprove={() => moderateOwner(o.id, true)}
                      onStartReject={() => setRejectingOwner(o.id)}
                      onCancelReject={() => setRejectingOwner(null)}
                      rejectPanel={
                        <RejectReasonPanel
                          presets={REJECT_PRESETS_ACCOUNT}
                          preset={rej.preset}
                          custom={rej.custom}
                          onPresetChange={rej.setPreset}
                          onCustomChange={rej.setCustom}
                          onCancel={() => setRejectingOwner(null)}
                          onConfirm={() => {
                            const motivo = buildRejectMotivo(
                              rej.preset,
                              rej.custom,
                              REJECT_PRESETS_ACCOUNT,
                            );
                            if (!motivo) {
                              showAdminToast("Indica un motivo.", "error");
                              return;
                            }
                            moderateOwner(o.id, false, motivo);
                          }}
                        />
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="admin-mod-section" id="patrocinadores-pendientes">
            <h2 className="admin-section-title">
              Patrocinadores pendientes ({filteredSponsors.length})
            </h2>
            {filteredSponsors.length === 0 ? (
              <ModEmpty icon="pi-megaphone" title="Sin patrocinadores pendientes" />
            ) : (
              <div className="admin-mod-card-grid admin-mod-card-grid--compact">
                {filteredSponsors.map((s) => {
                  const rej = getReject(rejectSponsor, s.id, setRejectSponsor);
                  return (
                    <AccountModCard
                      key={s.id}
                      user={s}
                      rejecting={rejectingSponsor === s.id}
                      approveBusy={moderating.has(`sponsor-${s.id}`)}
                      onApprove={() => moderateSponsor(s.id, true)}
                      onStartReject={() => setRejectingSponsor(s.id)}
                      onCancelReject={() => setRejectingSponsor(null)}
                      rejectPanel={
                        <RejectReasonPanel
                          presets={REJECT_PRESETS_ACCOUNT}
                          preset={rej.preset}
                          custom={rej.custom}
                          onPresetChange={rej.setPreset}
                          onCustomChange={rej.setCustom}
                          onCancel={() => setRejectingSponsor(null)}
                          onConfirm={() => {
                            const motivo = buildRejectMotivo(
                              rej.preset,
                              rej.custom,
                              REJECT_PRESETS_ACCOUNT,
                            );
                            if (!motivo) {
                              showAdminToast("Indica un motivo.", "error");
                              return;
                            }
                            moderateSponsor(s.id, false, motivo);
                          }}
                        />
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {!loading && showReportes && (
        <>
          <section className="admin-mod-section" id="anuncios-reportados">
            <h2 className="admin-section-title">Anuncios reportados ({filteredAdReports.length})</h2>
            <p className="muted section-lead">
              Si confirmas la denuncia, se da de baja el anuncio y se notifica al patrocinador.
            </p>
            {filteredAdReports.length === 0 ? (
              <ModEmpty icon="pi-flag" title="Sin reportes de anuncios" />
            ) : (
              <div className="admin-mod-card-grid">
                {filteredAdReports.map((rep) => {
                  const url = resolveMediaUrl(rep.ad_media_url);
                  return (
                    <article key={rep.id} className="admin-mod-card">
                      <div className="admin-mod-card-body">
                        {url ? (
                          <img className="admin-mod-thumb" src={url} alt="" />
                        ) : (
                          <div className="admin-mod-thumb admin-mod-thumb--empty">
                            <PrimeIcon name="pi-image" size={28} />
                          </div>
                        )}
                        <div className="admin-mod-card-main">
                          <span className="badge badge-warn">{rep.reason_label}</span>
                          <h3>{rep.ad_title}</h3>
                          <p className="muted">
                            {rep.sponsor_name} ({rep.sponsor_email}) · Reportó {rep.reporter_name}
                          </p>
                          {rep.detail && <p>{rep.detail}</p>}
                          <p className="muted admin-mod-meta">
                            {formatRelativeTime(rep.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="admin-mod-fields">
                        <div className="admin-mod-reject-field">
                          <span className="admin-mod-reject-label">
                            Advertencia al patrocinador (si das de baja)
                          </span>
                          <textarea
                            rows={2}
                            placeholder="Mensaje para el patrocinador…"
                            value={warningAnuncio[rep.id] ?? ""}
                            onChange={(e) =>
                              setWarningAnuncio({ ...warningAnuncio, [rep.id]: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="admin-mod-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => resolveAdReport(rep.id, "baja")}
                        >
                          Dar de baja
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => resolveAdReport(rep.id, "descartar")}
                        >
                          Descartar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="admin-mod-section" id="mensajes-reportados">
            <h2 className="admin-section-title">
              Mensajes de chat reportados ({filteredMessages.length})
            </h2>
            {filteredMessages.length === 0 ? (
              <ModEmpty icon="pi-comments" title="Sin mensajes reportados" />
            ) : (
              <div className="admin-mod-card-grid">
                {filteredMessages.map((r) => (
                  <article key={r.id} className="admin-mod-card">
                    <div className="admin-mod-card-main">
                      <span className="badge badge-warn">{r.reason_label}</span>
                      <p>
                        <strong>Reportó:</strong> {r.reporter_name} ({r.reporter_email})
                      </p>
                      <p>
                        <strong>Autor:</strong> {r.sender_name} ({r.sender_email})
                      </p>
                      <p>
                        <strong>Hospedaje:</strong>{" "}
                        <Link to={`/hospedajes/${r.accommodation_id}`}>{r.accommodation_name}</Link>
                      </p>
                      <blockquote className="report-message-quote">{r.message_body}</blockquote>
                      <p className="muted admin-mod-meta">{formatRelativeTime(r.created_at)}</p>
                    </div>
                    <div className="admin-mod-fields">
                      <div className="admin-mod-reject-field">
                        <span className="admin-mod-reject-label">Notas internas</span>
                        <input
                          value={msgNotes[r.id] ?? ""}
                          onChange={(e) => setMsgNotes({ ...msgNotes, [r.id]: e.target.value })}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    <div className="admin-mod-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => resolveMessage(r.id, "revisado")}
                      >
                        Marcar revisado
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => resolveMessage(r.id, "descartado")}
                      >
                        Descartar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-mod-section" id="reembolsos-disputados">
            <h2 className="admin-section-title">
              Reembolsos disputados ({refundDisputes.length})
            </h2>
            <p className="muted section-lead">
              El huésped reportó que el anfitrión no cumplió el plazo o el reembolso. Envía una
              advertencia con datos concretos o desactiva la cuenta en casos graves.
            </p>
            {refundDisputes.length === 0 ? (
              <ModEmpty icon="pi-wallet" title="Sin disputas de reembolso" />
            ) : (
              <div className="admin-mod-card-grid">
                {refundDisputes.map((r) => (
                  <article key={r.id} className="admin-mod-card">
                    <div className="admin-mod-card-main">
                      <h3>
                        {r.hospedaje} · Hab. {r.habitacion}
                      </h3>
                      <p className="muted">
                        Reserva #{r.booking_id} · Check-in {formatDate(r.check_in)}
                      </p>
                      <p>
                        Huésped: {r.huesped.nombre} ({r.huesped.email})
                      </p>
                      <p>
                        Anfitrión: {r.propietario.nombre} ({r.propietario.email}) ·{" "}
                        {r.owner_strikes} amonestación(es)
                      </p>
                      <p>
                        Reembolso esperado: {formatMoney(r.refund_amount)}
                        {r.refund_percent != null ? ` (${r.refund_percent} %)` : ""}
                      </p>
                      {r.due_at && (
                        <p className="muted">Plazo del anfitrión: {formatDate(r.due_at)}</p>
                      )}
                      {r.dispute_notes && <p>Notas del huésped: {r.dispute_notes}</p>}
                    </div>
                    <div className="admin-mod-fields">
                      <div className="admin-mod-reject-field">
                        <span className="admin-mod-reject-label">Advertencia al propietario</span>
                        <textarea
                          rows={3}
                          placeholder="Ej.: No registraste el reembolso de S/ … antes del …"
                          value={refundWarnings[r.id] ?? ""}
                          onChange={(e) =>
                            setRefundWarnings({ ...refundWarnings, [r.id]: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="admin-mod-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          const warning = (refundWarnings[r.id] ?? "").trim();
                          if (!warning) {
                            showAdminToast("Escribe la advertencia.", "error");
                            return;
                          }
                          void resolveDisputedRefund(r.id, {
                            warning,
                            accion: "advertencia",
                          })
                            .then(() => {
                              showAdminToast("Advertencia enviada al propietario.", "success");
                              load();
                            })
                            .catch((e) =>
                              showAdminToast(
                                e instanceof ApiError ? String(e.message) : "Error",
                                "error",
                              ),
                            );
                        }}
                      >
                        Enviar advertencia
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const warning = (refundWarnings[r.id] ?? "").trim();
                          if (
                            !confirm(
                              "¿Desactivar la cuenta del propietario? Solo para casos muy graves.",
                            )
                          ) {
                            return;
                          }
                          if (!warning) {
                            showAdminToast("Escribe el motivo de la sanción.", "error");
                            return;
                          }
                          void resolveDisputedRefund(r.id, {
                            warning,
                            accion: "desactivar_cuenta",
                          })
                            .then(() => {
                              showAdminToast("Cuenta desactivada y caso registrado.", "success");
                              load();
                            })
                            .catch((e) =>
                              showAdminToast(
                                e instanceof ApiError ? String(e.message) : "Error",
                                "error",
                              ),
                            );
                        }}
                      >
                        Desactivar cuenta
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {selectedAcc.size > 0 && tab === "hospedajes" && (
        <div className="admin-mod-bulk-bar">
          <span>{selectedAcc.size} hospedaje(s) seleccionado(s)</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={bulkLoading}
            onClick={bulkApproveAccommodations}
          >
            {bulkLoading ? "Aprobando…" : "Aprobar seleccionados"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedAcc(new Set())}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function ModEmpty({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="admin-users-empty">
      <PrimeIcon name={icon} size={36} />
      <p className="admin-users-empty-title">{title}</p>
      <p className="muted">No hay elementos pendientes en esta categoría con los filtros actuales.</p>
    </div>
  );
}

function AccountModCard({
  user,
  rejecting,
  approveBusy = false,
  onApprove,
  onStartReject,
  rejectPanel,
}: {
  user: User;
  rejecting: boolean;
  approveBusy?: boolean;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  rejectPanel: ReactNode;
}) {
  const name = displayName(user);
  const photo = resolveMediaUrl(user.photo_url);
  return (
    <article className="admin-mod-card admin-mod-card--account">
      <div className="admin-mod-card-body">
        {photo ? (
          <img className="admin-mod-thumb admin-mod-thumb--round" src={photo} alt="" />
        ) : (
          <div className="admin-mod-thumb admin-mod-thumb--round admin-mod-thumb--empty">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="admin-mod-card-main">
          <h3>{name}</h3>
          <p className="muted">{user.email}</p>
          {user.phone && <p className="muted">{user.phone}</p>}
          <p className="muted admin-mod-meta">
            Registro {formatDate(user.date_joined)} ·{" "}
            <Link to={`/perfil/${user.id}`}>Ver perfil</Link>
          </p>
        </div>
      </div>
      {rejecting ? (
        rejectPanel
      ) : (
        <div className="admin-mod-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={approveBusy}
            onClick={onApprove}
          >
            {approveBusy ? "Procesando…" : "Aprobar cuenta"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm admin-mod-btn-reject"
            onClick={onStartReject}
          >
            Rechazar
          </button>
        </div>
      )}
    </article>
  );
}
