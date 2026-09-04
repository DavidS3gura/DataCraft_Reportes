# Progreso DataCraft Reportes

## Fase actual

Fase 8 — verificación y empaquetado.

## Implementado

- Monorepo independiente con frontend, backend, Prisma, Docker y documentación.
- PWA instalable con manifest, iconos y service worker.
- Creación pública de reportes con 1–3 imágenes, validación y código `INC-AAAA-NNNNNN`.
- Consulta pública por código.
- Panel admin con login JWT, refresh token, dashboard, filtros y detalle.
- Cambios de estado, rechazo con motivo, resolución, comentarios, historial y auditoría.
- Persistencia PostgreSQL e imágenes mediante volumen Docker.
- Seed de administrador, ubicaciones y reportes demo.
- Health checks, Helmet, CORS, rate limiting, MIME/size validation y DTOs.

## Pendiente

- Configurar proveedor S3/R2/MinIO para producción.
- Pruebas E2E con una instancia PostgreSQL de CI.
- Gestión de ubicaciones desde interfaz.

## Errores conocidos

- La previsualización local de imágenes se degrada en dispositivos con poca memoria, aunque el archivo original optimizado se conserva durante el envío.
- La generación de iconos usa SVG inline; para stores nativos se deberán añadir assets PNG exportados.

## Decisiones técnicas

- Se usa una secuencia PostgreSQL para garantizar códigos legibles sin duplicados bajo concurrencia.
- Se usa `local` como almacenamiento inicial detrás de la interfaz `StorageService`.
- El frontend queda preparado para Capacitor, pero esta entrega no genera binarios nativos.