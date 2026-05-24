import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "../icons";

type Props = {
  children: ReactNode[];
  itemWidth?: number;
  gap?: number;
  ariaLabel: string;
  className?: string;
};

export function HorizontalCarousel({
  children,
  itemWidth = 220,
  gap = 16,
  ariaLabel,
  className = "",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const count = children.length;

  const updateControls = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < maxScroll - 8);
    const step = itemWidth + gap;
    const idx = step > 0 ? Math.round(el.scrollLeft / step) : 0;
    setActiveDot(Math.min(Math.max(0, idx), count - 1));
  }, [count, gap, itemWidth]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateControls();
    el.addEventListener("scroll", updateControls, { passive: true });
    const ro = new ResizeObserver(updateControls);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateControls);
      ro.disconnect();
    };
  }, [updateControls, count]);

  const scrollBy = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({
      left: dir * (itemWidth + gap) * 2,
      behavior: "smooth",
    });
  };

  if (count === 0) return null;

  return (
    <div className={`h-carousel ${className}`.trim()}>
      {count > 1 && (
        <>
          <button
            type="button"
            className="h-carousel-btn h-carousel-btn--prev"
            onClick={() => scrollBy(-1)}
            disabled={!canPrev}
            aria-label="Anterior"
          >
            <IconChevronLeft size={22} />
          </button>
          <button
            type="button"
            className="h-carousel-btn h-carousel-btn--next"
            onClick={() => scrollBy(1)}
            disabled={!canNext}
            aria-label="Siguiente"
          >
            <IconChevronRight size={22} />
          </button>
        </>
      )}
      <div
        ref={trackRef}
        className="h-carousel-track"
        role="list"
        aria-label={ariaLabel}
        style={{ gap: `${gap}px` }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="h-carousel-slide"
            role="listitem"
            style={{ flex: `0 0 ${itemWidth}px`, width: itemWidth }}
          >
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="h-carousel-dots" role="tablist" aria-label="Posición del carrusel">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              className={`h-carousel-dot${i === activeDot ? " is-active" : ""}`}
              aria-selected={i === activeDot}
              aria-label={`Elemento ${i + 1} de ${count}`}
              onClick={() => {
                trackRef.current?.scrollTo({
                  left: i * (itemWidth + gap),
                  behavior: "smooth",
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
