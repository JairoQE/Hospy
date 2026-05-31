import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from "react";

const PropertyMap = lazy(() =>
  import("./PropertyMap").then((m) => ({ default: m.PropertyMap })),
);

type Props = ComponentProps<typeof PropertyMap>;

export function LazyPropertyMap({ className = "", ...props }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const skeletonClass = ["property-map-skeleton", className].filter(Boolean).join(" ");

  return (
    <div ref={hostRef}>
      {visible ? (
        <Suspense fallback={<div className={skeletonClass} aria-hidden />}>
          <PropertyMap {...props} className={className} />
        </Suspense>
      ) : (
        <div className={skeletonClass} aria-hidden />
      )}
    </div>
  );
}
