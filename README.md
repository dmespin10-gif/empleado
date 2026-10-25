# Backend – Gestión de Empleados (Práctica 04 + Login)

> **Despliegue en producción (PDA06):** backend en AWS EC2, frontend en Azure y MongoDB Atlas → ver [DESPLIEGUE.md](DESPLIEGUE.md).

API REST de empleados (Express + Zod) con login (JWT), pruebas unitarias (Jest) y pruebas de estrés (Artillery).

## Requisitos
- Node.js v24+
- MongoDB (o el modo en memoria)
- Artillery: `npm install -g artillery`

## Instalación
```bash
cd backend
npm install
```
En `.env` deben estar `MONGO_URI` y `JWT_SECRET` (ver `.env.example`).

## Ejecutar el servidor
```bash
npm run dev          # con MongoDB
npm run dev:memory   # sin MongoDB
```
El servidor queda en `http://localhost:5000/api/v1`.
Al iniciar se crea el usuario administrador `admin@empresa.com` / `Admin12345` (se cambia en `.env`).

## Login
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crear usuario (`nombre`, `email`, `password`) |
| POST | `/auth/login` | Iniciar sesión, devuelve un `token` |
| GET | `/auth/me` | Usuario actual (requiere token) |

Ver empleados (GET) es público. Crear, editar y eliminar exige el header:
```
Authorization: Bearer <token>
```
Ejemplos listos en `api.rest`.

## Fase A – Pruebas unitarias (Jest)
```bash
npm run test
```
Prueba los controladores de empleados y de login, y el middleware de autenticación, con mocks y sin base de datos.

## Fase B – Pruebas de estrés (Artillery)
Con el servidor encendido, desde esta carpeta (donde está `stress-test.yml`):
```bash
artillery run stress-test.yml
```
Artillery inicia sesión una vez con el administrador y usa ese token en todas las peticiones.
