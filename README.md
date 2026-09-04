# DataCraft Reportes

PWA mobile-first para registrar novedades de infraestructura con evidencia fotográfica y gestionar su ciclo de atención.

## Requisitos

- Docker Desktop 24+ con Docker Compose
- O Node.js 20+ y PostgreSQL 16+ para desarrollo local

## Inicio rápido con Docker (recomendado)

En Windows instala Docker Desktop. En macOS instala Docker Desktop. En Linux instala Docker Engine y el plugin `docker compose`.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Abre:

- Aplicación: http://localhost:8080
- API y health check: http://localhost:3000/api/health
- Swagger: http://localhost:3000/api/docs

En Windows PowerShell, el primer comando equivalente es:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Para apagar los servicios sin borrar los datos:

```bash
docker compose down
```

Para borrar también la base de datos y las fotografías persistidas:

```bash
docker compose down -v
```

Usa este último comando únicamente si quieres empezar desde cero.

Credenciales demo del panel:

```text
Correo: admin@datacraft.local
Contraseña: DataCraft2026!
```

> Cambia las variables `JWT_*` y la contraseña demo antes de cualquier uso real.

## Desarrollo local sin contenedor de aplicación

Esta opción sigue usando PostgreSQL. Puedes arrancar solo PostgreSQL con Docker:

```bash
cp .env.example .env
docker compose up -d postgres
```

Como el backend correrá directamente en tu PC, cambia en `.env` el host de `postgres` a `localhost`:

```text
DATABASE_URL=postgresql://datacraft:datacraft_dev@localhost:5432/datacraft_reportes?schema=public
```

Si tienes PostgreSQL instalado directamente, crea antes una base llamada `datacraft_reportes` y asegúrate de que el usuario y contraseña coincidan.

En una terminal, levanta el backend:

```bash
cd datacraft-reportes/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

En otra terminal, levanta el frontend:

```bash
cd datacraft-reportes/frontend
npm install
npm run dev
```

Abre http://localhost:5173. El frontend usa `VITE_API_URL` (por defecto `http://localhost:3000/api`).

Si modificas el esquema Prisma durante el desarrollo, usa:

```bash
cd backend
npx prisma migrate dev --name nombre_del_cambio
```

## Verificación rápida

```bash
curl http://localhost:3000/api/health
```

Debe responder con `{"status":"ok","service":"datacraft-reportes"}`. En PowerShell puedes usar:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Prueba el panel con `http://localhost:8080` (Docker) o `http://localhost:5173` (desarrollo local).

## Arquitectura

- `frontend/`: React + TypeScript + Vite, React Router, TanStack Query, React Hook Form, Zod y PWA.
- `backend/`: NestJS + Prisma + PostgreSQL, JWT con refresh tokens, validación y almacenamiento de imágenes desacoplado.
- `storage/`: volumen local de evidencias; `StorageService` permite reemplazarlo por S3/R2/MinIO.
- `docs/`: decisiones y avance de implementación.

Las imágenes no se guardan como Base64: solo sus metadatos viven en PostgreSQL y el archivo se conserva en el volumen de almacenamiento.

## API principal

- `GET /api/locations/public`
- `POST /api/reports` (multipart: `images`, `reporterName`, `locationId`, `areaId`, `placeId`, `description`, `priority`)
- `GET /api/reports/code/:code`
- `POST /api/auth/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/reports`
- `GET /api/admin/reports/:id`
- `PATCH /api/admin/reports/:id/status`
- `POST /api/admin/reports/:id/comments`

## Producción

Genera builds con `npm run build` dentro de `backend/` y `frontend/`. Para publicar, cambia secretos, CORS, credenciales de base de datos y el backend de almacenamiento.

## Alcance V1.0

Incluye creación pública de reportes, 1–3 imágenes, consulta por código, autenticación de administración, dashboard, filtros, historial, comentarios, auditoría, PWA, Docker y seeds. No incluye notificaciones, IA, WhatsApp, técnicos, inventario ni aplicaciones nativas.
