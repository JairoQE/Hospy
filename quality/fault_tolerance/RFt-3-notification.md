# RFt-3-S — Tiempo medio de notificación de fallos

**Fórmula:** X = Σ(Aᵢ − Bᵢ) / n  
- **Bᵢ** = momento en que se **detecta** el fallo  
- **Aᵢ** = momento en que el sistema **notifica** (alerta email/Slack)  
- **n** = número de fallos en el periodo  

Valores **cercanos a 0** son mejores (notificación rápida).

---

## Paso 1 — Configurar notificación (si aún no lo hiciste)

1. **GCP Console** → **Monitoring** → **Alerting** → **Create policy**
2. Condición: **Uptime check health** → selecciona `monitoreo-de-hospy-pages` (o tu check de API)
3. Threshold: check failed / uptime < 100% durante X minutos
4. **Notification channel:** tu email (o Slack)
5. Guardar política

Sin alerta configurada **no puedes medir RFt-3-S** en producción (solo detección, no notificación).

---

## Paso 2 — Periodo de observación

Usa el **mismo periodo** que disponibilidad (ej. última semana).

---

## Paso 3 — Registrar incidentes

Por cada fallo del uptime check, anota en `fault-notification-log.csv`:

| Campo | Dónde sacarlo |
|-------|----------------|
| **Bᵢ (detección)** | Monitoring → Uptime check → gráfico Failed checks (primer probe en 0) |
| **Aᵢ (notificación)** | Hora del email/alerta de GCP |
| **Diferencia** | Aᵢ − Bᵢ en segundos o minutos |

---

## Paso 4 — Calcular X

```
X = (suma de diferencias) / n
```

### Si no hubo fallos (tu caso: Passed checks = 1, uptime 99,99 %)

Opciones honestas para el informe:

**A)** **n = 0** → reportar: *«No hubo fallos detectados; RFt-3-S no aplicable en el periodo. Se documenta el mecanismo de alerta configurado.»*

**B)** Si el 0,01 % implica ~1 min caído: **n = 1**, estimar Bᵢ y Aᵢ del incidente (si recibiste alerta).

**C)** **Prueba controlada** (opcional): detener deploy 2–3 min, medir tiempo hasta alerta → un incidente artificial documentado.

---

## Paso 5 — Evidencia

- Captura de la **política de alertas** en GCP  
- Captura de un **email de alerta** (si hubo)  
- `fault-notification-log.csv` completado  

---

## Ejemplo de redacción

> Se configuró una política de alertas en Google Cloud Monitoring vinculada al uptime check de `hospy.pages.dev`. En el periodo del [fecha], se detectaron n incidentes. El tiempo medio entre detección y notificación (RFt-3-S) fue de X [segundos/minutos]. / No se registraron incidentes; el mecanismo de notificación quedó operativo para futuros fallos.

---

## Resultado Hospy (2026-07-08)

| Ítem | Valor |
|------|--------|
| Política | Alerta de Uptime - Hospy Pages. (habilitada) |
| Periodo | 2026-07-01 — 2026-07-07 |
| **n** | **0** |
| **RFt-3-S** | No numérico en el periodo; mecanismo configurado (umbral por debajo de 1) |

- Resultados: `RFt-3-results.md`
- Registro: `fault-notification-log.csv`
- Evidencia: `evidence/08-gcp-alert-policy.png`
