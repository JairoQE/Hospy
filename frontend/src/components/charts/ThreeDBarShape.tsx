type BarLayout = "horizontal" | "vertical";

export type ThreeDBarShapeProps = {
  x?: number | null;
  y?: number | null;
  width?: number;
  height?: number;
  fill?: string;
  layout?: BarLayout;
};

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Barra 3D cabe completamente dentro del rectángulo de Recharts (x, y, width, height)
 * para no ser recortada por el clipPath del gráfico.
 */
export function ThreeDBarShape({
  x: rawX,
  y: rawY,
  width = 0,
  height = 0,
  fill = "#6366f1",
  layout = "horizontal",
}: ThreeDBarShapeProps) {
  const x = num(rawX);
  const y = num(rawY);

  if (width <= 1 || height <= 1) return null;

  const depth = Math.min(
    14,
    Math.max(5, Math.round(Math.min(width, height) * 0.2)),
  );

  if (layout === "vertical") {
    return (
      <g className="chart-bar-3d">
        <polygon
          points={[
            `${x + depth},${y}`,
            `${x + width},${y}`,
            `${x + width - depth},${y + depth}`,
            `${x},${y + depth}`,
          ].join(" ")}
          fill={fill}
          opacity={0.72}
        />
        <polygon
          points={[
            `${x},${y + depth}`,
            `${x + width - depth},${y + depth}`,
            `${x + width - depth},${y + height}`,
            `${x},${y + height}`,
          ].join(" ")}
          fill={fill}
          opacity={0.48}
        />
        <rect
          x={x + depth}
          y={y + depth}
          width={Math.max(0, width - depth * 2)}
          height={Math.max(0, height - depth)}
          fill={fill}
          rx={1}
          ry={1}
        />
      </g>
    );
  }

  return (
    <g className="chart-bar-3d">
      <polygon
        points={[
          `${x},${y + depth}`,
          `${x + width - depth},${y + depth}`,
          `${x + width},${y}`,
          `${x + depth},${y}`,
        ].join(" ")}
        fill={fill}
        opacity={0.72}
      />
      <polygon
        points={[
          `${x + width - depth},${y + depth}`,
          `${x + width},${y}`,
          `${x + width},${y + height - depth}`,
          `${x + width - depth},${y + height}`,
        ].join(" ")}
        fill={fill}
        opacity={0.48}
      />
      <rect
        x={x}
        y={y + depth}
        width={Math.max(0, width - depth)}
        height={Math.max(0, height - depth)}
        fill={fill}
        rx={1}
        ry={1}
      />
    </g>
  );
}
