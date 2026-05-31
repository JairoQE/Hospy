import type { ChartConfig } from "@/components/ui/chart";

export const adminBarChartConfig = {
  confirmedRevenue: { label: "Ingresos confirmados", color: "var(--chart-2)" },
  cancelledRevenue: { label: "Monto cancelado", color: "#ef4444" },
} satisfies ChartConfig;

export const adminFlowChartConfig = {
  revenue: { label: "Ingresos", color: "var(--chart-2)" },
  bookings: { label: "Reservas", color: "var(--chart-1)" },
} satisfies ChartConfig;

export const adminRegionChartConfig = {
  revenue: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig;

export const ownerPerformanceChartConfig = {
  occupancy: { label: "Ocupación", color: "var(--chart-1)" },
  revenue: { label: "Ingresos", color: "var(--chart-2)" },
} satisfies ChartConfig;

export const adminBookingsTrendConfig = {
  count: { label: "Reservas", color: "var(--chart-5)" },
} satisfies ChartConfig;
