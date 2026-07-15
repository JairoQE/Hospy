import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PrimeIcon } from "../components/PrimeIcon";
import "../styles/developers-guide.css";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://hospy-api-wm7v5futiq-rj.a.run.app/api/v1";

const ROOT_API = API_BASE.replace(/\/api\/v1\/?$/, "");

const TOC = [
  { id: "contexto", label: "1. Contexto de la plataforma" },
  { id: "politicas", label: "2. Políticas y restricciones" },
  { id: "arquitectura", label: "3. Arquitectura de integración" },
  { id: "pasos", label: "4. Cómo obtener tu API Key" },
  { id: "auth", label: "5. Autenticación" },
  { id: "endpoints", label: "6. Endpoints disponibles" },
  { id: "campos", label: "7. Campos del JSON" },
  { id: "ejemplos", label: "8. Ejemplos de código" },
  { id: "fuera", label: "9. Alcance (qué no incluye)" },
  { id: "faq", label: "10. Preguntas frecuentes" },
] as const;

function CodeBlock({
  title,
  language,
  children,
}: {
  title?: string;
  language?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [children]);

  return (
    <div className="dev-code">
      <div className="dev-code-bar">
        <span className="dev-code-meta">
          {title ? <strong>{title}</strong> : null}
          {language ? <span className="dev-code-lang">{language}</span> : null}
        </span>
        <button type="button" className="dev-code-copy" onClick={() => void copy()}>
          <PrimeIcon name={copied ? "pi-check" : "pi-copy"} size={14} />
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre>
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

function SpecCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="dev-spec-card">
      <div className="dev-spec-icon" aria-hidden>
        <PrimeIcon name={icon} size={18} />
      </div>
      <div>
        <h3>{title}</h3>
        <div className="dev-spec-body">{children}</div>
      </div>
    </article>
  );
}

