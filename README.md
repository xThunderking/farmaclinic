# farmaclinic

Proyecto fullstack de FarmaClinic con frontend en React y backend en Express + MySQL.

## Estructura

- frontend: Aplicacion React (Vite) con el mismo diseno y flujo del archivo App FarmaClinic.txt.
- backend: API REST con persistencia MySQL.
- BD.mysql.sql: Esquema MySQL completo con tablas y campos en espanol.
- BD.SQL: Esquema original SQLite (referencia historica).

## Requisitos

- Node.js 18+
- MySQL 8+

## Instalacion

1. Frontend:

	cd frontend
	npm install

2. Backend:

	cd backend
	npm install

3. Base de datos MySQL:

	- Crear base de datos: `farmaclinic`
	- Ejecutar el esquema: `BD.mysql.sql`
	- Copiar `backend/.env.example` a `backend/.env` y completar credenciales.

## Ejecucion

1. Iniciar API:

	cd backend
	npm run dev

2. Iniciar frontend:

	cd frontend
	npm run dev

La API corre por defecto en http://localhost:4000.
El frontend usa VITE_API_URL (ver frontend/.env.example).

## Base de datos

- Motor: MySQL
- Esquema SQL fuente: BD.mysql.sql

El backend aplica automaticamente BD.mysql.sql al iniciar y crea usuarios semilla si la tabla esta vacia.

Usuarios semilla:

- CoordinadorFV / FarmaFV (admin)
- Clinico1 / 123 (user)