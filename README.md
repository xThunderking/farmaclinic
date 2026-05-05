# farmaclinic

Proyecto fullstack de FarmaClinic con frontend en React (Vite) y backend en Express + MySQL.

## Estructura

- frontend: Aplicacion React con interfaz clinica.
- backend: API REST con persistencia en MySQL.
- deploy: Plantillas de despliegue coexistente (Nginx, systemd, Docker DB).
- BD.mysql.sql: Esquema MySQL actual.
- BD.SQL: Esquema SQLite historico (referencia).

## Requisitos

- Ubuntu 20.04+
- Node.js 18+
- Docker + Docker Compose plugin
- Nginx

## Desarrollo local

1. Frontend:

   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

2. Backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

La API local corre por defecto en http://127.0.0.1:4000.

## Despliegue coexistente (sin tocar 3306 de produccion)

Este perfil deja el sistema productivo intacto en 3306 y levanta FarmaClinic en puertos aislados:

- BD FarmaClinic: 127.0.0.1:3307
- API FarmaClinic: 127.0.0.1:4100
- URL interna: http://10.69.40.7/farmaclinic/

### Archivos incluidos para este perfil

- `backend/.env.internal.example`
- `frontend/.env.production.internal.example`
- `deploy/docker-compose.farmaclinic-db.yml`
- `deploy/systemd/farmaclinic-api.service`
- `deploy/nginx/farmaclinic.conf`

### 1) Preparar variables de entorno

```bash
cp /home/sistemas/farmaclinic/backend/.env.internal.example /home/sistemas/farmaclinic/backend/.env.internal
cp /home/sistemas/farmaclinic/frontend/.env.production.internal.example /home/sistemas/farmaclinic/frontend/.env.production
```

Edita ambos archivos y usa el mismo password de aplicacion en los dos:

- `backend/.env.internal` (DB_PASSWORD)
- `deploy/docker-compose.farmaclinic-db.yml` (MYSQL_PASSWORD)

### 2) Levantar BD dedicada en Docker (3307)

```bash
cd /home/sistemas/farmaclinic
docker compose -f deploy/docker-compose.farmaclinic-db.yml up -d
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

Debe aparecer `farmaclinic-db` en `127.0.0.1:3307->3306/tcp`.

### 3) Cargar esquema MySQL del proyecto

```bash
mysql -h 127.0.0.1 -P 3307 -u farmaclinic_app -p farmaclinic < /home/sistemas/farmaclinic/BD.mysql.sql
```

### 4) Levantar API como servicio (puerto 4100)

```bash
cd /home/sistemas/farmaclinic/backend
npm ci
sudo cp /home/sistemas/farmaclinic/deploy/systemd/farmaclinic-api.service /etc/systemd/system/farmaclinic-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now farmaclinic-api
sudo systemctl status farmaclinic-api --no-pager
```

### 5) Compilar frontend para subruta /farmaclinic/

```bash
cd /home/sistemas/farmaclinic/frontend
npm ci
npm run build
sudo mkdir -p /var/www/farmaclinic
sudo rsync -a --delete dist/ /var/www/farmaclinic/
```

### 6) Configurar Nginx

```bash
sudo cp /home/sistemas/farmaclinic/deploy/nginx/farmaclinic.conf /etc/nginx/sites-available/farmaclinic
sudo ln -sf /etc/nginx/sites-available/farmaclinic /etc/nginx/sites-enabled/farmaclinic
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7) Verificacion final

```bash
curl http://127.0.0.1:4100/api/health
curl http://10.69.40.7/farmaclinic/api/health
```

Abrir en navegador:

- http://10.69.40.7/farmaclinic/

### 8) Arranque automatico tras reinicio

Validar:

```bash
systemctl is-enabled farmaclinic-api nginx
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' farmaclinic-db
```

Esperado:

- `farmaclinic-api`: enabled
- `nginx`: enabled
- `farmaclinic-db`: unless-stopped

## Usuarios semilla

Si la tabla `usuarios` esta vacia, el backend crea:

- CoordinadorFV / FarmaFV (admin)
- Clinico1 / 123 (user)

## Respaldo rapido de MySQL (perfil coexistente)

```bash
mysqldump -h 127.0.0.1 -P 3307 -u farmaclinic_app -p farmaclinic > farmaclinic_backup.sql
```

## Como frenar y redeployar cuando hagas cambios

Esta guia es para el modo coexistente que ya dejaste funcionando, sin tocar el sistema productivo:

