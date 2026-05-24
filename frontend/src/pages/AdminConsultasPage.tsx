import { Link } from "react-router-dom";
import { AdminMessageReportsSection } from "../components/AdminMessageReportsSection";

export function AdminConsultasPage() {
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Consultas y reportes</h1>
      <p className="admin-page-sub">
        Mensajes reportados y bandeja de conversaciones de la plataforma.
      </p>

      <section className="admin-moderation-section">
        <h2 className="admin-section-title">Mensajes reportados</h2>
        <AdminMessageReportsSection />
      </section>

      <p className="admin-page-foot">
        <Link to="/bandeja" className="admin-link-btn">
          Abrir bandeja completa de mensajes
        </Link>
      </p>
    </div>
  );
}
