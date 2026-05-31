/** Gradientes SVG para barras, áreas y fondos de gráficos. */
export function ChartGradientDefs() {
  const areaStops: { id: string; top: string; bottom: string }[] = [
    { id: "grad-emerald-area", top: "#34d399", bottom: "#10b981" },
    { id: "grad-indigo-area", top: "#818cf8", bottom: "#6366f1" },
    { id: "grad-blue-area", top: "#60a5fa", bottom: "#3b82f6" },
    { id: "grad-teal-area", top: "#2dd4bf", bottom: "#0d9488" },
    { id: "grad-rose-area", top: "#fb7185", bottom: "#f43f5e" },
  ];

  const barStops: { id: string; top: string; bottom: string }[] = [
    { id: "grad-emerald-bar", top: "#6ee7b7", bottom: "#059669" },
    { id: "grad-indigo-bar", top: "#a5b4fc", bottom: "#4f46e5" },
    { id: "grad-blue-bar", top: "#93c5fd", bottom: "#2563eb" },
    { id: "grad-rose-bar", top: "#fda4af", bottom: "#e11d48" },
    { id: "grad-teal-bar", top: "#5eead4", bottom: "#0f766e" },
    { id: "grad-amber-bar", top: "#fcd34d", bottom: "#d97706" },
  ];

  return (
    <defs>
      {areaStops.map((g) => (
        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.top} stopOpacity={0.45} />
          <stop offset="55%" stopColor={g.bottom} stopOpacity={0.18} />
          <stop offset="100%" stopColor={g.bottom} stopOpacity={0.02} />
        </linearGradient>
      ))}
      {barStops.map((g) => (
        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.top} />
          <stop offset="100%" stopColor={g.bottom} />
        </linearGradient>
      ))}
    </defs>
  );
}
