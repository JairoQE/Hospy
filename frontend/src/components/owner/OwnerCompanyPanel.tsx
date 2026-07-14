import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  createOrganization,
  fetchMyOrganization,
  lookupOrganizationRuc,
  updateOrganization,
  verifyOrganizationRuc,
  type Organization,
  type RucEmpresa,
} from "../../api/organizations";
import { BusinessVerifiedBadge } from "../BusinessVerifiedBadge";
import { PrimeIcon } from "../PrimeIcon";
import { formatDate } from "../../utils/format";
import "../../styles/owner-company.css";

export function OwnerCompanyPanel() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [ruc, setRuc] = useState("");
  const [empresa, setEmpresa] = useState<RucEmpresa | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const lookupSeq = useRef(0);

  const applyOrg = (o: Organization | null) => {
    setOrg(o);
    setName(o?.name ?? "");
    setSlug(o?.slug ?? "");
    setDescription(o?.description ?? "");
    setLocation(o?.location ?? "");
    setIsPublished(Boolean(o?.is_published));
    setLogoFile(null);
    setCoverFile(null);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchMyOrganization();
      applyOrg(res.organization);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la empresa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setMsg("");
    setError("");
    if (org?.is_verified) {
      setEmpresa(null);
      setPanelOpen(false);
      return;
    }
    if (ruc.length !== 11) {
      setEmpresa(null);
      setPanelOpen(false);
      setLoadingLookup(false);
      return;
    }
    if (!org) return;

    const seq = ++lookupSeq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingLookup(true);
        try {
          const res = await lookupOrganizationRuc(ruc);
          if (lookupSeq.current !== seq) return;
          setEmpresa(res.empresa);
          setPanelOpen(true);
        } catch (err) {
          if (lookupSeq.current !== seq) return;
          setEmpresa(null);
          setPanelOpen(false);
          setError(err instanceof ApiError ? err.message : "No se pudo consultar el RUC");
        } finally {
          if (lookupSeq.current === seq) setLoadingLookup(false);
        }
      })();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [ruc, org]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", name.trim());
    if (slug.trim()) fd.append("slug", slug.trim());
    fd.append("description", description.trim());
    fd.append("location", location.trim());
    fd.append("is_published", isPublished ? "true" : "false");
    if (logoFile) fd.append("logo", logoFile);
    if (coverFile) fd.append("cover", coverFile);
    return fd;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const fd = buildFormData();
      const res = org
        ? await updateOrganization(fd)
        : await createOrganization(fd);
      applyOrg(res.organization);
      setMsg(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onVerify = async () => {
    if (!empresa) return;
    setLoadingVerify(true);
    setError("");
    setMsg("");
    try {
      const res = await verifyOrganizationRuc(empresa.ruc);
      applyOrg(res.organization);
      setRuc("");
      setEmpresa(null);
      setPanelOpen(false);
      setMsg(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar la empresa");
    } finally {
      setLoadingVerify(false);
    }
  };

  if (loading) {
    return <p className="muted">Cargando página de empresa…</p>;
  }

  return (
    <div className="owner-company">
      <header className="owner-company-header">
        <div>
          <h2>Página de empresa</h2>
          <p className="muted">
            Opcional. Crea una página pública para tu negocio. La insignia de empresa
            verificada requiere validar el RUC (SUNAT).
          </p>
        </div>
        {org?.public_url && org.is_published ? (
          <Link to={org.public_url} className="btn btn-secondary btn-sm">
            Ver página pública
          </Link>
        ) : null}
      </header>

      {msg ? <p className="form-success" role="status">{msg}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <form className="card owner-company-form" onSubmit={onSubmit}>
        <div className="owner-company-form-grid">
          <label>
            Nombre comercial
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={160}
              placeholder="Ej. Hospedajes Andes"
            />
          </label>
          <label>
            Slug (URL)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              maxLength={160}
              placeholder="hospedajes-andes"
            />
          </label>
          <label className="owner-company-span-2">
            Ubicación principal
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="Miraflores, Lima"
            />
          </label>
          <label className="owner-company-span-2">
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Cuenta a los huéspedes qué distingue a tu empresa…"
            />
          </label>
          <label>
            Logo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            {org?.logo_url ? (
              <img src={org.logo_url} alt="" className="owner-company-thumb" />
            ) : null}
          </label>
          <label>
            Portada
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            {org?.cover_url ? (
              <img src={org.cover_url} alt="" className="owner-company-thumb owner-company-thumb--wide" />
            ) : null}
          </label>
          <label className="owner-company-check owner-company-span-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Publicar página (visible en /empresa/…)
          </label>
        </div>
        <div className="owner-company-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Guardando…" : org ? "Guardar cambios" : "Crear página de empresa"}
          </button>
        </div>
      </form>

      {org ? (
        <section className="card owner-company-verify">
          {org.is_verified ? (
            <>
              <div className="owner-company-verify-head">
                <BusinessVerifiedBadge size={24} />
                <h3>Empresa verificada</h3>
              </div>
              <p className="muted">
                Tu página tiene la insignia de empresa verificada (SUNAT / RUC).
              </p>
              <dl className="profile-dl">
                {org.legal_name ? (
                  <div>
                    <dt>Razón social</dt>
                    <dd>{org.legal_name}</dd>
                  </div>
                ) : null}
                {org.ruc ? (
                  <div>
                    <dt>RUC</dt>
                    <dd>{org.ruc}</dd>
                  </div>
                ) : null}
                {org.verified_at ? (
                  <div>
                    <dt>Verificada el</dt>
                    <dd>{formatDate(org.verified_at)}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          ) : (
            <>
              <div className="owner-company-verify-head">
                <PrimeIcon name="pi-building" size={22} />
                <h3>Verificar empresa (RUC)</h3>
              </div>
              <p className="muted">
                Ingresa el RUC de 11 dígitos. Consultaremos SUNAT y te pediremos confirmar
                la razón social.
              </p>
              <label>
                RUC
                <input
                  inputMode="numeric"
                  pattern="\d{11}"
                  maxLength={11}
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="20100070970"
                  aria-describedby="owner-ruc-hint"
                />
              </label>
              <p id="owner-ruc-hint" className="muted">
                {loadingLookup
                  ? "Consultando…"
                  : ruc.length === 11
                    ? "Revisa los datos y confirma."
                    : `Escribe los 11 dígitos (${ruc.length}/11).`}
              </p>
              {panelOpen && empresa ? (
                <div className="owner-company-ruc-panel" role="region" aria-label="Confirmar RUC">
                  <p>
                    <strong>{empresa.legal_name}</strong>
                  </p>
                  <p className="muted">
                    RUC {empresa.ruc}
                    {empresa.estado ? ` · ${empresa.estado}` : ""}
                    {empresa.condicion ? ` · ${empresa.condicion}` : ""}
                  </p>
                  <div className="owner-company-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={loadingVerify}
                      onClick={() => void onVerify()}
                    >
                      {loadingVerify ? "Verificando…" : "Confirmar y verificar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        lookupSeq.current += 1;
                        setRuc("");
                        setEmpresa(null);
                        setPanelOpen(false);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <p className="muted">
          Primero crea la página de empresa. Luego podrás verificarla con el RUC.
        </p>
      )}
    </div>
  );
}
