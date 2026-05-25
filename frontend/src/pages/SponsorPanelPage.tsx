import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { SponsorContactConfig } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { PrimeIcon } from "../components/PrimeIcon";
import { SponsorAdsDashboard } from "../components/sponsor/SponsorAdsDashboard";
import "../styles/ads.css";
import "../styles/sponsor-dashboard.css";

export function SponsorPanelPage() {
  const { user, isSponsorApproved, refreshUser } = useAuth();
  const [config, setConfig] = useState<SponsorContactConfig | null>(null);

  const sponsorPending = user?.role === "patrocinador" && user.sponsor_status === "pendiente";
  const sponsorRejected = user?.role === "patrocinador" && user.sponsor_status === "rechazado";
  const approved = isSponsorApproved();
  const maxDur = config?.max_duration_seconds ?? 10;

  useEffect(() => {
    api
      .get<SponsorContactConfig>("/anuncios/config/", false)
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  return (
    <div className="sponsor-dashboard-wrap">
      {user?.sponsor_warning_message && (
        <div className="container login-alert login-alert--error" role="alert">
          <strong>Advertencia del administrador</strong>
          <p>{user.sponsor_warning_message}</p>
        </div>
      )}

      {sponsorPending && (
        <div className="container sponsor-panel-card sponsor-panel-card--info">
          <PrimeIcon name="pi-clock" size={28} />
          <div>
            <strong>Cuenta en revisión</strong>
            <p>
              Tu acuerdo financiero debe estar confirmado por el administrador. Cuando apruebe tu
              cuenta podrás publicar anuncios aquí.
            </p>
            {config?.admin_whatsapp_url && (
              <a
                href={config.admin_whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm sponsor-wa-btn"
              >
                <PrimeIcon name="pi-whatsapp" size={16} /> Contactar administrador
              </a>
            )}
          </div>
        </div>
      )}

      {sponsorRejected && (
        <div className="container login-alert login-alert--error" role="alert">
          <strong>Cuenta rechazada</strong>
          <p>{user?.sponsor_rejection_reason || "Contacta al administrador."}</p>
        </div>
      )}

      {approved && <SponsorAdsDashboard maxDur={maxDur} onRefreshUser={refreshUser} />}

      <p className="container muted sponsor-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </div>
  );
}
