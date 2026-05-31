import { Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts";

/** Sector de dona/pastel con capa de extrusión (efecto 3D). */
export function ThreeDPieSector(props: PieSectorShapeProps) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = "#6366f1",
  } = props;

  const depth = Math.min(16, Math.max(6, Math.round(outerRadius * 0.1)));

  return (
    <g className="chart-pie-3d">
      <Sector
        cx={cx}
        cy={cy + depth}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.42}
        stroke="none"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1}
      />
    </g>
  );
}
