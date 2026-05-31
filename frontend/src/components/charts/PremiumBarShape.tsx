import type { BarShapeProps } from "recharts";

type PremiumBarProps = BarShapeProps & {
  shineFill?: string;
  radius?: number | [number, number, number, number];
};

function normalizeRadius(r?: number | [number, number, number, number]): [number, number, number, number] {
  if (Array.isArray(r)) return r;
  const v = r ?? 8;
  return [v, v, 0, 0];
}

/** Barra con degradado vertical, brillo superior y sombra sutil. */
export function PremiumBarShape(props: PremiumBarProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    fill = "#6366f1",
    radius,
    shineFill,
  } = props;

  if (width <= 0 || height <= 0) return null;

  const [rTL, rTR, rBR, rBL] = normalizeRadius(radius);
  const shineH = Math.min(8, height * 0.22);

  return (
    <g className="chart-bar-premium">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={Math.max(rTL, rTR, rBR, rBL)}
        ry={Math.max(rTL, rTR, rBR, rBL)}
      />
      {shineFill && width > 4 && (
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={shineH}
          fill={shineFill}
          opacity={0.85}
          rx={Math.max(0, rTL - 1)}
          ry={Math.max(0, rTL - 1)}
        />
      )}
    </g>
  );
}
