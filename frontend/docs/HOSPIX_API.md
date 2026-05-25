# API Hospix

El asistente usa **backend híbrido** por defecto (`POST /api/v1/hospix/chat/`). Si el servidor no responde, el frontend vuelve al motor local (`hospixEngine.ts`).

## Endpoint

```
POST /api/v1/hospix/chat/
Authorization: Bearer <JWT> (opcional; si hay token, Hospix ve reservas reales del usuario)
Content-Type: application/json
```

### Bienvenida

```json
{ "welcome": true, "pathname": "/" }
```

### Mensaje del usuario

```json
{
  "message": "Hospedaje en Cusco",
  "pathname": "/",
  "session_id": "uuid-opcional",
  "history": [
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "¿En qué te ayudo?" }
  ]
}
```

### Acción de botón (flujo)

```json
{
  "action_id": "search",
  "action_target": "search_stay",
  "pathname": "/"
}
```

### Response

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "replies": [
    {
      "role": "hospix",
      "markdown": "Opciones **reales** en Hospy para **Cusco**:",
      "cards": [
        {
          "id": "1",
          "name": "Hostal Ejemplo",
          "location": "Cusco, Cusco",
          "price": "S/ 120 / noche",
          "link": "/hospedajes/1"
        }
      ],
      "actions": [],
      "chips": []
    }
  ],
  "flow_state": {
    "flow_id": null,
    "flow_step": 0,
    "flow_data": { "city": "Cusco" }
  },
  "source": "rules"
}
```

| Campo | Descripción |
|-------|-------------|
| `source` | `rules` (motor + BD) o `llm` (OpenAI u compatible) |
| `flow_state` | Estado de flujo en caché servidor (30 min) |

## Capas de inteligencia

1. **Datos reales**: hospedajes aprobados, reservas del huésped, pendientes del propietario.
2. **Reglas + NLP ligero**: intenciones (buscar, reservas, FAQ, panel).
3. **LLM (Gemini u OpenAI)**: respuestas naturales en JSON con datos reales inyectados en el prompt.

Variables en `.env` (raíz del proyecto):

```env
HOSPIX_LLM_ENABLED=true
HOSPIX_LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
```

La respuesta incluye `"source": "gemini"` o `"rules"` si no hay IA o falla la API.

## Frontend

- Por defecto llama al API.
- Solo motor local: `VITE_HOSPIX_USE_LOCAL=true` en `frontend/.env`.
