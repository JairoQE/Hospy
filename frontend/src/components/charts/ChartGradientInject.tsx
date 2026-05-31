import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Customized } from "recharts";
import {
  ChartGradientProvider,
  DashboardChartGradientDefs,
} from "./chartGradients";

function injectGradientDefs(node: ReactNode, configKeys: string[]): ReactNode {
  if (!isValidElement(node)) return node;

  const props = node.props as { children?: ReactNode };
  const childList = Children.toArray(props.children);

  const shadowFilter = (
    <Customized
      key="hospy-chart-shadow-filter"
      component={() => (
        <defs aria-hidden>
          <filter id="chart-premium-shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.14" />
          </filter>
        </defs>
      )}
    />
  );

  return cloneElement(node as ReactElement<{ children?: ReactNode }>, {}, [
    shadowFilter,
    <DashboardChartGradientDefs key="hospy-chart-gradients" keys={configKeys} />,
    ...childList,
  ]);
}

export function ChartGradientInject({
  enabled,
  configKeys,
  children,
}: {
  enabled: boolean;
  configKeys: string[];
  children: ReactNode;
}) {
  if (!enabled) return children;
  return (
    <ChartGradientProvider enabled={enabled}>
      {Children.map(children, (child) => injectGradientDefs(child, configKeys))}
    </ChartGradientProvider>
  );
}
