# GUIA DETALLADA - REINICIO DE BACKEND Y FRONTEND EN PRODUCCION

Fecha: 2026-05-21
Proyecto: FarmaClinic (perfil coexistente)

## 1) Objetivo

Esta guia explica, paso a paso:
- Como reiniciar backend y frontend en produccion.
- Donde correr cada comando.
- Para que sirve cada comando.
- Como validar que todo quedo bien.

## 2) Arquitectura actual (produccion)

- Backend API: 127.0.0.1:4100
- Frontend publico: http://10.69.40.7:8081/farmaclinic/
- Contenedor frontend: farmaclinic-web
- Base de datos FarmaClinic: contenedor farmaclinic-db (127.0.0.1:3307)
- Backend como servicio systemd: farmaclinic-api

## 3) Convenciones de ejecucion

Usa estas rutas segun el comando:

- [RUN IN] /home/sistemas/farmaclinic
  - comandos docker
  - validaciones curl publicas
  - git pull (si aplica)

- [RUN IN] /home/sistemas/farmaclinic/backend
  - comandos npm del backend (si aplica)

- [RUN IN] /home/sistemas/farmaclinic/frontend
  - comandos npm del frontend y build

## 4) Reinicio rapido (sin bajar cambios)

### Paso 1 - Reiniciar backend

[RUN IN] /home/sistemas/farmaclinic

Comando:

```bash
sudo systemctl restart farmaclinic-api
```

Para que sirve:
- Reinicia la API para recargar el proceso Node del backend.

### Paso 2 - Reiniciar frontend

[RUN IN] /home/sistemas/farmaclinic

Comando:

```bash
docker restart farmaclinic-web
```

Para que sirve:
- Reinicia Nginx del frontend publicado en 8081.

### Paso 3 - Validar salud

[RUN IN] /home/sistemas/farmaclinic

Comandos:

```bash
curl http://127.0.0.1:4100/api/health
curl http://127.0.0.1:8081/farmaclinic/api/health
curl http://127.0.0.1:8081/farmaclinic/
```

Resultado esperado:
- API health devuelve JSON con ok true.
- Frontend responde HTML en /farmaclinic/.

## 5) Reinicio despues de bajar cambios (recomendado)

Usa este flujo cuando hiciste git pull o cambios de codigo.

### Paso 0 - Ir al root del repo

[RUN IN] Cualquier ruta

```bash
cd /home/sistemas/farmaclinic
```

### Paso 1 - (Opcional) bajar cambios

[RUN IN] /home/sistemas/farmaclinic

```bash
git pull
```

### Paso 2 - Actualizar backend

[RUN IN] /home/sistemas/farmaclinic/backend

```bash
cd /home/sistemas/farmaclinic/backend
npm ci || npm install
```

Para que sirve:
- Instala dependencias exactas del backend.
- Si package-lock no esta alineado, usa fallback npm install.

### Paso 3 - Actualizar frontend y compilar produccion

[RUN IN] /home/sistemas/farmaclinic/frontend

```bash
cd /home/sistemas/farmaclinic/frontend
npm ci || npm install
cp -f .env.production.internal.example .env.production
npm run build
```

Para que sirve:
- Instalar dependencias frontend.
- Preparar variables de entorno de produccion.
- Generar archivos finales en frontend/dist.

### Paso 4 - Reiniciar backend

[RUN IN] /home/sistemas/farmaclinic

```bash
sudo systemctl restart farmaclinic-api
```

### Paso 5 - Reiniciar frontend

[RUN IN] /home/sistemas/farmaclinic

```bash
docker restart farmaclinic-web
```

### Paso 6 - Validar despliegue completo

[RUN IN] /home/sistemas/farmaclinic

```bash
systemctl is-active farmaclinic-api
systemctl is-enabled farmaclinic-api

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'farmaclinic-web|farmaclinic-db|NAMES'

curl http://127.0.0.1:4100/api/health
curl http://127.0.0.1:8081/farmaclinic/api/health
curl http://127.0.0.1:8081/farmaclinic/ | head -n 20
```

Resultado esperado:
- farmaclinic-api: active
- farmaclinic-api: enabled
- farmaclinic-web: Up
- endpoints responden OK

## 6) Comandos de diagnostico rapido

### Ver logs backend

[RUN IN] /home/sistemas/farmaclinic

```bash
systemctl status farmaclinic-api --no-pager -l
journalctl -u farmaclinic-api -n 100 --no-pager
```

### Ver logs frontend (contenedor)

[RUN IN] /home/sistemas/farmaclinic

```bash
docker logs --tail 100 farmaclinic-web
```

### Confirmar puertos

[RUN IN] /home/sistemas/farmaclinic

```bash
ss -lntp | grep ':4100'
ss -lntp | grep ':8081'
```

## 7) Problemas comunes y solucion

### Problema A: backend no sube (status=203/EXEC)

Causa comun:
- ExecStart de systemd apunta a una ruta invalida de node.

Solucion:
- Revisar unidad en:
  /etc/systemd/system/farmaclinic-api.service
- Verificar ruta real de node:

```bash
which node
```

- Ajustar ExecStart y recargar:

```bash
sudo systemctl daemon-reload
sudo systemctl restart farmaclinic-api
```

### Problema B: frontend reiniciado pero no ves cambios

Causa comun:
- build no actualizado o cache del navegador.

Solucion:

```bash
cd /home/sistemas/farmaclinic/frontend
npm run build
cd /home/sistemas/farmaclinic
docker restart farmaclinic-web
```

Y en navegador:
- Ctrl+F5 (recarga forzada)
- o probar en ventana incognito

### Problema C: npm ci falla en frontend

Causa comun:
- package-lock.json desincronizado con package.json.

Solucion:
- usar fallback temporal:

```bash
npm install
```

## 8) Verificacion final para negocio

Abrir en navegador:
- http://10.69.40.7:8081/farmaclinic/

Checklist:
- Login funciona.
- Dashboard carga pacientes.
- API responde sin errores.
- Cambios recientes del front se reflejan.

## 9) Resumen ejecutivo (comandos minimos)

[RUN IN] /home/sistemas/farmaclinic/frontend

```bash
cp -f .env.production.internal.example .env.production
npm run build
```

[RUN IN] /home/sistemas/farmaclinic

```bash
sudo systemctl restart farmaclinic-api
docker restart farmaclinic-web
curl http://127.0.0.1:4100/api/health
curl http://127.0.0.1:8081/farmaclinic/api/health
```
