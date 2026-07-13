# Informe de disponibilidad — Hospy

**Norma:** ISO/IEC 25024 — Tabla 16 (Availability measures)  
**Periodo de observación:** [FECHA_INICIO] — [FECHA_FIN]  
**Horario programado (B):** [ ] 24/7  [ ] Otro: _______________

---

## 1. Alcance

| Ítem | Valor |
|------|--------|
| Sistema | Hospy |
| Componente medido | [ ] Frontend (`hospy.pages.dev`)  [ ] API (`/health/`)  [ ] Ambos |
| Herramienta | Google Cloud Monitoring — Uptime checks |
| ID del check | [ej. monitoreo-de-hospy-pages-JF1kMNGsb5A] |
| Frecuencia del probe | [ej. 60 s] |
| Regiones | [ej. Virginia, Oregon, Iowa, Bélgica, Singapur, São Paulo] |

---

## 2. RAv-1-G — System availability

**Definición:** ¿Qué proporción del tiempo programado el sistema estuvo disponible?

**Fórmula:** X = A / B

| Variable | Descripción | Valor |
|----------|-------------|-------|
| **B** | Tiempo de operación especificado | [ej. 168 h (7 días)] |
| **A** | Tiempo en que el sistema estuvo disponible | [ej. 167,98 h] |
| **X (RAv-1-G)** | A / B o **Percent Uptime** del dashboard | **[ej. 99,99 %]** |

### Resultado directo (GCP)

- **Percent Uptime (dashboard):** _____________ %
- **Uptime check latency (media):** _____________ ms

### Redacción sugerida

> Durante el periodo [FECHA_INICIO]—[FECHA_FIN], se monitoreó [URL] mediante un Uptime check de Google Cloud Monitoring con verificaciones cada [N] segundos desde [N] regiones. La disponibilidad del sistema (RAv-1-G) fue del **[X %]**, coherente con un tiempo de operación efectivo de **[A]** sobre un tiempo programado de **[B]**.

---

## 3. RAv-2-G — Mean down time

**Definición:** ¿Cuánto tiempo permanece indisponible el sistema cuando ocurre una falla?

**Fórmula:** X = A / B

| Variable | Descripción | Valor |
|----------|-------------|-------|
| **A** | Tiempo total de indisponibilidad en el periodo | [ej. 0 min / 1 min] |
| **B** | Número de caídas (incidentes) observados | [ej. 0 / 1] |
| **X (RAv-2-G)** | A / B (tiempo medio por caída) | **[ej. 0 min / 1 min]** |

### Registro de incidentes (si B > 0)

| # | Inicio (UTC) | Fin (UTC) | Duración | Checks fallidos × intervalo |
|---|--------------|-----------|----------|---------------------------|
| 1 | | | | |
| 2 | | | | |

### Si no hubo caídas (Passed checks = 1 todo el periodo)

> En el periodo observado, el gráfico *Passed checks* se mantuvo en 1 sin transiciones a 0. Por tanto **A = 0**, **B = 0** (o B = 1 si el uptime 99,99 % implica ~1 min residual), y el **tiempo medio de indisponibilidad (RAv-2-G)** es **[0 min / ~1 min por incidente]**.

### Redacción sugerida

> El tiempo medio de indisponibilidad (RAv-2-G) en el mismo periodo fue de **[X]** [minutos/segundos] por incidente, con **[B]** caída(s) registrada(s) y **[A]** de tiempo total no disponible.

---

## 4. Observaciones complementarias

- Picos de latencia sin fallo del check: [ej. 2 s el 01/07 en usa-oregon — no cuenta como downtime]
- Cold starts Cloud Run / Pages: [Sí/No observado]
- Limitaciones del método: [ej. solo frontend; API medida por separado]

---

## 5. Evidencias adjuntas

- [ ] Captura Percent Uptime
- [ ] Gráfico Passed checks
- [ ] Gráfico Uptime check latency
- [ ] Pantalla de configuración del check (host, path, frecuencia)

**Elaborado por:** _______________  
**Fecha:** _______________
