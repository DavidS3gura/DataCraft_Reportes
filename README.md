# Datacraft Reportes - Guía de despliegue en servidor

## Estado actual del servidor (62.171.181.18)

| Servicio | Dominio | Puerto/Tecnología |
|---|---|---|
| Moodle | https://www.ineansastem.com | Nginx 80/443 |
| Sitio aprendizaje autónomo móvil | https://aprendizaje-autonomo-movil.ineansastem.com | Nginx 80/443 |
| Backend Datacraft | `http://127.0.0.1:3000` | Docker, network_mode host |
| Frontend Datacraft `dist` | Pendiente de desplegar | `/root/deploy/datacraft/dist` |

## Credenciales de admin

- **Correo:** `admin@ineansastem.com`
- **Contraseña:** `Admin2026!`

## Cómo se levantó el backend

Ejecutar el script (Actualmente ya se ejecuto):

```bash
cd /root/deploy/datacraft
bash deploy-backend.sh
```


Esto hace:

1. Crea `.env` con `DATABASE_URL`.
2. Crea `create-admin.js` y `docker-compose.backend.yml`.
3. Genera el `dist` del frontend en `/root/deploy/datacraft/dist`.
4. Levanta solo el backend contra el PostgreSQL del sistema.

## Verificar que el backend funciona

```bash
curl -I http://127.0.0.1:3000/api/health
```

Debe devolver `HTTP/1.1 200 OK`.

## Cómo desplegar el frontend

El `dist` ya está compilado con `VITE_API_URL=/api`. El admin debe:

1. Elegir un dominio, por ejemplo `https://www.reportes.ineansastem.com`.
2. Crear el registro DNS **A** apuntando a `62.171.181.18`.
3. Copiar el `dist` al servidor web:

```bash
mkdir -p /var/www/reportes.ineansastem.com
cp -r /root/deploy/datacraft/dist/* /var/www/reportes.ineansastem.com/
```

4. Agregar un sitio en nginx, por ejemplo `/etc/nginx/sites-available/reportes.ineansastem.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name reportes.ineansastem.com www.reportes.ineansastem.com;

    location / {
        root /var/www/reportes.ineansastem.com;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

5. Habilitarlo y recargar nginx:

```bash
ln -sf /etc/nginx/sites-available/reportes.ineansastem.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

6. Sacar certificado SSL:

```bash
certbot --nginx -d reportes.ineansastem.com -d www.reportes.ineansastem.com
```

7. Editar el `FRONTEND_URL` del backend:

```bash
nano /root/deploy/datacraft/.env
```

Cambiar `FRONTEND_URL` por el dominio real del frontend, ejemplo:

```text
FRONTEND_URL=https://www.reportes.ineansastem.com
```

8. Reiniciar el backend:

```bash
cd /root/deploy/datacraft
docker compose -f docker-compose.backend.yml restart backend
```

## Comandos útiles

Reiniciar backend:

```bash
cd /root/deploy/datacraft
docker compose -f docker-compose.backend.yml restart backend
```

Ver logs:

```bash
docker logs datacraft-reportes-backend --tail 40
```

Ver estado de contenedores:

```bash
docker compose -f docker-compose.backend.yml ps
```

Regenerar `dist` y reiniciar backend:

```bash
cd /root/deploy/datacraft
bash deploy-backend.sh
```

## Importante

- **No tocar** los puertos `80` y `443` ni la configuración de Moodle y aprendizaje.
- El backend escucha en `3000`.
- El `dist` usa rutas relativas `/api`, así que el proxy de `/api` al backend es obligatorio.
- El PostgreSQL de datacraft está en el servicio del sistema, no en Docker.
