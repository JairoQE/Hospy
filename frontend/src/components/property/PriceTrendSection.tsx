import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../../api/client";
import type { PriceTrendResponse } from "../../api/types";
import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";
import { formatMoney } from "../../utils/format";
import { IconChevronLeft, IconChevronRight } from "../icons";

const WINDOW_SIZE = 9;
const BAR_DEFAULT = "#5b9bd5";
const BAR_SELECTED = "#003580";
const BAR_EMPTY = "#cbd5e1";

type ChartPoint = {
  date: string;
  price: number | null;
  dayShort: string;
  dayNum: number;
  monthLabel: string | null;
  isSelected: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
};

interface Props {
  accommodationId: number;
  checkIn?: string;
  checkOut?: string;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildChartPoints(
  points: PriceTrendResponse["points"],
  checkIn: string | undefined,
  checkOut: string | undefined,
  language: string,
): ChartPoint[] {
  const locale = language === "en" ? "en-US" : "es-PE";
  let lastMonth = "";

  return points.map((point: PriceTrendResponse["points"][number]) => {
    const d = parseIsoDate(point.date);
    const dayShort = d
      ? d.toLocaleDateString(locale, { weekday: "short" }).replace(/\.$/, "")
      : "";
    const dayNum = d ? d.getDate() : 0;
    const monthKey = d
      ? d.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : "";
    const monthLabel = monthKey && monthKey !== lastMonth ? monthKey : null;
    if (monthLabel) lastMonth = monthKey;

    const inStay =
      Boolean(checkIn && checkOut && point.date >= checkIn && point.date <= checkOut);

    return {
      date: point.date,
      price: point.price,
      dayShort,
      dayNum,
      monthLabel,
      isSelected: inStay,
      isCheckIn: point.date === checkIn,
      isCheckOut: point.date === checkOut,
    };
  });
}

function TrendAxisTick({
  x = 0,
  y = 0,
  payload,
  chartData,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  chartData: ChartPoint[];
}) {
  const row = chartData.find((p) => p.date === payload?.value);
  if (!row) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x={-22}
        y={4}
        width={44}
        height={42}
        rx={8}
        fill={row.isSelected ? "rgba(0, 53, 128, 0.1)" : "transparent"}
      />
      <text
        x={0}
        y={14}
        textAnchor="middle"
        fill={row.isSelected ? "#003580" : "#64748b"}
        fontSize={11}
        fontWeight={row.isSelected ? 700 : 500}
      >
        {row.dayShort}
      </text>
      <text
        x={0}
        y={30}
        textAnchor="middle"
        fill={row.isSelected ? "#003580" : "#0f172a"}
        fontSize={13}
        fontWeight={700}
      >
        {row.dayNum}
      </text>
      {row.monthLabel && (
        <text x={0} y={52} textAnchor="middle" fill="#64748b" fontSize={10}>
          {row.monthLabel}
        </text>
      )}
    </g>
  );
}

export function PriceTrendSection({
  accommodationId,
  checkIn,
  checkOut,
}: Props) {
  const { t, tVars, language } = useLocaleCurrency();
  const [data, setData] = useState<PriceTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get<PriceTrendResponse>(
        `/hospedajes/${accommodationId}/tendencia-precios/?dias=120`,
        false,
      )
      .then((payload: PriceTrendResponse) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError(t("detail.priceTrendError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accommodationId, t]);

  const chartData = useMemo(
    () => buildChartPoints(data?.points ?? [], checkIn, checkOut, language),
    [data?.points, checkIn, checkOut, language],
  );

  useEffect(() => {
    if (!checkIn || chartData.length === 0) return;
    const idx = chartData.findIndex((p) => p.date === checkIn);
    if (idx < 0) return;
    setWindowStart(Math.max(0, idx - 2));
  }, [checkIn, chartData.length]);

  const visible = chartData.slice(windowStart, windowStart + WINDOW_SIZE);
  const maxPrice = useMemo(() => {
    const values = chartData
      .map((p) => p.price)
      .filter((v): v is number => v != null && v > 0);
    if (!values.length) return 1000;
    return Math.ceil(Math.max(...values) * 1.08);
  }, [chartData]);

  const canPrev = windowStart > 0;
  const canNext = windowStart + WINDOW_SIZE < chartData.length;

  if (loading) {
    return (
      <section className="property-section price-trend-section" id="tendencia-precios">
        <h2>{t("detail.priceTrendTitle")}</h2>
        <p className="muted">{t("detail.priceTrendLoading")}</p>
      </section>
    );
  }

  if (error || !data || chartData.length === 0) {
    return null;
  }

  return (
    <section className="property-section price-trend-section" id="tendencia-precios">
      <h2>{t("detail.priceTrendTitle")}</h2>
      <p className="price-trend-sub">{tVars("detail.priceTrendSub", { name: "Hospy" })}</p>

      <div className="price-trend-chart-wrap">
        <button
          type="button"
          className="price-trend-nav"
          disabled={!canPrev}
          onClick={() => setWindowStart((i) => Math.max(0, i - 1))}
          aria-label={t("detail.priceTrendPrev")}
        >
          <IconChevronLeft size={20} />
        </button>

        <div className="price-trend-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={visible}
              margin={{ top: 12, right: 8, left: 4, bottom: 28 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dbe3ea" />
              <YAxis
                width={58}
                domain={[0, maxPrice]}
                tickFormatter={(v) => formatMoney(v, { language, currency: "PEN" })}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <XAxis
                dataKey="date"
                interval={0}
                tickLine={false}
                axisLine={false}
                height={58}
                tick={(props) => (
                  <TrendAxisTick
                    x={Number(props.x) || 0}
                    y={Number(props.y) || 0}
                    payload={props.payload as { value?: string }}
                    chartData={visible}
                  />
                )}
              />
              <Bar dataKey="price" radius={[4, 4, 0, 0]} maxBarSize={42}>
                {visible.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={
                      entry.price == null
                        ? BAR_EMPTY
                        : entry.isSelected
                          ? BAR_SELECTED
                          : BAR_DEFAULT
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <button
          type="button"
          className="price-trend-nav"
          disabled={!canNext}
          onClick={() =>
            setWindowStart((i) =>
              Math.min(Math.max(0, chartData.length - WINDOW_SIZE), i + 1),
            )
          }
          aria-label={t("detail.priceTrendNext")}
        >
          <IconChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
