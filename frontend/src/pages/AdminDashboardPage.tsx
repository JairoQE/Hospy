import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { unwrapList } from "../api/unwrap";
import { fetchMessageReports } from "../api/messaging";
import type {
  AccommodationDetail,
  AccommodationListItem,
  Booking,
  Paginated,
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
    setLoading(true);
    Promise.all([
      api.get<Paginated<Booking> | Booking[]>("/reservas/"),
      api.get<Paginated<AccommodationListItem> | AccommodationListItem[]>(
        "/hospedajes/?ordenar=-rating",
        false,
      ),
      api.get<AccommodationDetail[] | Paginated<AccommodationDetail>>(
        "/hospedajes/pendientes/",
      ),
      api.get<User[] | Paginated<User>>("/auth/propietarios-pendientes/"),
      fetchMessageReports("pendiente").catch(() => []),
    ])
      .then(async ([b, acc, pend, owners, reports]) => {
        setBookings(unwrapList(b));
        const accList = unwrapList(acc);
        setAccommodations(accList);
        const approvedTotal =
          acc && typeof acc === "object" && "count" in acc && typeof acc.count === "number"
            ? acc.count
            : accList.length;
        setApprovedCount(approvedTotal);
        setPendingAccommodations(unwrapList(pend));
        setPendingOwners(unwrapList(owners));
        setPendingReports(reports.length);

        const reviewBatches = await Promise.all(
          accList.slice(0, 12).map((p) =>
            api
              .get<Review[] | Paginated<Review>>(`/hospedajes/${p.id}/resenas/`, false)
              .then((data) => unwrapList(data))
              .catch(() => [] as Review[]),
          ),
        );
        setReviews(
          reviewBatches
            .flat()
            .sort((a, c) => {
              const da = new Date(a.created_at).getTime();
              const dc = new Date(c.created_at).getTime();
              return dc - da;
            })
            .slice(0, 20),
        );
      })
      .finally(() => setLoading(false));
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
