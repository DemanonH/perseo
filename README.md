# Perseo

**Tu base de datos de leads, en automático.**

Capturá, organizá y convertí cada consulta de WhatsApp en ventas — con IA que califica leads mientras vos dormís.

---

## 🚀 Inicio rápido — 3 pasos

### Requisito único: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```
1. Instalá Docker Desktop
2. Abrí la carpeta del proyecto
3. Doble click en start.bat (Windows) o ./start.sh (Mac/Linux)
```

**Listo.** Perseo abre automáticamente en `http://localhost:3000`

**Cuenta demo disponible de inmediato:**
- Email: `demo@perseo.app`
- Password: `demo1234`

---

## 📂 Estructura del proyecto

```
perseo/
├── start.bat           ← Inicio con doble click (Windows)
├── start.sh            ← Inicio en Mac/Linux
├── stop.bat            ← Detener todos los servicios
├── docker-compose.yml  ← Configuración de todos los servicios
├── .env.local          ← Variables de entorno para desarrollo local
├── .env.example        ← Plantilla para producción
│
├── backend/            ← API Node.js + Express
├── frontend/           ← Next.js 14 + Tailwind CSS
├── nginx/              ← Reverse proxy
└── postgres/           ← Schema de la base de datos
```

---

## 🌐 URLs locales

| Servicio | URL | Descripción |
|---|---|---|
| **App completa** | http://localhost:3000 | Frontend + API via Nginx |
| **Health Check** | http://localhost:3000/health | Estado de todos los servicios |
| **API directa** | http://localhost:3000/api | Backend API |
| **Evolution API** | http://localhost:8080 | WhatsApp API |
| **PostgreSQL** | localhost:5432 | Base de datos (user: perseo / pass: perseo123) |

---

## 📱 Cómo conectar WhatsApp

1. Ingresá a Perseo y andá a **WhatsApp** en el menú
2. Hacé click en **"Generar código QR"**
3. Abrí WhatsApp en tu celular
4. Andá a **Ajustes → Dispositivos vinculados → Vincular dispositivo**
5. Escaneá el QR

✅ Una vez conectado, Perseo captura automáticamente todos los mensajes entrantes.

**Nota:** En modo local el QR puede expirar en ~60 segundos. Si expira, hacé click en "Generar código QR" de nuevo.

---

## 📊 Cómo conectar Google Sheets

### Paso 1 — Crear credenciales en Google Cloud

