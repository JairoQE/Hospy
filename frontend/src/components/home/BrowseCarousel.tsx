import { Children, cloneElement, isValidElement, useState, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  ariaLabel?: string;
  /** Carrusel infinito en movimiento continuo. */
  loop?: boolean;
}

export function BrowseCarousel({ children, ariaLabel, loop = false }: Props) {
  const items = Children.toArray(children);
  const count = items.length;
  const [paused, setPaused] = useState(false);

  if (!loop || count <= 1) {
    return (
      <div className="browse-carousel">
        <div className="browse-carousel-track browse-carousel-track-static" aria-label={ariaLabel}>
          {items.map((child, i) => (
            <div key={i} className="browse-carousel-slide">
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const durationSec = Math.max(count * 5, 28);

  const renderSlide = (child: ReactNode, i: number, prefix: string) => (
    <div key={`${prefix}-${i}`} className="browse-carousel-slide">
      {isValidElement(child)
        ? cloneElement(child, { key: `${prefix}-${i}` })
        : child}
    </div>
  );

  return (
    <div
      className="browse-carousel browse-carousel-autoplay"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="browse-carousel-marquee">
        <div
          className={`browse-carousel-marquee-track${paused ? " is-paused" : ""}`}
          style={{ "--marquee-duration": `${durationSec}s` } as CSSProperties}
        >
          {items.map((child, i) => renderSlide(child, i, "a"))}
          {items.map((child, i) => renderSlide(child, i, "b"))}
        </div>
      </div>
    </div>
  );
}
