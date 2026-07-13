# RFt-2-S — Redundancia de componentes

**Fórmula:** X = A / B  
- **A** = componentes instalados con redundancia  
- **B** = total de componentes críticos del sistema  

## Paso 1 — Listar componentes críticos (B)

Completa `redundancy-components.csv` con **todos** los componentes sin los que Hospy no opera.

## Paso 2 — Evaluar redundancia (A)

Para cada fila marca **Sí / Parcial / No** según:

| Criterio | Cuenta como redundante |
|----------|------------------------|
| **Sí** | Hay respaldo explícito (réplicas, CDN, HA, multi-zona) |
| **Parcial** | El proveedor escala o replica pero no lo controlas tú (ej. Cloud Run) |
| **No** | Punto único de fallo sin respaldo |

**Para el informe:** puedes contar **Sí + Parcial** como A (explica el criterio) o solo **Sí** (más estricto).

## Paso 3 — Dónde mirar en Hospy (GCP)

| Componente | Dónde verificar |
|------------|-----------------|
| **Frontend** `hospy.pages.dev` | Cloudflare Pages → CDN global = redundante |
| **API** Cloud Run | GCP Console → Cloud Run → hospy-api → Scaling (min instances, max) |
| **Base de datos** Supabase | Panel Supabase → Settings → Infrastructure / backups |
| **Caché** | Variables en Cloud Run; si no hay Redis dedicado → No o Parcial |
| **Almacenamiento imágenes** | Cloudinary → CDN del proveedor = Sí |
| **DNS / TLS** | Cloudflare / GCP = Sí (infra del proveedor) |

## Paso 4 — Calcular

```
X = A / B
```

Ejemplo: 4 redundantes de 6 componentes → **66,7 %**

## Paso 5 — Evidencia

- Capturas: ver `evidence-checklist-rft2.txt`
- Tabla completada: `redundancy-components.csv`
- Resultados y cálculo: `RFt-2-results.md`

## Resultado Hospy (2026-07-08)

| Componente | Redundancia |
|------------|-------------|
| Cloudflare Pages | Sí |
| Cloud Run | Parcial (max 3, scale-to-zero) |
| Supabase | Parcial |
| Caché | **No** (sin Redis en Cloud Run) |
| Cloudinary | Sí |
| GCP Uptime | Sí |

**RFt-2-S = 5/6 = 83,3 %** (criterio Sí + Parcial)

## Redacción para informe

> Se identificaron 6 componentes críticos. De ellos, 5 cuentan con redundancia o alta disponibilidad provista por la infraestructura (CDN, réplicas Cloud Run, servicios gestionados). RFt-2-S = 5/6 ≈ 83,3 %.