function EndpointCard({
  method,
  path,
  title,
  description,
  params,
  sampleUrl,
}: {
  method: string;
  path: string;
  title: string;
  description: string;
  params?: { name: string; required?: boolean; text: string }[];
  sampleUrl: string;
}) {
  return (
    <article className="dev-endpoint">
      <div className="dev-endpoint-head">
        <span className="dev-method">{method}</span>
        <code className="dev-path">{path}</code>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {params && params.length > 0 ? (
        <ul className="dev-params">
          {params.map((p) => (
            <li key={p.name}>
              <code>{p.name}</code>
              {p.required ? <span className="dev-badge-req">requerido</span> : (
                <span className="dev-badge-opt">opcional</span>
              )}
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <CodeBlock title="URL de ejemplo" language="http">
        {sampleUrl}
      </CodeBlock>
    </article>
  );
}

export function DevelopersGuidePage() {
  const { user } = useAuth();

  const curlExample = `curl -s \\
  -H "X-Hospy-Integration-Key: hspy_tu_clave_aqui" \\
  -H "Accept: application/json" \\
  "${API_BASE}/integracion/hospedajes/"`;

  const nodeExample = `// .env
// HOSPY_API_KEY=hspy_tu_clave_aqui
// HOSPY_API_BASE=${API_BASE}

require("dotenv").config();

const API_KEY = process.env.HOSPY_API_KEY;
const URL_BASE = process.env.HOSPY_API_BASE + "/integracion/hospedajes/";

async function traerHospedajes() {
  try {
    const response = await fetch(URL_BASE, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Hospy-Integration-Key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status + ": " + (await response.text()));
    }

    const data = await response.json();
    console.log("Total:", data.count);
    console.log(data.results);
  } catch (error) {
    console.error("Error al integrar con Hospy:", error);
  }
}

traerHospedajes();`;

  const pythonExample = `import os
import requests

API_KEY = os.environ["HOSPY_API_KEY"]
URL = "${API_BASE}/integracion/hospedajes/"

r = requests.get(
    URL,
    headers={
        "Accept": "application/json",
        "X-Hospy-Integration-Key": API_KEY,
    },
    timeout=20,
)
r.raise_for_status()
data = r.json()
print(data["count"], "hospedajes")
print(data["results"][:2])`;

  const sampleJson = `{
  "count": 12,
  "next": "${API_BASE}/integracion/hospedajes/?page=2",
  "previous": null,
  "results": [
    {
      "id": 42,
      "name": "Hostal Centro Lima",
      "type": "hostal",
      "city": "Lima",
      "region": "Lima",
      "country": "PE",
      "average_rating": 4.6,
      "reviews_count": 18,
      "precio_desde": "85.00",
      "oferta_activa": false,
      "descuento_porcentaje": null,
      "foto_principal": "https://res.cloudinary.com/.../foto.jpg",
      "created_at": "2026-03-12T15:40:00Z"
    }
  ]
}`;

  return (
    <div className="page developers-guide">
      <div className="developers-guide-shell container">
        <aside className="developers-guide-aside" aria-label="Índice">
          <p className="developers-guide-aside-title">Guía rápida</p>
          <nav className="developers-guide-toc">
            <ol>
              {TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="developers-guide-aside-cta">
            {user ? (
              <Link to="/perfil" className="btn btn-primary btn-sm">
                Ir a mi API Key
              </Link>
            ) : (
              <Link to="/registro-desarrollador" className="btn btn-primary btn-sm">
                Registro desarrollador
              </Link>
            )}
            <a
              className="btn btn-ghost btn-sm"
              href={`${ROOT_API}/api/docs/`}
              target="_blank"
              rel="noreferrer"
            >
              Swagger
            </a>
          </div>
        </aside>

        <div className="developers-guide-main">
          <header className="developers-guide-hero">
            <p className="developers-guide-kicker">Documentación · Modo desarrollador</p>
            <h1>API de integración Hospy</h1>
            <p className="developers-guide-lead">
              Esta guía explica, paso a paso, cómo un sistema externo puede <strong>leer el
              catálogo público de hospedajes</strong> de Hospy: qué es la API, políticas,
              autenticación con API Key, endpoints, campos del JSON y ejemplos listos para
              copiar (cURL, Node.js y Python).
            </p>
            <div className="developers-guide-hero-chips" aria-label="Resumen técnico">
              <span className="dev-chip">REST · HTTPS</span>
              <span className="dev-chip">JSON</span>
              <span className="dev-chip">API Key</span>
              <span className="dev-chip">Solo lectura (GET)</span>
              <span className="dev-chip">OpenAPI 3</span>
            </div>
            <div className="developers-guide-actions">
              {user ? (
                <Link to="/perfil" className="btn btn-primary">
                  Activar / generar API Key en mi perfil
                </Link>
              ) : (
                <>
                  <Link to="/registro-desarrollador" className="btn btn-primary">
                    Registrarme como desarrollador
                  </Link>
                  <Link to="/login" className="btn btn-ghost">
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>
          </header>

          <section id="contexto" className="developers-guide-section">
            <h2>1. Contexto de la plataforma</h2>
            <p>
              <strong>Hospy</strong> es una plataforma de hospedajes (hoteles, hostales y
              alojamientos) orientada a viajeros y anfitriones. Además del sitio web, expone una{" "}
              <strong>API pública para desarrolladores</strong> cuyo propósito principal es
              permitir la <strong>extracción y consumo de metadatos</strong> de los hospedajes
              publicados en su catálogo.
            </p>
            <p>
              Caso de uso típico: un portal universitario, un marketplace, un panel propio o un
              script académico consulta Hospy periódicamente (modelo <em>pull</em>) y muestra u
              procesa esos datos en su propia interfaz.
            </p>
            <div className="developers-guide-callout">
              <PrimeIcon name="pi-info-circle" size={18} />
              <p>
                Hospy actúa como <strong>proveedor de datos</strong>. Tu aplicación es el{" "}
                <strong>cliente</strong>. No necesitas ESB, SOAP ni GraphQL para este alcance:
                basta HTTPS + JSON + tu API Key.
              </p>
            </div>
          </section>

          <section id="politicas" className="developers-guide-section">
            <h2>2. Políticas y restricciones</h2>
            <div className="dev-spec-grid">
              <SpecCard icon="pi-file" title="Formato de intercambio">
                <p>
                  Exclusivamente <strong>JSON</strong> (<code>application/json</code>) en
                  respuestas. Fechas en <strong>ISO 8601</strong>. Montos en{" "}
                  <strong>PEN</strong> (soles).
                </p>
              </SpecCard>
              <SpecCard icon="pi-eye" title="Visibilidad del catálogo">
                <p>
                  Solo hospedajes <strong>públicos / aprobados</strong>. Borradores o rechazados
                  no aparecen en la API de integración.
                </p>
              </SpecCard>
              <SpecCard icon="pi-lock" title="Autenticación">
                <p>
                  Obligatoria en todos los endpoints de <code>/integracion/</code> mediante el
                  header <code>X-Hospy-Integration-Key</code>.
                </p>
              </SpecCard>
              <SpecCard icon="pi-gauge" title="Uso razonable / throttling">
                <p>
                  Evita ráfagas abusivas. La API pública aplica throttling. Ante abuso, el acceso
                  puede <strong>revocarse</strong> desde el panel de Hospy.
                </p>
              </SpecCard>
            </div>
          </section>

          <section id="arquitectura" className="developers-guide-section">
            <h2>3. Arquitectura de integración</h2>
            <ol className="dev-arch-steps">
              <li>
                <strong>Cliente–servidor</strong> — tu backend o script llama a la API Hospy.
              </li>
              <li>
                <strong>REST sobre HTTPS</strong> — recursos identificados por URL; verbos HTTP
                (en esta versión solo <code>GET</code>).
              </li>
              <li>
                <strong>Asíncrono recomendado</strong> — en Node.js usa <code>async/await</code> +{" "}
                <code>fetch</code>; en Python, <code>requests</code> o <code>httpx</code>.
              </li>
              <li>
                <strong>Secretos fuera del código</strong> — guarda la API Key en <code>.env</code>{" "}
                (nunca en el frontend público ni en Git).
              </li>
            </ol>
            <p className="muted">
              Base URL de producción (v1): <code>{API_BASE}</code>
            </p>
          </section>

          <section id="pasos" className="developers-guide-section">
            <h2>4. Cómo obtener tu API Key</h2>
            <p>
              El acceso es <strong>self-service</strong>: no esperas aprobación del administrador
              para empezar. El admin sí puede revocar después si hay abuso.
            </p>
            <ol className="dev-steps-cards">
              <li>
                <span className="dev-step-num">1</span>
                <div>
                  <strong>Crea cuenta de desarrollador</strong>
                  <p>
                    Usa{" "}
                    <Link to="/registro-desarrollador">Registro API</Link> o una cuenta Hospy
                    normal.
                  </p>
                </div>
              </li>
              <li>
                <span className="dev-step-num">2</span>
                <div>
                  <strong>Activa el acceso en el perfil</strong>
                  <p>
                    En <Link to="/perfil">Mi perfil</Link> → sección de integración →{" "}
                    <em>Activar acceso desarrollador</em>.
                  </p>
                </div>
              </li>
              <li>
                <span className="dev-step-num">3</span>
                <div>
                  <strong>Genera la API Key</strong>
                  <p>
                    Pulsa <strong>Generar API Key</strong>. Se muestra <strong>una sola vez</strong>{" "}
                    (prefijo <code>hspy_…</code>). Cópiala al instante.
                  </p>
                </div>
              </li>
              <li>
                <span className="dev-step-num">4</span>
                <div>
                  <strong>Guárdala en variables de entorno</strong>
                  <p>
                    Ejemplo: <code>HOSPY_API_KEY=hspy_…</code> en un archivo <code>.env</code>{" "}
                    ignorado por Git.
                  </p>
                </div>
              </li>
              <li>
                <span className="dev-step-num">5</span>
                <div>
                  <strong>Llama a los endpoints</strong>
                  <p>
                    Envía siempre el header <code>X-Hospy-Integration-Key</code> (ver sección
                    siguiente).
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section id="auth" className="developers-guide-section">
            <h2>5. Autenticación</h2>
            <p>
              A diferencia de otros sistemas que usan <code>Authorization: Bearer …</code>, Hospy
              usa un header dedicado:
            </p>
            <CodeBlock title="Header obligatorio" language="http">{`X-Hospy-Integration-Key: hspy_tu_clave_aqui
Accept: application/json`}</CodeBlock>
            <div className="developers-guide-callout developers-guide-callout--warn">
              <PrimeIcon name="pi-exclamation-triangle" size={18} />
              <p>
                Si omites la key, envías una inválida o está revocada, recibirás error de acceso
                (típicamente <strong>401/403</strong>). Rotar la key invalida la anterior al
                instante.
              </p>
            </div>
          </section>

          <section id="endpoints" className="developers-guide-section">
            <h2>6. Endpoints disponibles</h2>
            <p>
              Prefijo: <code>{API_BASE}/integracion/</code>
            </p>

            <EndpointCard
              method="GET"
              path="/integracion/hospedajes/"
              title="A. Listar hospedajes"
              description="Retorna el catálogo público paginado (count, next, previous, results). Puede incluir filtros de búsqueda según query params del API."
              sampleUrl={`${API_BASE}/integracion/hospedajes/`}
            />

            <EndpointCard
              method="GET"
              path="/integracion/hospedajes/disponibles/"
              title="B. Disponibles por fechas"
              description="Igual que el listado, pero solo alojamientos con disponibilidad entre las fechas indicadas."
              params={[
                {
                  name: "entrada",
                  required: true,
                  text: "Fecha check-in YYYY-MM-DD",
                },
                {
                  name: "salida",
                  required: true,
                  text: "Fecha check-out YYYY-MM-DD",
                },
              ]}
              sampleUrl={`${API_BASE}/integracion/hospedajes/disponibles/?entrada=2026-08-01&salida=2026-08-03`}
            />

            <EndpointCard
              method="GET"
              path="/integracion/hospedajes/cercanos/"
              title="C. Cercanos a una coordenada"
              description="Hospedajes cerca de un punto geográfico. Útil para mapas o “cerca de mí”."
              params={[
                { name: "lat", required: true, text: "Latitud decimal" },
                { name: "lng", required: true, text: "Longitud decimal" },
                {
                  name: "radio_km",
                  required: false,
                  text: "Radio en km (por defecto 10)",
                },
              ]}
              sampleUrl={`${API_BASE}/integracion/hospedajes/cercanos/?lat=-12.0464&lng=-77.0428&radio_km=8`}
            />

            <EndpointCard
              method="GET"
              path="/integracion/hospedajes/{id}/"
              title="D. Detalle de un hospedaje"
              description="Esquema ampliado de un solo recurso: descripción, dirección, coordenadas y servicios."
              params={[
                {
                  name: "id",
                  required: true,
                  text: "Identificador numérico del alojamiento",
                },
              ]}
              sampleUrl={`${API_BASE}/integracion/hospedajes/42/`}
            />

            <p>
              Contrato completo:{" "}
              <a href={`${ROOT_API}/api/docs/`} target="_blank" rel="noreferrer">
                Swagger UI
              </a>{" "}
              ·{" "}
              <a href={`${ROOT_API}/api/schema/`} target="_blank" rel="noreferrer">
                OpenAPI schema
              </a>
              .
            </p>
          </section>

          <section id="campos" className="developers-guide-section">
            <h2>7. Campos del JSON (qué datos puedes integrar)</h2>
            <h3>Listados (<code>results[]</code>)</h3>
            <div className="developers-guide-table-wrap">
              <table className="developers-guide-table">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Significado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>id</code>, <code>name</code>, <code>type</code>
                    </td>
                    <td>Identidad del alojamiento (hotel, hostal, etc.)</td>
                  </tr>
                  <tr>
                    <td>
                      <code>city</code>, <code>region</code>, <code>country</code>
                    </td>
                    <td>Ubicación administrativa</td>
                  </tr>
                  <tr>
                    <td>
                      <code>precio_desde</code>, <code>oferta_activa</code>,{" "}
                      <code>descuento_porcentaje</code>
                    </td>
                    <td>Precio referencial y ofertas</td>
                  </tr>
                  <tr>
                    <td>
                      <code>average_rating</code>, <code>reviews_count</code>
                    </td>
                    <td>Valoración pública</td>
                  </tr>
                  <tr>
                    <td>
                      <code>foto_principal</code>
                    </td>
                    <td>URL de imagen (CDN)</td>
                  </tr>
                  <tr>
                    <td>
                      <code>created_at</code>, <code>distance_km</code>
                    </td>
                    <td>Alta del listing; distancia si pediste cercanos</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Detalle (<code>GET …/hospedajes/&#123;id&#125;/</code>)</h3>
            <p>
              Además de lo anterior (según serializer): <code>description</code>,{" "}
              <code>address</code>, <code>latitude</code>, <code>longitude</code>,{" "}
              <code>services</code> (lista de amenidades).
            </p>

            <h3>Ejemplo de respuesta paginada</h3>
            <CodeBlock title="200 OK" language="json">
              {sampleJson}
            </CodeBlock>
          </section>

          <section id="ejemplos" className="developers-guide-section">
            <h2>8. Ejemplos de código</h2>
            <p>
              La lógica es la misma en cualquier lenguaje: <strong>GET + header de API Key +
              parsear JSON</strong>.
            </p>
            <CodeBlock title="cURL" language="bash">
              {curlExample}
            </CodeBlock>
            <CodeBlock title="Node.js (fetch + dotenv)" language="javascript">
              {nodeExample}
            </CodeBlock>
            <CodeBlock title="Python (requests)" language="python">
              {pythonExample}
            </CodeBlock>
          </section>

          <section id="fuera" className="developers-guide-section">
            <h2>9. Alcance: qué no incluye (por ahora)</h2>
            <ul className="dev-out-list">
              <li>Crear o modificar reservas, pagos o reembolsos</li>
              <li>Datos personales de usuarios, chats o paneles internos</li>
              <li>Webhooks push (notificaciones salientes)</li>
              <li>Escritura en el catálogo (solo lectura con GET)</li>
              <li>Empresas / RUC vía esta API de integración (uso interno de la app)</li>
            </ul>
          </section>

          <section id="faq" className="developers-guide-section">
            <h2>10. Preguntas frecuentes</h2>
            <div className="dev-faq">
              <details open>
                <summary>¿Necesito un rol especial “desarrollador”?</summary>
                <p>
                  No hace falta que un admin te asigne el rol. Activas el acceso desde el perfil (o
                  al registrarte como desarrollador) y obtienes un{" "}
                  <em>cliente de integración</em> ligado a tu usuario.
                </p>
              </details>
              <details>
                <summary>¿Perdí mi API Key?</summary>
                <p>
                  No se puede recuperar el valor completo. En el perfil, con el acceso activo, usa{" "}
                  <strong>Rotar API Key</strong> y actualiza tu <code>.env</code>.
                </p>
              </details>
              <details>
                <summary>¿Puedo usar la key en el frontend del navegador?</summary>
                <p>
                  <strong>No recomendado.</strong> Cualquiera podría verla en DevTools. Llama a
                  Hospy desde tu backend o un script de servidor.
                </p>
              </details>
              <details>
                <summary>¿Dónde veo cuántas consultas hice?</summary>
                <p>
                  En tu perfil (contador de usos del cliente) y el administrador en el panel de
                  Integración.
                </p>
              </details>
              <details>
                <summary>¿Es igual que APIs de otras plataformas (p. ej. eventos)?</summary>
                <p>
                  El patrón es el mismo (REST + JSON + API Key). Cambia el recurso (hospedajes vs
                  eventos) y el nombre exacto del header (
                  <code>X-Hospy-Integration-Key</code>).
                </p>
              </details>
            </div>
          </section>

          <footer className="developers-guide-footer">
            <div>
              <p>
                ¿Listo para integrar?{" "}
                {user ? (
                  <Link to="/perfil">Genera tu API Key en el perfil</Link>
                ) : (
                  <Link to="/registro-desarrollador">Regístrate como desarrollador</Link>
                )}
                {" · "}
                <Link to="/">Volver al inicio</Link>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
