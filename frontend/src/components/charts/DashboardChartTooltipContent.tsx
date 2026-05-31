import type { ComponentProps } from "react";
import { ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useDashboardTooltipClassName } from "./dashboardCharts";

/** Tooltip de dashboard que respeta el estilo de gráficos activo. */
export function DashboardChartTooltipContent(
  props: ComponentProps<typeof ChartTooltipContent>,
) {
  const tooltipClass = useDashboardTooltipClassName();
  return (
    <ChartTooltipContent
      {...props}
      className={cn("chart-dashboard-tooltip", tooltipClass, props.className)}
    />
  );
}
