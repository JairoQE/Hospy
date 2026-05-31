import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Line,
  Pie,
  type BarProps,
  type BarShapeProps,
  type PieProps,
  type XAxisProps,
  type YAxisProps,
} from "recharts";
import { useSiteDesign } from "@/context/SiteDesignContext";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  chartStyleClassName,
  chartTooltipClassName,
  getChartStyleTokens,
  normalizeChartStyle,
  type ChartStyleId,
} from "./chartStyles";
import {
  areaGradientFill,
  barGradientFill,
  shineGradientFill,
  useChartGradientPrefix,
} from "./chartGradients";
import { ChartGradientInject } from "./ChartGradientInject";
import { PremiumBarShape } from "./PremiumBarShape";
import { ThreeDBarShape } from "./ThreeDBarShape";
import { ThreeDPieSector } from "./ThreeDPieSector";
import type { PieSectorShapeProps } from "recharts";

export function useDashboardChartStyle(override?: ChartStyleId) {
  const { design } = useSiteDesign();
  const style = normalizeChartStyle(override ?? design.chart_style);
  return { style, tokens: getChartStyleTokens(style) };
}

type StyledProps = {
  config: ChartConfig;
  className?: string;
  styleId?: ChartStyleId;
  children: ReactNode;
};

export function StyledChartContainer({ config, className, styleId, children }: StyledProps) {
  const { style, tokens } = useDashboardChartStyle(styleId);
  const configKeys = Object.keys(config);

  return (
    <ChartContainer
      config={config}
      className={cn(
        "chart-styled chart-styled--animated chart-styled--pro",
        chartStyleClassName(style),
        className,
      )}
      data-chart-style={style}
    >
      <ChartGradientInject enabled={tokens.premiumGradients} configKeys={configKeys}>
        {children}
      </ChartGradientInject>
    </ChartContainer>
  );
}

export function useDashboardTooltipClassName(styleId?: ChartStyleId): string {
  const { style } = useDashboardChartStyle(styleId);
  return chartTooltipClassName(style);
}

export function DashboardGrid({
  styleId,
  vertical = false,
  horizontal = true,
}: {
  styleId?: ChartStyleId;
  vertical?: boolean;
  horizontal?: boolean;
}) {
  const { tokens } = useDashboardChartStyle(styleId);
  return (
    <CartesianGrid
      vertical={vertical}
      horizontal={horizontal}
      strokeDasharray={tokens.gridDash}
      stroke="currentColor"
      className="chart-grid-line text-border/50"
      opacity={tokens.gridOpacity}
    />
  );
}

export function DashboardGridBoth({ styleId }: { styleId?: ChartStyleId }) {
  const { tokens } = useDashboardChartStyle(styleId);
  return (
    <CartesianGrid
      strokeDasharray={tokens.gridDash}
      stroke="currentColor"
      className="chart-grid-line text-border/50"
      opacity={tokens.gridOpacity}
    />
  );
}

const AXIS = {
  tickLine: false as const,
  axisLine: false as const,
  tickMargin: 8,
  fontSize: 11,
  className: "chart-axis-tick",
};

export function dashboardXAxisProps(extra?: Partial<XAxisProps>): XAxisProps {
  return { ...AXIS, ...extra };
}

export function dashboardYAxisProps(extra?: Partial<YAxisProps>): YAxisProps {
  return { ...AXIS, ...extra };
}

type SeriesProps = {
  yAxisId?: string | number;
  dataKey: string;
  colorKey: string;
  name?: string;
  styleId?: ChartStyleId;
};

