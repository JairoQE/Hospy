import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  fetchOrganizationPublic,
  type OrganizationPublic,
} from "../api/organizations";
import type { OwnerStoreListingItem } from "../api/types";
import { BusinessVerifiedBadge } from "../components/BusinessVerifiedBadge";
import {
  OwnerStoreFilters,
  type PropertyFilters,
  type SortKey,
} from "../components/owner-store/OwnerStoreFilters";
import { OwnerStorePropertyCard } from "../components/owner-store/OwnerStorePropertyCard";
import { PrimeIcon } from "../components/PrimeIcon";
import { StarRating } from "../components/StarRating";
import { UserNameWithBadge } from "../components/UserNameWithBadge";
import { SkeletonOwnerStorePage } from "../components/ui/Skeleton";
import { resolveMediaUrl } from "../utils/media";
import { displayName } from "../utils/format";
import "../styles/owner-store-page.css";
import "../styles/owner-company.css";
import "../styles/company-page.css";

const PAGE_SIZE = 6;

function sortListings(items: OwnerStoreListingItem[], sort: SortKey): OwnerStoreListingItem[] {
  const list = [...items];
  const rating = (x: OwnerStoreListingItem) => Number(x.average_rating) || 0;
  const price = (x: OwnerStoreListingItem) => {
    const p = x.precio_desde;
    if (p == null || p === "") return Number.POSITIVE_INFINITY;
    return Number(p);
  };
  switch (sort) {
    case "rating":
      return list.sort((a, b) => rating(b) - rating(a) || a.name.localeCompare(b.name));
    case "price-asc":
      return list.sort((a, b) => price(a) - price(b) || a.name.localeCompare(b.name));
    case "price-desc":
      return list.sort((a, b) => price(b) - price(a) || a.name.localeCompare(b.name));
    default:
      return list.sort(
        (a, b) => rating(b) - rating(a) || price(a) - price(b) || a.name.localeCompare(b.name),
      );
  }
}

export function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrganizationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("match");
  const [filters, setFilters] = useState<PropertyFilters>({
    types: [],
    priceMax: null,
    services: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    if (!slug) {
      setError("Empresa no encontrada");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizationPublic(slug);
      setOrg(data);
    } catch (e) {
      setOrg(null);
      setError(e instanceof ApiError ? e.message : "No se pudo cargar la empresa");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sort, filters]);

  const listings = useMemo(() => {
    const items = org?.accommodations ?? [];
    let filtered = items;
    if (filters.types.length > 0) {
      filtered = filtered.filter((i) => filters.types.includes(i.type));
    }
    if (filters.priceMax != null) {
      filtered = filtered.filter((i) => {
        const p = Number(i.precio_desde);
        return Number.isNaN(p) || p <= filters.priceMax!;
      });
    }
    return sortListings(filtered, sort);
  }, [org, filters, sort]);

  const visible = listings.slice(0, visibleCount);

  if (loading) return <SkeletonOwnerStorePage />;

  if (error || !org) {
    return (
      <div className="page container company-page">
        <p className="form-error" role="alert">
          {error || "Empresa no encontrada"}
        </p>
        <Link to="/" className="btn btn-secondary">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const coverUrl = resolveMediaUrl(org.cover_url);
  const logoUrl = resolveMediaUrl(org.logo_url);
  const titularName = displayName({
    first_name: org.titular.first_name,
    last_name: org.titular.last_name,
    username: org.titular.username,
    email: "",
  });

  return (
    <div className="page company-page owner-store-page">
      <section className="owner-store-hero card-elevated company-hero">
        {coverUrl ? (
          <div
            className="owner-store-hero-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden
          />
        ) : null}
        <div className="owner-store-hero-inner">
          <div className="owner-store-hero-main">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="company-hero-logo" />
            ) : (
              <div className="company-hero-logo company-hero-logo--placeholder" aria-hidden>
                <PrimeIcon name="pi-building" size={36} />
              </div>
            )}
            <div className="owner-store-hero-info">
              <h1 className="owner-store-hero-name">
                <span>{org.name}</span>
                {org.is_verified ? <BusinessVerifiedBadge size={22} /> : null}
              </h1>
              <div className="owner-store-badges">
                {org.is_verified ? (
                  <span className="owner-store-badge-pill owner-store-badge-pill--business">
                    <BusinessVerifiedBadge size={14} />
                    Empresa verificada
                  </span>
                ) : (
                  <span className="owner-store-badge-pill">Sin verificar</span>
                )}
                {org.location ? (
                  <span className="owner-store-badge-pill">
                    <PrimeIcon name="pi-map-marker" size={14} />
                    {org.location}
                  </span>
                ) : null}
              </div>
              {org.legal_name && org.is_verified ? (
                <p className="muted company-legal-name">{org.legal_name}</p>
              ) : null}
            </div>
          </div>

          <div className="owner-store-hero-stats">
            <div>
              <StarRating rating={org.average_rating || 0} size="sm" />
              <span className="muted">
                {org.reviews_count} reseña{org.reviews_count === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <strong>{org.accommodations_count}</strong>{" "}
              <span className="muted">alojamiento{org.accommodations_count === 1 ? "" : "s"}</span>
            </div>
            <div>
              <span className="muted">Titular: </span>
              <Link to={`/anfitrion/${org.titular.id}`}>
                <UserNameWithBadge
                  name={titularName}
                  verified={org.titular.is_identity_verified}
                  badgeSize={14}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {org.description ? (
        <section className="card company-about">
          <h2>Sobre la empresa</h2>
          <p>{org.description}</p>
        </section>
      ) : null}

      <section className="owner-store-listings">
        <div className="owner-store-listings-head">
          <h2>Alojamientos</h2>
          <OwnerStoreFilters
            filters={filters}
            sort={sort}
            filtersOpen={filtersOpen}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
          />
        </div>
        {visible.length === 0 ? (
          <p className="muted">Esta empresa aún no tiene alojamientos públicos.</p>
        ) : (
          <div className="owner-store-grid">
            {visible.map((item) => (
              <OwnerStorePropertyCard key={item.id} item={item} />
            ))}
          </div>
        )}
        {visibleCount < listings.length ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Ver más
          </button>
        ) : null}
      </section>
    </div>
  );
}
