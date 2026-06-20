import { useCallback, useEffect, useState } from "react";
import {
  clearAdminDashboardBootstrapCache,
  fetchAdminDashboardBootstrap,
  loadCachedAdminDashboardBootstrap,
} from "../api/adminDashboardBootstrap";
import { ApiError } from "../api/client";
import { formatApiError } from "../api/errors";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "../api/types";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { SkeletonAdminStats } from "../components/ui/Skeleton";

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationListItem[]>([]);
  const [pendingAccommodations, setPendingAccommodations] = useState<AccommodationDetail[]>([]);
  const [pendingOwners, setPendingOwners] = useState<User[]>([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [region, setRegion] = useState("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback((options?: { skipCache?: boolean }) => {
    const skipCache = options?.skipCache ?? false;
    if (skipCache) {
      clearAdminDashboardBootstrapCache();
    }

    const apply = (data: {
      reservas: Booking[];
      hospedajes: AccommodationListItem[];
      hospedajes_aprobados_total: number;
      pendientes: AccommodationDetail[];
      propietarios_pendientes: User[];
      reportes_chat_pendientes: number;
      resenas: Review[];
    }) => {
      setBookings(data.reservas);
      setAccommodations(data.hospedajes);
      setApprovedCount(data.hospedajes_aprobados_total);
      setPendingAccommodations(data.pendientes);
      setPendingOwners(data.propietarios_pendientes);
      setPendingReports(data.reportes_chat_pendientes);
      setReviews(data.resenas.slice(0, 20));
      setLoadError(null);
      setLoading(false);
    };

    const cached = skipCache ? null : loadCachedAdminDashboardBootstrap();
    if (cached) {
      apply(cached);
    } else {
      setLoading(true);
    }

    fetchAdminDashboardBootstrap({ skipCache })
      .then(apply)
      .catch((err: unknown) => {
        let message =
          "No se pudieron cargar las estadísticas. Intenta de nuevo en unos segundos.";
        if (err instanceof ApiError) {
          if (err.status === 403) {
            message =
              "Tu cuenta no tiene rol de administrador en el servidor. Cierra sesión y vuelve a entrar.";
          } else if (err.status === 401) {
            message = "Tu sesión expiró. Cierra sesión e inicia sesión de nuevo.";
          } else {
            message = formatApiError(err.data);
          }
        }
        setLoadError(message);
        if (!cached) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--v2">
        <SkeletonAdminStats />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-dashboard admin-dashboard--v2">
        <p className="admin-error">{loadError}</p>
        <button type="button" className="admin-export-btn" onClick={() => load({ skipCache: true })}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <AdminDashboard
      bookings={bookings}
      accommodations={accommodations}
      pendingAccommodations={pendingAccommodations}
      pendingOwners={pendingOwners}
      pendingReports={pendingReports}
      reviews={reviews}
      approvedCount={approvedCount}
      selectedRegion={region}
      onRegionChange={setRegion}
      onRefresh={() => load({ skipCache: true })}
    />
  );
}
