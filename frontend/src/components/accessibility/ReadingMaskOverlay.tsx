import { useEffect, useState } from "react";
import { useAccessibility } from "../../context/AccessibilityContext";

export function ReadingMaskOverlay() {
  const { state } = useAccessibility();
  const level = state.readingMask;
  const [y, setY] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  );

  useEffect(() => {
    if (level === 0) return;
    const onMove = (e: MouseEvent) => setY(e.clientY);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [level]);

  if (level === 0) return null;

  const bandHeights = [0, 72, 112, 160];
  const band = bandHeights[level] ?? 112;
  const top = Math.max(0, y - band / 2);
  const bottom = top + band;

  return (
    <div className="a11y-reading-mask" aria-hidden="true">
      <div className="a11y-reading-mask-top" style={{ height: top }} />
      <div className="a11y-reading-mask-bottom" style={{ top: bottom }} />
    </div>
  );
}
