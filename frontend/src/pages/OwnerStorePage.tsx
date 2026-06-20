import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { OwnerStoreListingItem, OwnerStoreProfile } from "../api/types";
import { OwnerStoreAbout } from "../components/owner-store/OwnerStoreAbout";
import {
  OwnerStoreFilters,
  type PropertyFilters,
  type SortKey,
} from "../components/owner-store/OwnerStoreFilters";
import { OwnerStoreHero } from "../components/owner-store/OwnerStoreHero";
import { OwnerStorePropertyCard } from "../components/owner-store/OwnerStorePropertyCard";
import { OwnerStoreReviews } from "../components/owner-store/OwnerStoreReviews";
import { SkeletonOwnerStorePage } from "../components/ui/Skeleton";
import { PrimeIcon } from "../components/PrimeIcon";
import { useAuth } from "../context/AuthContext";
import { useChatDock } from "../context/ChatDockContext";
import { useLocaleCurrency } from "../context/LocaleCurrencyContext";
import { displayName, roleProfileTitleI18nKey } from "../utils/format";
import { canInquireHost } from "../utils/hostChat";
import "../styles/owner-store-page.css";

const PAGE_SIZE = 6;

function sortListings(items: OwnerStoreListingItem[], sort: SortKey): OwnerStoreListingItem[] {
  const list = [...items];
  const rating = (x: OwnerStoreListingItem) => Number(x.average_rating) || 0;
  const price = (x: OwnerStoreListingItem) => {
    const p = x.precio_desde;
    if (p == null || p === "") return Number.POSITIVE_INFINITY;
    return Number(p);
  };
  const created = (x: OwnerStoreListingItem) =>
    x.created_at ? new Date(x.created_at).getTime() : 0;

  switch (sort) {
    case "rating":
      return list.sort((a, b) => rating(b) - rating(a) || a.name.localeCompare(b.name));
    case "new":
      return list.sort((a, b) => created(b) - created(a) || a.name.localeCompare(b.name));
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

function applyPropertyFilters(
  items: OwnerStoreListingItem[],
  filters: PropertyFilters,
): OwnerStoreListingItem[] {
  return items.filter((item) => {
    if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
    if (filters.priceMax != null) {
      const p = Number(item.precio_desde);
      if (!Number.isNaN(p) && p > filters.priceMax) return false;
    }
    if (filters.services.length > 0) {
      const slugs = (item.services_preview ?? []).map((s) => s.slug);
      const ok = filters.services.every((need) =>
        slugs.some((s) => s.includes(need) || need.includes(s)),
      );
      if (!ok) return false;
    }
    return true;
  });
}

export function OwnerStorePage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { user: me, loading: authLoading } = useAuth();
  const { openChat } = useChatDock();
  const { t, tVars } = useLocaleCurrency();

  const [store, setStore] = useState<OwnerStoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("match");
  const [filters, setFilters] = useState<PropertyFilters>({
    types: [],
    priceMax: null,
    services: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [contactHint, setContactHint] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const id = Number(ownerId);

  const load = useCallback(async () => {
    if (!ownerId || Number.isNaN(id)) {
      setError(t("ownerStorePage.notFound"));
      setStore(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.get<OwnerStoreProfile>(`/auth/anfitriones/${id}/`);
      setStore(data);
    } catch (e) {
      setStore(null);
      setError(e instanceof ApiError ? e.message : t("ownerStorePage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, ownerId, t]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [load, authLoading]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sort, filters]);

  const allListings = store?.accommodations ?? [];

  const filteredListings = useMemo(() => {
    const filtered = applyPropertyFilters(allListings, filters);
    return sortListings(filtered, sort);
  }, [allListings, filters, sort]);

  const visibleListings = filteredListings.slice(0, visibleCount);

  const ownerName = store
    ? displayName({
        first_name: store.first_name,
        last_name: store.last_name,
        username: store.username,
        email: "",
      })
    : "";

  const isSelf = Boolean(me && store && me.id === store.id);

  const toggleFollow = async () => {
    if (!store || !me || isSelf) return;
    setFollowLoading(true);
    try {
      const res = await api.post<{ following: boolean; followers_count: number }>(
        `/auth/usuarios/${store.id}/seguir/`,
      );
      setStore({
        ...store,
        is_following: res.following,
        followers_count: res.followers_count,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("ownerStorePage.followError"));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleContact = () => {
    if (!store || isSelf) return;
    setContactHint("");
    if (!me) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    if (!canInquireHost(me.role)) {
      setContactHint(t("ownerStorePage.contactRoleRestricted"));
      return;
    }
    const first = allListings[0];
    if (!first) {
      setContactHint(t("ownerStorePage.contactNoListings"));
      return;
    }
    openChat({
      mode: "guest",
      peerName: ownerName,
      peerPhotoUrl: store.photo_url,
      hospedajeId: first.id,
      hospedajeName: first.name,
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: ownerName, url });
        return;
      }
    } catch {
      /* cancelado */
    }
    await navigator.clipboard.writeText(url);
  };

  if (loading) {
    return <SkeletonOwnerStorePage />;
  }

  if (!store) {
    return (
      <div className="owner-store-page">
        <div className="owner-store-shell owner-store-shell--narrow">
          <p className="error-msg">{error || t("ownerStorePage.notFound")}</p>
          <Link to="/" className="btn btn-secondary">
            {t("common.back")}
          </Link>
        </div>
      </div>
    );
  }

  const reviews = store.owner_reviews_count ?? 0;

  return (
    <div className="owner-store-page">
      <div className="owner-store-shell">
        <nav className="owner-store-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">
            <PrimeIcon name="pi-arrow-left" size={16} />
            {t("ownerStorePage.backHome")}
          </Link>
        </nav>

        <p className="owner-store-page-kicker muted">
          {tVars(roleProfileTitleI18nKey(store.role), { name: ownerName })}
        </p>

        <OwnerStoreHero
          store={store}
          ownerName={ownerName}
          isSelf={isSelf}
          followLoading={followLoading}
          contactHint={contactHint}
          onFollow={() => void toggleFollow()}
          onContact={handleContact}
          onShare={() => void handleShare()}
          me={me}
        />

        <OwnerStoreAbout store={store} ownerName={ownerName} />

        <section className="owner-store-listings-section">
          <h2 className="owner-store-section-title">{t("ownerStorePage.listingsTitle")}</h2>

          <OwnerStoreFilters
            sort={sort}
            onSortChange={setSort}
            filters={filters}
            onFiltersChange={setFilters}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((o) => !o)}
          />

          {error && <p className="error-msg">{error}</p>}

          {filteredListings.length === 0 ? (
            <div className="owner-store-listings-empty card-elevated">
              <p>{t("ownerStore.empty")}</p>
            </div>
          ) : (
            <>
              <p className="owner-store-listings-count muted">
                {tVars("ownerStorePage.showingCount", {
                  shown: visibleListings.length,
                  total: filteredListings.length,
                })}
              </p>
              <div className="owner-store-properties-grid">
                {visibleListings.map((item) => (
                  <OwnerStorePropertyCard key={item.id} item={item} />
                ))}
              </div>
              {visibleCount < filteredListings.length && (
                <div className="owner-store-load-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    {t("ownerStorePage.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <OwnerStoreReviews
          ownerName={ownerName}
          reviews={store.recent_reviews ?? []}
          totalCount={reviews}
        />

        {!isSelf && allListings.length > 0 && (
          <section className="owner-store-bottom-cta card-elevated">
            <h2>{tVars("ownerStorePage.ctaTitle", { name: ownerName })}</h2>
            <p className="muted">{t("ownerStorePage.ctaLead")}</p>
            <button type="button" className="btn btn-primary" onClick={handleContact}>
              <PrimeIcon name="pi-comments" size={16} />
              {t("ownerStorePage.ctaButton")}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
