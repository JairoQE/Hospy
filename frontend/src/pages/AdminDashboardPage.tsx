import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminDashboardBootstrap,
  loadCachedAdminDashboardBootstrap,
} from "../api/adminDashboardBootstrap";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Review,
  User,
} from "../api/types";
import { AdminDashboard } from "../components/admin/AdminDashboard";

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

  const load = useCallback(() => {
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
      setLoading(false);
    };

    const cached = loadCachedAdminDashboardBootstrap();
    if (cached) {
      apply(cached);
    } else {
      setLoading(true);
    }

    fetchAdminDashboardBootstrap()
      .then(apply)
      .catch(() => {
        if (!cached) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="admin-loading">Cargando estadísticas…</p>;
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
    />
  );
}