export function DashboardSeries({ yAxisId, dataKey, colorKey, name, styleId }: SeriesProps) {
  const { tokens } = useDashboardChartStyle(styleId);
  const { prefix, enabled } = useChartGradientPrefix();
  const stroke = `var(--color-${colorKey})`;
  const areaFill =
    enabled && tokens.premiumGradients
      ? areaGradientFill(prefix, colorKey)
      : stroke;

  const common = {
    yAxisId,
    type: tokens.curveType,
    dataKey,
    name,
    stroke,
    strokeWidth: tokens.lineWidth,
    dot: tokens.showDots
      ? { r: tokens.dotRadius, strokeWidth: 2, stroke: "#fff", fill: stroke }
      : false,
    activeDot: { r: tokens.dotRadius + 2, strokeWidth: 2, stroke: "#fff", fill: stroke },
  };

  const seriesClass = cn(
    tokens.handDrawn && "chart-series-hand-drawn",
    tokens.retroTerminal && "chart-series-retro",
  );

  if (tokens.useLineOnly) {
    return <Line {...common} fill="none" className={cn("chart-series-line", seriesClass)} />;
  }

  if (tokens.use3DCharts) {
    return (
      <>
        <Area
          {...common}
          name={undefined}
          tooltipType="none"
          className="chart-area-3d-shadow"
          fill={stroke}
          fillOpacity={0.24}
          stroke="none"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        <Area
          {...common}
          className="chart-area-3d-body"
          fill={areaFill}
          fillOpacity={1}
          stroke={stroke}
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          {...common}
          className="chart-area-3d-edge"
          tooltipType="none"
          fill="none"
          stroke={stroke}
          strokeWidth={3.5}
          dot={{ r: 4, fill: stroke, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </>
    );
  }

  return (
    <Area
      {...common}
      className={cn("chart-series-area", seriesClass)}
      fill={areaFill}
      fillOpacity={enabled && tokens.premiumGradients ? 1 : tokens.areaFillOpacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

type BarSeriesProps = {
  dataKey: string;
  colorKey: string;
  name?: string;
  layout?: "horizontal" | "vertical";
  styleId?: ChartStyleId;
};

export function DashboardBarSeries({
  dataKey,
  colorKey,
  name,
  layout = "horizontal",
  styleId,
}: BarSeriesProps) {
  const { tokens } = useDashboardChartStyle(styleId);
  const { prefix, enabled } = useChartGradientPrefix();
  const solid = `var(--color-${colorKey})`;
  const fill =
    enabled && tokens.premiumGradients ? barGradientFill(prefix, colorKey) : solid;
  const shine =
    enabled && tokens.premiumGradients ? shineGradientFill(prefix, colorKey) : undefined;

  const barProps: BarProps = {
    dataKey,
    name,
    fill,
    maxBarSize: tokens.barMaxSize,
  };

  const radius =
    layout === "vertical"
      ? ([0, tokens.barRadius[0], tokens.barRadius[0], 0] as [number, number, number, number])
      : tokens.barRadius;

  const shapeRenderer = useMemo(() => {
    if (tokens.use3DBars) {
      return (props: BarShapeProps) => (
        <ThreeDBarShape
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
          fill={typeof props.fill === "string" ? props.fill : solid}
          layout={layout}
        />
      );
    }
    if (tokens.premiumGradients && !tokens.barOutlineOnly) {
      return (props: BarShapeProps) => (
        <PremiumBarShape
          {...props}
          fill={typeof props.fill === "string" ? props.fill : fill}
          radius={radius}
          shineFill={shine}
        />
      );
    }
    return undefined;
  }, [tokens.use3DBars, tokens.premiumGradients, tokens.barOutlineOnly, solid, fill, shine, layout, radius]);

  const barClass = cn(
    tokens.floatingBar && "chart-bar-floating",
    tokens.barOutlineOnly && "chart-bar-outline",
    tokens.premiumGradients && "chart-bar-premium-series",
    tokens.handDrawn && "chart-bar-hand-drawn",
    tokens.retroTerminal && "chart-bar-retro",
    tokens.neonShell && "chart-bar-neon",
  );

  if (shapeRenderer) {
    return (
      <Bar
        {...barProps}
        className={barClass}
        shape={shapeRenderer}
        isAnimationActive={false}
      />
    );
  }

  if (tokens.barOutlineOnly) {
    return (
      <Bar
        {...barProps}
        className={barClass}
        fill={tokens.neonShell ? "#0A0F1A" : "none"}
        stroke={solid}
        strokeWidth={tokens.barStrokeWidth}
        radius={radius}
      />
    );
  }

  return (
    <Bar
      {...barProps}
      className={barClass}
      fillOpacity={tokens.barFillOpacity}
      radius={radius}
    />
  );
}

type PieStyleProps = PieProps & {
  styleId?: ChartStyleId;
  children?: ReactNode;
};

export function DashboardPie({ styleId, paddingAngle, strokeWidth, stroke, shape, ...rest }: PieStyleProps) {
  const { tokens } = useDashboardChartStyle(styleId);

  const pieShape = useMemo(() => {
    if (shape) return shape;
    if (!tokens.use3DCharts) return undefined;
    return (props: PieSectorShapeProps) => <ThreeDPieSector {...props} />;
  }, [shape, tokens.use3DCharts]);

  return (
    <Pie
      paddingAngle={paddingAngle ?? tokens.piePadding}
      strokeWidth={strokeWidth ?? tokens.pieStrokeWidth}
      stroke={stroke ?? "var(--background, #fff)"}
      shape={pieShape}
      className="chart-pie-series"
      isAnimationActive={tokens.use3DCharts ? false : undefined}
      {...rest}
    />
  );
}
