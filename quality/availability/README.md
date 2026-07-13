# Disponibilidad (Tabla 16 — ISO/IEC 25024)

Plantillas para **RAv-1-G** (disponibilidad del sistema) y **RAv-2-G** (tiempo medio de indisponibilidad).

## Archivos

| Archivo | Uso |
|---------|-----|
| `RAv-report-template.md` | Texto listo para copiar al informe / tesis |
| `measurements.csv` | Registro numérico periodo a periodo |
| `evidence-checklist.txt` | Capturas y evidencias a adjuntar |

## Fuentes de datos (Hospy en GCP)

| Componente | Herramienta | URL / recurso |
|------------|-------------|----------------|
| Frontend | Cloud Monitoring Uptime check | `https://hospy.pages.dev/` |
| API (opcional) | Uptime check adicional | `https://hospy-api-wm7v5futiq-rj.a.run.app/health/` |

## Cómo completar

1. En GCP → **Monitoring → Uptime checks** → abre tu check.
2. Periodo: ej. **Última semana**.
3. Anota **Percent Uptime** → RAv-1-G.
4. Revisa **Passed checks** (fallos a 0) → calcula RAv-2-G.
5. Rellena `measurements.csv` y `RAv-report-template.md`.
6. Guarda capturas en `evidence/` según `evidence-checklist.txt`.

## Fórmulas

- **RAv-1-G:** X = A / B — A = tiempo operativo, B = tiempo programado (o usar **Uptime %** directo).
- **RAv-2-G:** X = A / B — A = tiempo total caído, B = número de caídas.