- Produccion actual (intocable): `whaticketdb` en `127.0.0.1:3306`
- FarmaClinic DB: `farmaclinic-db` en `127.0.0.1:3307`
- FarmaClinic API: `127.0.0.1:4100`
- FarmaClinic Web: `http://10.69.40.7:8081/farmaclinic/`

### Regla de oro

En redeploy normal NO borres la base de datos de FarmaClinic.

- No ejecutar: `docker rm -f farmaclinic-db`
- No ejecutar: `docker volume rm farmaclinic_db_data`

### Paso 0) Respaldo antes de actualizar

```bash
mkdir -p /home/sistemas/farmaclinic/backups
mysqldump -h 127.0.0.1 -P 3307 -u farmaclinic_app -p farmaclinic > /home/sistemas/farmaclinic/backups/farmaclinic_$(date +%F_%H%M).sql
```

### Paso 1) Frenar servicios de FarmaClinic (sin tocar produccion)

1. Si usas API con systemd:

```bash
sudo systemctl stop farmaclinic-api
```

2. Si la API esta corriendo manual con `npm start`, para ese proceso:

```bash
ss -lntp | grep ':4100'
kill <PID_DE_NODE_4100>
```

3. Frenar solo el frontend de FarmaClinic:

```bash
docker stop farmaclinic-web
```

Nota: la BD `farmaclinic-db` puede quedarse arriba durante el redeploy.

### Paso 2) Bajar cambios y actualizar dependencias

```bash
cd /home/sistemas/farmaclinic
git pull

cd /home/sistemas/farmaclinic/backend
npm ci

cd /home/sistemas/farmaclinic/frontend
npm ci
```

### Paso 3) Recompilar frontend

```bash
cd /home/sistemas/farmaclinic/frontend
cp -f .env.production.internal.example .env.production
npm run build
```

### Paso 4) Aplicar cambios de BD (solo si cambiaste esquema)

Si hubo cambios en [BD.mysql.sql](BD.mysql.sql), aplica:

```bash
mysql -h 127.0.0.1 -P 3307 -u farmaclinic_app -p farmaclinic < /home/sistemas/farmaclinic/BD.mysql.sql
```

### Paso 5) Levantar API otra vez

1. Modo systemd (recomendado):

```bash
sudo systemctl start farmaclinic-api
sudo systemctl status farmaclinic-api --no-pager
```

2. Modo manual (si aun no usas systemd):

```bash
cd /home/sistemas/farmaclinic/backend
export $(grep -v '^#' .env.internal | xargs)
nohup npm start > /tmp/farmaclinic-api.log 2>&1 &
```

### Paso 6) Publicar frontend otra vez en 8081

```bash
docker rm -f farmaclinic-web >/dev/null 2>&1 || true
docker run -d \
   --name farmaclinic-web \
   --restart unless-stopped \
   --add-host=host.docker.internal:host-gateway \
   -p 8081:80 \
   -v /home/sistemas/farmaclinic/deploy/nginx/farmaclinic-8081.conf:/etc/nginx/conf.d/default.conf:ro \
   -v /home/sistemas/farmaclinic/frontend/dist:/var/www/farmaclinic:ro \
   nginx:stable
```

### Paso 7) Validar que todo quedo bien

```bash
curl http://127.0.0.1:4100/api/health
curl http://127.0.0.1:8081/farmaclinic/api/health
curl http://127.0.0.1:8081/farmaclinic/api/bootstrap
```

Probar en navegador:

- http://10.69.40.7:8081/farmaclinic/

### Paso 8) Comandos rapidos de operacion diaria

Ver estado:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'farmaclinic-web|farmaclinic-db|NAMES'
ss -lntp | grep ':4100'
```

Reiniciar solo API:

```bash
sudo systemctl restart farmaclinic-api
```

Reiniciar solo frontend:

```bash
docker restart farmaclinic-web
```

Reiniciar solo BD FarmaClinic:

```bash
docker restart farmaclinic-db
```

### Recuperacion rapida (rollback)

Si un cambio salio mal:

1. Restaurar backup de BD.
2. Volver al commit/tag anterior del codigo.
3. Repetir pasos 3 a 7.

Restaurar backup:

```bash
mysql -h 127.0.0.1 -P 3307 -u farmaclinic_app -p farmaclinic < /home/sistemas/farmaclinic/backups/ARCHIVO_BACKUP.sql
```
