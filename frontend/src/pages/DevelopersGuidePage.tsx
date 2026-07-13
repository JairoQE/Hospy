import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PrimeIcon } from "../components/PrimeIcon";
import "../styles/developers-guide.css";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1";

const ROOT_API = API_BASE.replace(/\/api\/v1\/?$/, "");

export function DevelopersGuidePage() {
  const { user } = useAuth();

  return (
    <div className="container page developers-guide">
      <header className="developers-guide-hero">
        <p className="developers-guide-kicker">API pública · Interoperabilidad</p>
        <h1>¿Eres desarrollador?</h1>
        <p className="developers-guide-lead">
          Integra el catálogo de hospedajes de <strong>Hospy</strong> en tu sistema, portal
          universitario, app o marketplace. Esta guía explica el modelo de integración, los
          datos disponibles, los pasos para obtener tu API Key y buenas prácticas de seguridad.
        </p>
        <div className="developers-guide-actions">
          {user ? (
            <Link to="/perfil" className="btn btn-primary">
              Solicitar acceso en mi perfil
            </Link>
          ) : (
            <>
              <Link to="/registro" className="btn btn-primary">
                Crear cuenta y solicitar API
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Ya tengo cuenta
              </Link>
            </>
          )}
          <a
            className="btn btn-ghost"
            href={`${ROOT_API}/api/docs/`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir OpenAPI / Swagger
          </a>
        </div>
      </header>

      <nav className="developers-guide-toc" aria-label="Contenido de la guía">
        <h2>Contenido</h2>
        <ol>
          <li>
            <a href="#que-es">Qué es la API de integración</a>
          </li>
          <li>
            <a href="#tecnica">Técnica de integración recomendada</a>
          </li>
          <li>
            <a href="#pasos">Pasos para obtener acceso</a>
          </li>
          <li>
            <a href="#datos">Qué datos puedes integrar</a>
          </li>
          <li>
            <a href="#endpoints">Endpoints disponibles</a>
          </li>
          <li>
            <a href="#ejemplo">Ejemplo de llamada</a>
          </li>
          <li>
            <a href="#seguridad">Seguridad, auditoría y límites</a>
          </li>
          <li>
            <a href="#fuera">Qué no incluye (por ahora)</a>
          </li>
          <li>
            <a href="#faq">Preguntas frecuentes</a>
          </li>
        </ol>
      </nav>

      <section id="que-es" className="developers-guide-section">
        <h2>1. Qué es la API de integración</h2>
        <p>
          Hospy expone una <strong>API REST en JSON</strong> pensada para sistemas externos
          (SIST universitarios, portales turísticos, back-offices, demos académicas). Tú consumas
          datos públicos del catálogo; Hospy actúa como <strong>proveedor</strong> y tu aplicación
          como <strong>cliente</strong>.
        </p>
        <ul>
          <li>
            Transporte: <strong>HTTPS</strong>
          </li>
          <li>
            Formato: <strong>JSON</strong> (<code>application/json</code>)
          </li>
          <li>
            Autenticación: header <code>X-Hospy-Integration-Key</code>
          </li>
          <li>
            Contrato: esquema <strong>OpenAPI 3</strong> en <code>/api/schema/</code> y UI en{" "}
            <code>/api/docs/</code>
          </li>
        </ul>
      </section>

      <section id="tecnica" className="developers-guide-section">
        <h2>2. Técnica de integración recomendada</h2>
        <p>
          La estrategia oficial de Hospy es <strong>integración síncrona REST (pull)</strong>: tu
          sistema consulta Hospy cuando necesita información. No hace falta un bus ESB, SOAP ni
          GraphQL para este alcance.
        </p>
        <div className="developers-guide-callout">
          <PrimeIcon name="pi-info-circle" size={18} />
          <p>
            Cada integrador tiene un <strong>cliente registrado</strong> con su propia API Key
            (hasheada en servidor). Eso permite auditoría, revocación por partner y monitoreo de
            usos sin afectar a los demás.
          </p>
        </div>
      </section>

      <section id="pasos" className="developers-guide-section">
        <h2>3. Pasos para obtener acceso</h2>
        <ol className="developers-guide-steps">
          <li>
            <strong>Regístrate como desarrollador</strong> desde el login (
            <Link to="/registro-desarrollador">Registro API</Link>) o con una cuenta normal.
          </li>
          <li>
            Si ya tienes cuenta, ve a <Link to="/perfil">Mi perfil</Link> y pulsa{" "}
            <em>Activar acceso desarrollador</em> (sin espera del administrador).
          </li>
          <li>
            Pulsa <strong>Generar API Key</strong> y copia la clave <code>hspy_…</code> (solo se
            muestra una vez).
          </li>
          <li>
            Configura el header <code>X-Hospy-Integration-Key</code> en tu cliente HTTP y prueba
            los endpoints del catálogo.
          </li>
        </ol>
        <p className="muted">
          El administrador puede <strong>revocar</strong> un acceso ante abuso. Si rotas la key,
          la anterior deja de funcionar de inmediato.
        </p>
      </section>

      <section id="datos" className="developers-guide-section">
        <h2>4. Qué datos puedes integrar</h2>
        <p>
          Solo lecturas del <strong>catálogo público de hospedajes</strong>. Útil para listados,
          buscadores propios, mapas o paneles de disponibilidad.
        </p>
        <h3>En listados (búsqueda / disponibilidad / cercanos)</h3>
        <ul>
          <li>
            Identidad: <code>id</code>, <code>name</code>, <code>type</code>
          </li>
          <li>
            Ubicación: <code>city</code>, <code>region</code>, <code>country</code>
          </li>
          <li>
            Precios y ofertas: <code>precio_desde</code>, <code>oferta_activa</code>,{" "}
            <code>descuento_porcentaje</code>
          </li>
          <li>
            Valoración: <code>average_rating</code>, <code>reviews_count</code>
          </li>
          <li>
            Multimedia: <code>foto_principal</code> (URL CDN)
          </li>
          <li>
            Metadatos: <code>created_at</code> (ISO 8601), <code>distance_km</code> (si aplica)
          </li>
        </ul>
        <h3>En el detalle de un hospedaje</h3>
        <ul>
          <li>
            Además: <code>description</code>, <code>address</code>, <code>latitude</code>,{" "}
            <code>longitude</code>
          </li>
          <li>
            Servicios del alojamiento (<code>services</code>: nombre, slug, etc.)
          </li>
        </ul>
      </section>

      <section id="endpoints" className="developers-guide-section">
        <h2>5. Endpoints disponibles</h2>
        <p>
          Base URL de producción (API v1): <code>{API_BASE}</code>
        </p>
        <div className="developers-guide-table-wrap">
          <table className="developers-guide-table">
            <thead>
              <tr>
                <th>Método</th>
                <th>Ruta</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GET</td>
                <td>
                  <code>/integracion/hospedajes/</code>
                </td>
                <td>Listado paginado de hospedajes públicos</td>
              </tr>
              <tr>
                <td>GET</td>
                <td>
                  <code>/integracion/hospedajes/disponibles/?entrada=&amp;salida=</code>
                </td>
                <td>Filtra por fechas (YYYY-MM-DD)</td>
              </tr>
              <tr>
                <td>GET</td>
                <td>
                  <code>/integracion/hospedajes/cercanos/?lat=&amp;lng=&amp;radio_km=</code>
                </td>
                <td>Hospedajes cercanos a un punto</td>
              </tr>
              <tr>
                <td>GET</td>
                <td>
                  <code>/integracion/hospedajes/&#123;id&#125;/</code>
                </td>
                <td>Detalle de un hospedaje</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Documentación interactiva:{" "}
          <a href={`${ROOT_API}/api/docs/`} target="_blank" rel="noreferrer">
            Swagger UI
          </a>{" "}
          · Esquema:{" "}
          <a href={`${ROOT_API}/api/schema/`} target="_blank" rel="noreferrer">
            OpenAPI
          </a>
          .
        </p>
      </section>

      <section id="ejemplo" className="developers-guide-section">
        <h2>6. Ejemplo de llamada</h2>
        <pre className="developers-guide-code">
          <code>{`GET ${API_BASE}/integracion/hospedajes/
Accept: application/json
X-Hospy-Integration-Key: hspy_tu_clave_aqui`}</code>
        </pre>
        <p>
          Respuesta esperada: HTTP <strong>200</strong> con JSON paginado (
          <code>count</code>, <code>results</code>). Sin key o con key inválida/revocada: acceso
          denegado.
        </p>
        <pre className="developers-guide-code">
          <code>{`curl -s \\
  -H "X-Hospy-Integration-Key: hspy_..." \\
  -H "Accept: application/json" \\
  "${API_BASE}/integracion/hospedajes/"`}</code>
        </pre>
      </section>

      <section id="seguridad" className="developers-guide-section">
        <h2>7. Seguridad, auditoría y límites</h2>
        <ul>
          <li>
            Guarda la API Key como secreto (variable de entorno / vault). No la subas a Git ni al
            frontend público.
          </li>
          <li>
            Cada request al catálogo queda registrado para monitoreo (
            <code>request_count</code>, último uso) y en auditoría de Hospy.
          </li>
          <li>
            Hospy puede <strong>revocar</strong> tu cliente en cualquier momento ante abuso o
            incumplimiento.
          </li>
          <li>
            Respeta rates razonables; el servicio aplica throttling a la API pública.
          </li>
          <li>
            Fechas en ISO; montos en soles peruanos (<strong>PEN</strong>) salvo que tu cliente
            convierta monedas.
          </li>
        </ul>
      </section>

      <section id="fuera" className="developers-guide-section">
        <h2>8. Qué no incluye (por ahora)</h2>
        <ul>
          <li>Crear o modificar reservas, pagos o reembolsos</li>
          <li>Datos personales de usuarios, chats o panel de anfitrión</li>
          <li>Webhooks push (notificaciones salientes) — evolución futura</li>
          <li>Escritura en el catálogo (solo <strong>GET</strong>)</li>
        </ul>
        <p>
          Si tu caso de uso requiere eventos en tiempo real o reservas vía API, contacta al equipo
          Hospy para evaluarlo como ampliación.
        </p>
      </section>

      <section id="faq" className="developers-guide-section">
        <h2>9. Preguntas frecuentes</h2>
        <dl className="developers-guide-faq">
          <dt>¿Necesito un rol especial “desarrollador”?</dt>
          <dd>
            No. Basta una cuenta Hospy. La solicitud crea un <em>cliente de integración</em> ligado
            a tu usuario.
          </dd>
          <dt>¿Perdí mi API Key?</dt>
          <dd>
            No se puede recuperar el valor completo. En el perfil, con el acceso activo, usa{" "}
            <strong>Rotar API Key</strong> y actualiza tu sistema.
          </dd>
          <dt>¿Puedo tener varias keys?</dt>
          <dd>
            Puedes gestionar tu cliente aprobado y rotar la key. Para otro sistema distinto, envía
            una nueva solicitud con otro nombre de sistema (tras resolver o revocar la anterior si
            aplica).
          </dd>
          <dt>¿Dónde veo mis usos?</dt>
          <dd>
            En tu perfil (contador de usos) y el administrador en el panel de Integración.
          </dd>
        </dl>
      </section>

      <footer className="developers-guide-footer">
        <p>
          ¿Listo para empezar?{" "}
          {user ? (
            <Link to="/perfil">Ir a mi perfil y solicitar la API</Link>
          ) : (
            <Link to="/registro">Crear cuenta</Link>
          )}
          {" · "}
          <Link to="/">Volver al inicio</Link>
        </p>
      </footer>
    </div>
  );
}
