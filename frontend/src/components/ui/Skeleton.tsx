type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`skeleton-text ${className}`.trim()}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="skeleton-line"
          style={{ width: i === lines - 1 ? "72%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonBrowseTile() {
  return (
    <div className="skeleton-browse-tile">
      <Skeleton className="skeleton-browse-tile-img" />
      <Skeleton className="skeleton-browse-tile-label" style={{ width: "70%" }} />
      <Skeleton className="skeleton-browse-tile-sub" style={{ width: "45%" }} />
    </div>
  );
}

export function SkeletonAccCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`skeleton-acc-card${compact ? " skeleton-acc-card--compact" : ""}`}>
      <Skeleton className="skeleton-acc-card-img" />
      <div className="skeleton-acc-card-body">
        <Skeleton className="skeleton-line" style={{ width: "85%", height: "1rem" }} />
        <Skeleton className="skeleton-line" style={{ width: "55%", height: "0.75rem" }} />
        <Skeleton className="skeleton-line" style={{ width: "40%", height: "0.85rem" }} />
      </div>
    </div>
  );
}

export function SkeletonBrowseTilesRow({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-browse-row">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBrowseTile key={i} />
      ))}
    </div>
  );
}

export function SkeletonAccGrid({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className={`acc-grid${compact ? " acc-grid--compact" : ""}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonAccCard key={i} compact={compact} />
      ))}
    </div>
  );
}
