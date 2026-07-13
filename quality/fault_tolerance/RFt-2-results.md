# RFt-2-S — Resultados (redundancia de componentes)

**Fecha de verificación:** 2026-07-08  
**Fórmula:** X = A / B

## Componentes críticos (B = 6)

| ID | Componente | Redundancia | Cuenta en A |
|----|------------|-------------|-------------|
| C-01 | Frontend (Cloudflare Pages) | **Sí** | Sí |
| C-02 | API (Cloud Run) | **Parcial** | Sí |
| C-03 | Base de datos (Supabase) | **Parcial** | Sí |
| C-04 | Caché (LocMem) | **No** | No |
| C-05 | Cloudinary | **Sí** | Sí |
| C-06 | Monitoreo uptime (GCP) | **Sí** | Sí |

## Cálculo

| Criterio | A | B | X |
|----------|---|---|---|
| **Sí + Parcial** (recomendado para informe) | 5 | 6 | **83,3 %** (5/6) |
| Solo **Sí** (estricto) | 3 | 6 | **50,0 %** (3/6) |

**Valor reportado sugerido:** **RFt-2-S = 5/6 ≈ 0,833 (83,3 %)**  
Criterio: se cuenta como redundante todo componente con HA explícita o provista por el proveedor cloud (CDN, autoscaling, servicio gestionado con backups).

## Evidencia verificada (consola / CLI)

### Cloud Run — `hospy-api` (southamerica-east1)

```
autoscaling.knative.dev/maxScale=3
(sin minScale → scale-to-zero)
containerConcurrency=40
URL: https://hospy-api-wm7v5futiq-rj.a.run.app
```

Variables relevantes: `USE_CLOUDINARY=true`, `CELERY_TASK_ALWAYS_EAGER=true`, **sin `REDIS_URL`** → caché LocMem por instancia.

### Supabase

- Host pooler: `aws-0-sa-east-1.pooler.supabase.com`
- Proyecto: `qrxochlpoiuftiwwrosi`
- **Pendiente captura:** panel → Settings → Infrastructure (plan y backups)

### Cloudflare Pages

- URL producción: `https://hospy.pages.dev`
- **Pendiente captura:** proyecto Pages → Deployments / CDN

### GCP Monitoring

- Check ID: `monitoreo-de-hospy-pages-JF1kMNGsb5A`
- Target: `https://hospy.pages.dev/`
- Periodo: 60 s; tipo: `STATIC_IP_CHECKERS`

## Redacción para informe (Tabla 17)

> Se identificaron **6 componentes críticos** sin los cuales Hospy no opera en producción: frontend (Cloudflare Pages), API (Cloud Run), base de datos (Supabase), caché de aplicación, almacenamiento multimedia (Cloudinary) y monitoreo de disponibilidad (GCP). De ellos, **5** disponen de redundancia total o parcial mediante infraestructura gestionada (CDN global, hasta 3 réplicas automáticas en Cloud Run, PostgreSQL gestionado con pooler y backups, CDN de Cloudinary, y probes de uptime multi-región). El caché en memoria local por instancia de Cloud Run **no** es redundante entre réplicas. Por tanto **RFt-2-S = A/B = 5/6 ≈ 83,3 %**.

## Capturas requeridas

Ver `evidence-checklist-rft2.txt`.
