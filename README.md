# Hospy

Plataforma web para buscar y reservar **hoteles, hostales y hospedajes verificados en Perú**. Incluye panel de huésped, panel de propietario, moderación/administración, mensajería, reseñas y datos de ubicación (UBIGEO).

## Requisitos

| Herramienta | Versión recomendada |
|-------------|---------------------|
| **Python**  | 3.12+ |
| **Node.js** | 20+ (LTS) |
| **npm**     | 10+ |
| **Git**     | Cualquier versión reciente |

Opcional (modo completo con PostgreSQL y tareas en segundo plano):

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para `docker compose`)

## Estructura del proyecto

```
Hospy/
├── config/          # Django (settings, URLs, Celery)
├── accounts/        # Usuarios y autenticación JWT
├── properties/      # Hospedajes, UBIGEO, ofertas
├── rooms/           # Habitaciones y tarifas
├── bookings/        # Reservas
├── messaging/       # Chat / consultas
├── reviews/         # Reseñas
├── notifications/   # Notificaciones
├── frontend/        # React + Vite + TypeScript
├── manage.py
├── requirements.txt
└── docker-compose.yml
```

## Inicio rápido (desarrollo local)

La forma más simple usa **SQLite** y no requiere Docker ni Redis.

### 1. Clonar el repositorio

```bash
git clone https://github.com/JairoQE/Hospy.git
cd Hospy
```

### 2. Variables de entorno (backend)

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

El archivo `.env.example` ya trae `USE_SQLITE=true`, ideal para empezar. No subas tu archivo `.env` a GitHub (ya está en `.gitignore`).

### 3. Backend (Django)

```bash
# Crear y activar entorno virtual
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Dependencias
pip install -r requirements.txt

# Base de datos y datos iniciales
python manage.py migrate
python manage.py seed_demo
```

#### Usuario administrador (panel `/admin` en el frontend)

Crea un superusuario y asígnale el rol **administrador**:

```bash
python manage.py createsuperuser --email admin@hospy.local
```

Luego, en la consola de Django:

```bash
python manage.py shell
```

```python
from accounts.models import User
u = User.objects.get(email="admin@hospy.local")
u.role = User.Role.ADMINISTRADOR
u.save()
exit()
```

Inicia el servidor API:

```bash
python manage.py runserver
```

La API quedará en **http://127.0.0.1:8000/**  
Documentación interactiva: **http://127.0.0.1:8000/api/docs/**

### 4. Frontend (React)

Abre **otra terminal** en la carpeta del proyecto:

```bash
cd frontend
npm install
npm run dev
```

La aplicación web quedará en **http://localhost:5173/**  
Vite envía las peticiones `/api` al backend en el puerto 8000 automáticamente.

### 5. Cuentas de demostración (`seed_demo`)

| Rol            | Correo                      | Contraseña        |
|----------------|-----------------------------|-------------------|
| Huésped        | `huesped@hospy.local`       | `Huesped123!`     |
| Propietario    | `propietario@hospy.local`   | `Propietario123!` |
| Administrador  | (el que creaste arriba)     | (la que definiste)|

## Modo completo con Docker (PostgreSQL + Redis + Celery)

Si quieres el entorno más parecido a producción:

1. En `.env` pon `USE_SQLITE=false` y revisa credenciales de PostgreSQL/Redis (como en `.env.example`).
2. Levanta servicios:

```bash
docker compose up -d db redis
```

3. Migra y carga datos:

```bash
python manage.py migrate
python manage.py seed_demo
```

4. En terminales separadas (con el venv activado):

```bash
python manage.py runserver
celery -A config worker -l info
celery -A config beat -l info
```

5. Frontend: `cd frontend && npm run dev`

O todo el stack con Docker:

```bash
docker compose up --build
```

(El frontend sigue ejecutándose con `npm run dev` en local salvo que configures otro despliegue.)

## Comandos útiles

```bash
# Pruebas backend
pip install -r requirements-dev.txt
pytest

# Build de producción del frontend
cd frontend
npm run build

# Script de verificación de flujos (SQLite)
python scripts/probar_flujo_local.py
```

## Hospix (asistente virtual)

Botón flotante **Hospix** en casi todas las páginas (excepto login, registro y admin).

**Motor híbrido** (`POST /api/v1/hospix/chat/`):

- Hospedajes **reales** desde la base de datos al buscar por ciudad
- Reservas del huésped y pendientes del propietario si hay sesión JWT
- FAQ y flujos guiados; **IA con Gemini** (gratuito) o OpenAI (ver `.env.example`)
- Si el backend falla, el frontend usa reglas locales como respaldo
- **Los mensajes del chat no se guardan en la base de datos**: solo memoria temporal (caché RAM con TTL ~30 min y `sessionStorage` mínimo para el id de sesión)

```env
HOSPIX_LLM_ENABLED=true
HOSPIX_LLM_PROVIDER=gemini
GEMINI_API_KEY=tu-clave-de-google-ai-studio
GEMINI_MODEL=gemini-2.0-flash
```

Obtén la clave en [Google AI Studio](https://aistudio.google.com/apikey). **No la subas a GitHub**; solo en `.env` local.

Documentación: [`frontend/docs/HOSPIX_API.md`](frontend/docs/HOSPIX_API.md).

## Rutas principales del frontend

| Ruta        | Descripción              |
|-------------|--------------------------|
| `/`         | Inicio y buscador        |
| `/login`    | Iniciar sesión           |
| `/registro` | Registro                 |
| `/panel`    | Panel del propietario    |
| `/admin`    | Panel de administración  |
| `/perfil`   | Perfil de usuario        |

## Solución de problemas

- **`ModuleNotFoundError`**: activa el entorno virtual e instala `pip install -r requirements.txt`.
- **El frontend no carga datos**: confirma que Django corre en `http://127.0.0.1:8000` y que usas `npm run dev` (no solo `npm run preview` sin API).
- **Puerto 5173 ocupado**: Vite puede usar otro puerto; actualiza `CORS_ALLOWED_ORIGINS` en `.env` si cambias el puerto.
- **Migraciones**: si cambias de SQLite a PostgreSQL, usa una base limpia o vuelve a ejecutar `migrate` sobre la nueva BD.

## Licencia

Proyecto académico / de integración. Ajusta la licencia según tu equipo o institución.
