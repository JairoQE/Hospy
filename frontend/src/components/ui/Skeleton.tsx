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

export function SkeletonOwnerStorePage() {
  return (
    <div className="owner-store-page" aria-busy="true" aria-label="Cargando perfil del anfitrión">
      <div className="owner-store-shell">
        <Skeleton className="skeleton-breadcrumb" />
        <Skeleton className="skeleton-kicker" style={{ width: "42%", height: "0.85rem" }} />

        <div className="card-elevated skeleton-owner-hero">
          <Skeleton className="skeleton-owner-hero-cover" />
          <div className="skeleton-owner-hero-body">
            <Skeleton className="skeleton-owner-avatar" />
            <div className="skeleton-owner-hero-text">
              <Skeleton className="skeleton-line" style={{ width: "55%", height: "1.75rem" }} />
              <div className="skeleton-chip-row">
                <Skeleton className="skeleton-chip" />
                <Skeleton className="skeleton-chip" />
              </div>
              <div className="skeleton-metrics-row">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="skeleton-metric">
                    <Skeleton className="skeleton-line" style={{ width: "2.5rem", height: "1.1rem" }} />
                    <Skeleton className="skeleton-line" style={{ width: "3.5rem", height: "0.65rem" }} />
                  </div>
                ))}
              </div>
              <div className="skeleton-btn-row">
                <Skeleton className="skeleton-btn" />
                <Skeleton className="skeleton-btn skeleton-btn--ghost" />
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated skeleton-owner-about">
          <Skeleton className="skeleton-line" style={{ width: "38%", height: "1.1rem" }} />
          <SkeletonText lines={4} className="skeleton-owner-about-text" />
        </div>

        <section className="skeleton-owner-listings">
          <Skeleton className="skeleton-line" style={{ width: "32%", height: "1.25rem" }} />
          <div className="skeleton-filter-row">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="skeleton-filter-chip" />
            ))}
          </div>
          <div className="owner-store-properties-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton-owner-property-card">
                <Skeleton className="skeleton-owner-property-img" />
                <div className="skeleton-owner-property-body">
                  <Skeleton className="skeleton-line" style={{ width: "80%", height: "1rem" }} />
                  <Skeleton className="skeleton-line" style={{ width: "50%", height: "0.75rem" }} />
                  <Skeleton className="skeleton-line" style={{ width: "35%", height: "0.85rem" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function SkeletonPropertyDetail() {
  return (
    <div className="property-detail skeleton-property-detail" aria-busy="true" aria-label="Cargando hospedaje">
      <div className="container">
        <Skeleton className="skeleton-breadcrumb" />
        <div className="skeleton-property-header">
          <div className="skeleton-property-header-main">
            <Skeleton className="skeleton-line" style={{ width: "min(420px, 70%)", height: "2rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "min(320px, 55%)", height: "0.9rem" }} />
          </div>
          <div className="skeleton-btn-row">
            <Skeleton className="skeleton-btn skeleton-btn--ghost" />
            <Skeleton className="skeleton-btn" />
          </div>
        </div>
      </div>
      <div className="container property-gallery-wrap">
        <div className="skeleton-property-gallery">
          <Skeleton className="skeleton-property-gallery-main" />
          <div className="skeleton-property-gallery-side">
            <Skeleton className="skeleton-property-gallery-thumb" />
            <Skeleton className="skeleton-property-gallery-thumb" />
          </div>
        </div>
      </div>
      <div className="container property-layout">
        <main className="property-main">
          <div className="property-section skeleton-property-section">
            <Skeleton className="skeleton-line" style={{ width: "28%", height: "1.1rem" }} />
            <SkeletonText lines={5} />
          </div>
          <div className="property-section skeleton-property-section">
            <Skeleton className="skeleton-line" style={{ width: "34%", height: "1.1rem" }} />
            <SkeletonText lines={3} />
          </div>
        </main>
        <aside className="property-sidebar">
          <div className="card skeleton-booking-card">
            <Skeleton className="skeleton-line" style={{ width: "60%", height: "1.25rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "100%", height: "2.75rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "100%", height: "2.75rem" }} />
            <Skeleton className="skeleton-btn" style={{ width: "100%", height: "2.75rem" }} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SkeletonBookingList({ count = 3 }: { count?: number }) {
  return (
    <ul className="booking-list" aria-busy="true" aria-label="Cargando reservas">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card booking-item skeleton-booking-item">
          <div className="skeleton-booking-head">
            <Skeleton className="skeleton-line" style={{ width: "45%", height: "1.1rem" }} />
            <Skeleton className="skeleton-chip" style={{ width: "5.5rem", height: "1.5rem" }} />
          </div>
          <Skeleton className="skeleton-line" style={{ width: "62%", height: "0.85rem" }} />
          <Skeleton className="skeleton-line" style={{ width: "48%", height: "0.85rem" }} />
          <Skeleton className="skeleton-btn skeleton-btn--ghost" style={{ width: "8.5rem", marginTop: "0.5rem" }} />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonInboxList({ count = 5 }: { count?: number }) {
  return (
    <ul className="inbox-list skeleton-inbox-list" aria-busy="true" aria-label="Cargando mensajes">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card skeleton-inbox-item">
          <Skeleton className="skeleton-inbox-avatar" />
          <div className="skeleton-inbox-body">
            <Skeleton className="skeleton-line" style={{ width: "40%", height: "0.95rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "85%", height: "0.75rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "30%", height: "0.65rem" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SkeletonOwnerPanel() {
  return (
    <div className="skeleton-owner-panel" aria-busy="true" aria-label="Cargando panel">
      <div className="skeleton-kpi-row">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card skeleton-kpi-card">
            <Skeleton className="skeleton-line" style={{ width: "55%", height: "0.75rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "40%", height: "1.5rem" }} />
          </div>
        ))}
      </div>
      <div className="skeleton-chart-row">
        <div className="card skeleton-chart-card">
          <Skeleton className="skeleton-line" style={{ width: "38%", height: "1rem" }} />
          <Skeleton className="skeleton-chart-area" />
        </div>
        <div className="card skeleton-chart-card">
          <Skeleton className="skeleton-line" style={{ width: "42%", height: "1rem" }} />
          <Skeleton className="skeleton-chart-area skeleton-chart-area--short" />
        </div>
      </div>
      <SkeletonAccGrid count={3} compact />
    </div>
  );
}

export function SkeletonFormPage({ fields = 8 }: { fields?: number }) {
  return (
    <div className="skeleton-form-page" aria-busy="true" aria-label="Cargando formulario">
      <Skeleton className="skeleton-line" style={{ width: "min(280px, 60%)", height: "1.75rem" }} />
      <div className="skeleton-form-grid">
        {Array.from({ length: fields }, (_, i) => (
          <label key={i} className="skeleton-form-field">
            <Skeleton className="skeleton-line" style={{ width: "35%", height: "0.75rem" }} />
            <Skeleton className="skeleton-form-input" />
          </label>
        ))}
      </div>
      <Skeleton className="skeleton-btn" style={{ width: "9rem", marginTop: "1rem" }} />
    </div>
  );
}

export function SkeletonProfilePage() {
  return (
    <div className="container page skeleton-profile-page" aria-busy="true" aria-label="Cargando perfil">
      <div className="card skeleton-profile-hero">
        <Skeleton className="skeleton-profile-cover" />
        <div className="skeleton-profile-hero-body">
          <Skeleton className="skeleton-owner-avatar" />
          <Skeleton className="skeleton-line" style={{ width: "40%", height: "1.5rem" }} />
          <Skeleton className="skeleton-line" style={{ width: "28%", height: "0.85rem" }} />
        </div>
      </div>
      <div className="card skeleton-profile-section">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}

export function SkeletonAdminStats() {
  return (
    <div className="skeleton-admin-dashboard" aria-busy="true" aria-label="Cargando estadísticas">
      <div className="skeleton-kpi-row">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card skeleton-kpi-card">
            <Skeleton className="skeleton-line" style={{ width: "60%", height: "0.75rem" }} />
            <Skeleton className="skeleton-line" style={{ width: "45%", height: "1.4rem" }} />
          </div>
        ))}
      </div>
      <div className="skeleton-chart-row">
        <div className="card skeleton-chart-card skeleton-chart-card--wide">
          <Skeleton className="skeleton-chart-area" />
        </div>
        <div className="card skeleton-chart-card">
          <Skeleton className="skeleton-chart-area skeleton-chart-area--short" />
        </div>
      </div>
    </div>
  );
}
