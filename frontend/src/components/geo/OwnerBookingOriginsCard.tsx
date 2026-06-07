import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchOwnerBookingOrigins, type OwnerBookingOrigins } from "../../api/geo";

export function OwnerBookingOriginsCard() {
  const [data, setData] = useState<OwnerBookingOrigins | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOwnerBookingOrigins(30)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Origen de reservas (IP aproximada)</CardTitle>
        <CardDescription>
          Últimos 30 días · datos ip.guide al crear la reserva
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando origen de huéspedes…</p>
        ) : !data || data.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay reservas con ubicación registrada.
          </p>
        ) : (
          <>
            <p className="owner-geo-intl-stat">
              {data.international_percent > 0
                ? `${data.international_percent}% reservas desde fuera de Perú`
                : "Todas las reservas registradas provienen de Perú (aprox.)"}
            </p>
            <ul className="owner-geo-origin-list">
              {data.by_city.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <span>
                    {row.count} ({row.percent}%)
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
