# RFt-3-S — Resultados (notificación de fallos)

**Fecha de verificación:** 2026-07-08  
**Periodo de observación:** 2026-07-01 — 2026-07-07 (mismo que disponibilidad)  
**Fórmula:** X = Σ(Aᵢ − Bᵢ) / n

## Configuración verificada

| Ítem | Valor |
|------|--------|
| Política de alertas | **Alerta de Uptime - Hospy Pages.** (habilitada) |
| Condición | Uptime Health Check on Monitoreo de Hospy Pages |
| Métrica | `check_passed` — host `hospy.pages.dev` |
| Proyecto GCP | `hospy-api-jquis` |
| Uptime check ID | `monitoreo-de-hospy-pages-JF1kMNGsb5A` |
| Canal de notificación | Email (configurado en la política) |

## Incidentes (n)

| Campo | Valor |
|-------|--------|
| **n** | **0** |
| Motivo | Uptime ~99,99 %; gráfico *Passed checks* sin transiciones a fallo en el periodo |
| Archivo de registro | `fault-notification-log.csv` (sin filas de incidente) |

## Cálculo

Con **n = 0** no aplica la división numérica:

```
X = Σ(Aᵢ − Bᵢ) / n  →  no calculable en el periodo
```

**Interpretación para el informe:** no hubo fallos detectados; se documenta el **mecanismo de notificación configurado** y operativo para futuros incidentes.

## Evidencia

| Archivo | Descripción |
|---------|-------------|
| `evidence/08-gcp-alert-policy.png` | Detalle de la política en GCP Monitoring |
| `evidence/09-gcp-uptime-check-no-failures.png` | *(opcional)* Uptime check sin fallos en el periodo |

## Nota técnica (umbral de alerta)

Umbral corregido a **por debajo de 1** sobre `check_passed`: la alerta se dispara cuando el check falla (valor 0).

## Redacción para informe (Tabla 17)

> Se configuró en Google Cloud Monitoring la política de alertas «Alerta de Uptime - Hospy Pages.», vinculada al uptime check de `https://hospy.pages.dev/` con notificación por correo electrónico. En el periodo del 1 al 7 de julio de 2026 no se registraron fallos del check (**n = 0**), por lo que no fue posible calcular un tiempo medio entre detección y notificación (RFt-3-S). El mecanismo de alerta quedó documentado y habilitado para futuros incidentes.

## Resumen Tabla 17 (tolerancia a fallos)

| Métrica | Resultado | Estado |
|---------|-----------|--------|
| RFt-1-G Evitación de fallos | 22/22 (100 %) | Hecho |
| RFt-2-S Redundancia | 5/6 (83,3 %) | Hecho |
| RFt-3-S Notificación | n = 0; mecanismo configurado | Hecho |