1. Andá a [console.cloud.google.com](https://console.cloud.google.com)
2. Creá un proyecto nuevo (ej: "Perseo")
3. **APIs → Biblioteca** → Buscá "Google Sheets API" → Habilitarla
4. **APIs → Credenciales** → Crear credenciales → **ID de cliente OAuth 2.0**
5. Tipo: **Aplicación web**
6. Orígenes autorizados: `http://localhost:3000`
7. URIs de redireccionamiento: `http://localhost:3000/api/sheets/callback`
8. Copiá el **Client ID** y **Client Secret**

### Paso 2 — Configurar .env

Editá el archivo `.env` en la raíz del proyecto:

```env
GOOGLE_CLIENT_ID=tu-client-id-aquí
GOOGLE_CLIENT_SECRET=tu-client-secret-aquí
GOOGLE_REDIRECT_URI=http://localhost:3000/api/sheets/callback
```

Reiniciá el backend:
```bash
docker compose restart backend
```

### Paso 3 — Conectar desde la app

1. Andá a **Google Sheets** en el menú
2. Pegá tu **Spreadsheet ID** (lo encontrás en la URL de tu Sheet)
3. Hacé click en **"Autorizar con Google"**
4. Autorizá los permisos
5. ¡Listo! Los leads se guardarán automáticamente

---

## 🤖 Cómo activar el Scoring IA

El scoring analiza las conversaciones con GPT-4o y clasifica cada lead como **Caliente**, **Tibio** o **Frío**.

1. Andá a **Ajustes** en el menú
2. Pegá tu **API Key de OpenAI** (obtenela en platform.openai.com/api-keys)
3. El scoring corre automáticamente **todos los días a las 8:00 AM**

Para ejecutar el scoring manualmente:
```bash
docker compose exec backend node -e "
  require('./src/workers/dailyScoringJob').runDailyScoring().then(() => process.exit(0))
"
```

---

## 🎭 Modo Demo

Al primer inicio, Perseo carga automáticamente:

- ✅ 1 usuario demo (`demo@perseo.app` / `demo1234`)
- ✅ 3 campañas (Mesas, Sillas, Cortinas) con colores y keywords
- ✅ 25 leads con conversaciones reales
- ✅ Scoring IA aplicado (Caliente / Tibio / Frío)
- ✅ Leads convertidos
- ✅ Métricas en el dashboard

**Para resetear los datos demo:**
```bash
# Esto borra todo y recarga desde cero
docker compose down -v
start.bat
```

---

## 💻 Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f evolution

# Reiniciar un servicio (ej: después de cambios en .env)
docker compose restart backend

# Entrar a la base de datos
docker compose exec postgres psql -U perseo -d perseo

# Ver tablas
docker compose exec postgres psql -U perseo -d perseo -c "\dt"

# Detener todo
docker compose down

# Detener y borrar datos (⚠ irreversible)
docker compose down -v

# Reconstruir imágenes (después de cambios en el código)
docker compose up -d --build backend frontend
```

---

## 🔧 Troubleshooting

### "Docker Desktop no está corriendo"
Abrí Docker Desktop desde el menú inicio y esperá a que el ícono de la ballena sea estable (sin animación).

### "El QR de WhatsApp no aparece"
- Verificá que el contenedor `perseo_evolution` esté corriendo: `docker compose ps`
- Revisá los logs: `docker compose logs evolution`
- Asegurate de tener la variable `EVOLUTION_API_KEY` en tu `.env`

### "No puedo conectar Google Sheets"
- Verificá que configuraste `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`
- Asegurate de haber agregado el URI de redirección exacto en Google Cloud Console
- Reiniciá el backend: `docker compose restart backend`

### "Los leads no aparecen en el dashboard"
- Verificá que WhatsApp esté conectado (estado verde en la página de WhatsApp)
- Verificá que tengas keywords configuradas en alguna campaña
- Chequeá los logs: `docker compose logs -f backend`

### "Los servicios no inician / Error en Docker"
```bash
# Ver estado de todos los contenedores
docker compose ps

# Ver logs detallados de errores
docker compose logs

# Forzar reconstrucción
docker compose down
docker compose up -d --build
```

### "Puerto 3000 en uso"
Otro proceso está usando el puerto. Encontralo y cerralo:
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### Borrar y empezar de cero
```bash
docker compose down -v          # borra contenedores y datos
docker system prune -f          # limpia imágenes no usadas
start.bat                       # reinicia todo
```

---

## 🚀 Deploy en producción (VPS Ubuntu)

### Requisitos
- Ubuntu 22.04 LTS
- Docker + Docker Compose v2
- Dominio apuntando al servidor

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/TU_USUARIO/perseo.git
cd perseo

# 2. Configurar variables de producción
cp .env.example .env
nano .env  # Completar TODOS los valores, especialmente:
           # JWT_SECRET, GOOGLE_CLIENT_ID/SECRET, STRIPE keys

# 3. Cambiar SEED_DEMO=false para no cargar datos demo

# 4. Levantar servicios
docker compose up -d --build

# 5. Configurar SSL con Certbot
sudo apt install certbot -y
sudo certbot certonly --standalone -d tudominio.com
# Actualizar nginx.conf para HTTPS y reiniciar:
docker compose restart nginx
```

### Variables importantes para producción

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Mínimo 32 caracteres aleatorios |
| `POSTGRES_PASSWORD` | Contraseña segura de DB |
| `EVOLUTION_API_KEY` | String seguro para Evolution |
| `GOOGLE_CLIENT_ID/SECRET` | Credenciales OAuth de Google |
| `STRIPE_SECRET_KEY` | Clave de producción de Stripe |
| `SEED_DEMO` | Cambiar a `false` |

---

## 📋 Resumen de endpoints API

```
POST /api/auth/register          Crear cuenta
POST /api/auth/login             Iniciar sesión

POST /api/whatsapp/connect       Conectar WhatsApp (genera QR)
GET  /api/whatsapp/status        Estado de conexión
POST /api/whatsapp/disconnect    Desconectar

GET  /api/campaigns              Listar campañas
POST /api/campaigns              Crear campaña
PUT  /api/campaigns/:id          Actualizar campaña
GET  /api/campaigns/:id/leads    Leads de una campaña

GET  /api/leads                  Listar leads (con filtros)
GET  /api/leads/metrics          Métricas del dashboard
POST /api/leads/:id/convert      Marcar como convertido

GET  /api/sheets/auth-url        URL OAuth de Google
GET  /api/sheets/callback        Callback OAuth (automático)
POST /api/sheets/connect         Guardar Spreadsheet ID
POST /api/sheets/test            Enviar fila de prueba

GET  /api/billing/plans          Planes disponibles
POST /api/billing/checkout       Crear sesión de pago Stripe
POST /api/billing/portal         Portal de facturación Stripe

GET  /api/health                 Health básico
GET  /api/health/full            Health completo de todos los servicios
GET  /api/health/stats           Estadísticas de la DB

POST /api/webhook/evolution      Webhook de Evolution API (automático)
```

---

## 🏗 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | Next.js 14 + Tailwind CSS |
| WhatsApp | Evolution API |
| Google Sheets | Google Sheets API v4 |
| IA Scoring | OpenAI GPT-4o mini |
| Pagos | Stripe Checkout + Customer Portal |
| Infraestructura | Docker Compose + Nginx |

---

## 📄 Licencia

MIT — Podés usar, modificar y distribuir libremente.
