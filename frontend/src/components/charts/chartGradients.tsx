import { createContext, useContext, useId, type ReactNode } from "react";
import { Customized } from "recharts";

type ChartGradientCtx = {
  prefix: string;
  enabled: boolean;
};

const ChartGradientContext = createContext<ChartGradientCtx>({
  prefix: "",
  enabled: false,
});

export function useChartGradientPrefix() {
  return useContext(ChartGradientContext);
}

export function ChartGradientProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const prefix = useId().replace(/:/g, "");
  return (
    <ChartGradientContext.Provider value={{ prefix, enabled }}>
      {children}
    </ChartGradientContext.Provider>
  );
}

/** Inyectar dentro de BarChart / AreaChart / ComposedChart */
export function DashboardChartGradientDefs({ keys }: { keys: string[] }) {
  const { prefix, enabled } = useChartGradientPrefix();
  if (!enabled || !prefix) return null;

  return (
    <Customized
      component={() => (
        <defs aria-hidden>
          {keys.map((key) => (
            <g key={key}>
              <linearGradient
                id={`${prefix}-bar-${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={1} />
                <stop offset="55%" stopColor={`var(--color-${key})`} stopOpacity={0.88} />
                <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.62} />
              </linearGradient>
              <linearGradient
                id={`${prefix}-area-${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.55} />
                <stop offset="45%" stopColor={`var(--color-${key})`} stopOpacity={0.22} />
                <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient
                id={`${prefix}-shine-${key}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
                <stop offset="42%" stopColor="#ffffff" stopOpacity={0.38} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </g>
          ))}
          <filter id={`${prefix}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
        </defs>
      )}
    />
  );
}

export function barGradientFill(prefix: string, colorKey: string): string {
  return `url(#${prefix}-bar-${colorKey})`;
}

export function areaGradientFill(prefix: string, colorKey: string): string {
  return `url(#${prefix}-area-${colorKey})`;
}

export function shineGradientFill(prefix: string, colorKey: string): string {
  return `url(#${prefix}-shine-${colorKey})`;
}
