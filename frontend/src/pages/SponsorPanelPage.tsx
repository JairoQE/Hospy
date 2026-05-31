import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SponsorContactConfig } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { PrimeIcon } from "../components/PrimeIcon";
import { SponsorAdsDashboard } from "../components/sponsor/SponsorAdsDashboard";
import "../styles/ads.css";
import "../styles/sponsor-dashboard.css";
import "../styles/sponsor-panel.css";

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
    <div className="sponsor-panel-page">
      {user?.sponsor_warning_message && (
        <div className="sponsor-panel-alert sponsor-panel-alert--error" role="alert">
          <PrimeIcon name="pi-exclamation-triangle" size={24} />
          <div>
            <strong>Advertencia del administrador</strong>
            <p>{user.sponsor_warning_message}</p>
          </div>
        </div>
      )}

      {sponsorPending && (
        <div className="sponsor-panel-alert sponsor-panel-alert--info" role="status">
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
        <div className="sponsor-panel-alert sponsor-panel-alert--error" role="alert">
          <PrimeIcon name="pi-times-circle" size={24} />
          <div>
            <strong>Cuenta rechazada</strong>
            <p>{user?.sponsor_rejection_reason || "Contacta al administrador."}</p>
          </div>
        </div>
      )}

      {approved && <SponsorAdsDashboard maxDur={maxDur} onRefreshUser={refreshUser} />}
    </div>
  );
}
