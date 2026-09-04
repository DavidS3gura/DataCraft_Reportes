# Arquitectura

```text
PWA React/Vite
      │ JSON + multipart
NestJS API ── Prisma ── PostgreSQL
      │
StorageService ── volumen local / futuro S3-R2-MinIO
```

El API mantiene la responsabilidad de validar los archivos y persiste solamente metadatos de evidencia. Los tokens de acceso son JWT de corta duración; el refresh token se almacena hasheado y se rota al utilizarse.