import { memo } from "react";
import { ComposedChart, Line, XAxis } from "recharts";
import { type ChartConfig } from "@/components/ui/chart";
import { CHART_STYLE_OPTIONS, type ChartStyleId } from "./chartStyles";
import {
  DashboardBarSeries,
  DashboardGrid,
  DashboardSeries,
  StyledChartContainer,
} from "./dashboardCharts";
import { cn } from "@/lib/utils";

const PREVIEW_DATA = [
  { label: "L", a: 32, b: 18, c: 22 },
  { label: "M", a: 48, b: 28, c: 34 },
  { label: "X", a: 38, b: 34, c: 28 },
  { label: "J", a: 56, b: 22, c: 40 },
];

const PREVIEW_CONFIG = {
  a: { label: "Barras", color: "var(--preview-a, var(--chart-1))" },
  b: { label: "Línea", color: "var(--preview-b, var(--chart-2))" },
  c: { label: "Área", color: "var(--preview-c, var(--chart-3))" },
} satisfies ChartConfig;

export { CHART_STYLE_OPTIONS };

type PreviewProps = {
  styleId: ChartStyleId;
  className?: string;
  variant?: "mini" | "full";
};

function ChartStylePreviewInner({ styleId, className, variant = "full" }: PreviewProps) {
  const compact = variant === "mini";

  return (
    <StyledChartContainer
      config={PREVIEW_CONFIG}
      styleId={styleId}
      className={cn(
        "chart-style-preview aspect-auto h-full w-full",
        compact && "chart-style-preview--mini",
        className,
      )}
    >
      <ComposedChart
        data={PREVIEW_DATA}
        margin={
          compact
            ? { top: 8, right: 6, left: -30, bottom: -2 }
            : { top: 12, right: 10, left: -22, bottom: 0 }
        }
        barGap={4}
        barCategoryGap="20%"
      >
        <DashboardGrid styleId={styleId} />
        {!compact && <XAxis dataKey="label" hide />}
        <DashboardBarSeries dataKey="a" colorKey="a" styleId={styleId} />
        <DashboardSeries dataKey="c" colorKey="c" styleId={styleId} />
        <Line
          type="monotone"
          dataKey="b"
          stroke="var(--color-b)"
          strokeWidth={compact ? 2.5 : 3}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </StyledChartContainer>
  );
}

export const ChartStylePreview = memo(ChartStylePreviewInner);
