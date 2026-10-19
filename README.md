# GestorKanban

Sistema de gestión de proyectos y tareas estilo Kanban con generación de subtareas mediante inteligencia artificial.

## Arquitectura

```
User/Browser
    |
    v
Backend (NestJS, puerto 3000)  -->  REST API (/api/*)
    |                               Swagger Docs (/api/docs)
    |                               JWT / Passport Auth
    |                               TypeORM + MySQL
    |
    |--- TCP (localhost:3001)
    |       |
    |       v
    |   Microservicio IA (NestJS TCP, puerto 3001)
    |       |
    |       +-- HTTP
    |               |
    |               v
    |           Google Gemini API
    |
    +-- MySQL 8.0 (Docker, puerto 3307)
```

## Tecnologías

- **Framework:** NestJS 11
- **Lenguaje:** TypeScript
- **Base de datos:** MySQL 8.0 + TypeORM
- **Autenticación:** Passport (JWT + Google OAuth2)
- **IA:** Google Gemini (`@google/genai`)
- **Documentación API:** Swagger / OpenAPI
- **CI/CD:** GitHub Actions
- **Contenedores:** Docker (MySQL)

## Estructura del proyecto

```
GestorKanban/
├── backend/                 # API principal (NestJS)
│   ├── src/
│   │   ├── auth/            # Registro, login, Google OAuth, JWT, reset de contraseña
│   │   ├── users/           # CRUD de usuarios
│   │   ├── roles/           # Roles globales (admin, user)
│   │   ├── projects/        # Proyectos, miembros, roles de proyecto, invitaciones
│   │   ├── tasks/           # Tareas, subtareas, flujo Kanban
│   │   ├── mail/            # Correos transaccionales vía Gmail SMTP (Nodemailer)
│   │   ├── ai-client/       # Cliente TCP para el microservicio IA
│   │   ├── database/        # Configuración TypeORM
│   │   ├── app.module.ts
│   │   └── main.ts          # Entry point (puerto 3000)
│   ├── test/
│   └── package.json
│
├── microservicio_ia/        # Microservicio de IA (NestJS TCP)
│   ├── src/
│   │   ├── gemini/          # Integración con Google Gemini
│   │   ├── prompts/         # Prompts para generación de subtareas
│   │   ├── dto/
│   │   ├── ai.controller.ts
│   │   └── main.ts          # Entry point (puerto 3001, TCP)
│   └── package.json
│
├── .github/workflows/       # CI/CD pipeline
└── docker-compose.yml       # Base de datos MySQL
```

## Requisitos previos

- Node.js >= 20
- NestJS CLI (`npm i -g @nestjs/cli`)
- Docker (para la base de datos MySQL)
- Google AI Studio API Key (para el microservicio IA)

## Configuración e instalación

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd GestorKanban
```

### 2. Base de datos

```bash
docker compose up -d
```

Esto levanta MySQL 8.0 en el puerto `3307`.

### 3. Backend

```bash
cd backend
cp .env.example .env   # Completar variables de entorno
npm install
npm run start:dev      # Inicia en http://localhost:3000
```

Variables de entorno necesarias:

| Variable | Descripción |
|----------|-------------|
| `DB_HOST` | Host de MySQL |
| `DB_PORT` | Puerto de MySQL (por defecto 3307) |
| `DB_USER` | Usuario de MySQL |
| `DB_PASS` | Contraseña de MySQL |
| `DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Secreto para firmar JWT |
| `JWT_EXPIRES` | Tiempo de expiración del JWT |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth |
| `GOOGLE_CALLBACK_URL` | URL de callback de Google OAuth |
| `FRONTEND_URL` | URL del frontend (CORS, redirecciones y enlaces de correo) |
| `GMAIL_USER` | Cuenta de Gmail desde la que se envían los correos |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de esa cuenta (requiere 2FA) |
| `MAIL_FROM_NAME` | Nombre visible del remitente (la dirección siempre es `GMAIL_USER`) |
| `THROTTLE_LIMIT` | Peticiones por IP y ventana para toda la API (por defecto 120/min) |
| `THROTTLE_TTL_MS` | Duración de esa ventana en milisegundos (por defecto 60000) |

### 4. Microservicio IA

```bash
cd microservicio_ia
cp .env.example .env   # Completar con GEMINI_API_KEY
npm install
npm run start:dev      # Inicia en puerto 3001 (TCP)
```

### 5. Documentación Swagger

Una vez iniciado el backend, la documentación de la API está disponible en:

```
http://localhost:3000/api/docs
```

## Autenticación y roles

### Roles globales

- **admin** — Acceso completo al sistema
- **user** — Usuario estándar

### Roles de proyecto

- **leader** — Puede gestionar el proyecto, miembros y tareas
- **member** — Puede ver y crear tareas, mover su estado

### Métodos de autenticación

- Registro e inicio de sesión con email y contraseña (JWT)
- Inicio de sesión con Google OAuth2

## Flujo Kanban

Las tareas atraviesan tres estados:

```
pending --> in_progress --> done
```

- Los proyectos tienen un límite WIP (Work In Progress) configurable para la cantidad de tareas en `in_progress`.
- Solo el asignado puede marcar una tarea como `done`.
- Las tareas se numeran secuencialmente dentro de cada proyecto.

## Generación de subtareas con IA

El backend envía un mensaje TCP al microservicio IA con el patrón `generate_subtasks`, el microservicio consulta a Google Gemini y devuelve una lista de subtareas estructuradas en JSON.

## Correos transaccionales (Gmail SMTP)

`MailModule` centraliza los correos del sistema y los envía con
[Nodemailer](https://nodemailer.com) a través de `smtp.gmail.com`. Sin
`GMAIL_USER` y `GMAIL_APP_PASSWORD` el servicio queda desactivado y cada envío
se registra como omitido, de modo que el proyecto funciona igual en desarrollo.

| Flujo | Cuándo se envía |
|-------|-----------------|
| Invitación a un proyecto | Un líder invita a un email sin cuenta registrada |
| Aviso de incorporación | Un líder invita a alguien que ya tenía cuenta |
| Aviso de asignación | Se asigna una tarea a otra persona del proyecto |
| Recuperación de contraseña | El usuario solicita restablecer su contraseña |

Cada correo se envía en HTML y en texto plano, con deduplicación en memoria
durante 24 h para que un reintento no lo entregue dos veces. Los valores que
vienen de la base de datos se escapan antes de interpolarse: el HTML de las
plantillas está tipado como `RawHtml`, así que el compilador rechaza cualquier
interpolación sin `escapeHtml`.

### Configurar la cuenta de Gmail

Gmail no permite enviar desde un dominio propio sin configurarlo antes, así que
el remitente es siempre la cuenta configurada; `MAIL_FROM_NAME` solo cambia el
nombre visible. Pasos, una sola vez:

1. Activa la **verificación en dos pasos** en
   [myaccount.google.com/security](https://myaccount.google.com/security).
2. Crea una **contraseña de aplicación** en
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   (solo aparece con 2FA activa). No sirve la contraseña normal de la cuenta.
3. Copia el valor en `GMAIL_APP_PASSWORD` y la cuenta en `GMAIL_USER`.

Al arrancar, el servicio verifica la conexión SMTP en segundo plano y avisa en
el log si las credenciales no sirven.

### Límite de envíos

Una cuenta de Gmail gratuita admite unos **500 correos al día**. El servicio
lleva un contador en memoria, avisa en el log al llegar al 80 % y deja de
enviar al alcanzar el tope para no arriesgar un bloqueo de la cuenta.

### Verificación del destinatario

Antes de crear una invitación se comprueba que el dominio del correo publique
registros MX (`EmailVerifierService`): invitar a una dirección que no puede
recibir mensajes solo dejaría un enlace colgando. También se rechazan los
dominios de correo desechable conocidos (mailinator, yopmail, …), ampliables con
`MAIL_BLOCKED_DOMAINS`. Si el dominio no existe o no acepta correo se responde
con un error para que el líder corrija el email. Un fallo transitorio de DNS no
bloquea la invitación. No se hacen consultas `RCPT TO` para detectar rebotes:
son poco fiables y Gmail las penaliza.

### Invitaciones a proyectos

A diferencia de "añadir usuario", invitar funciona también con quien todavía no
tiene cuenta:

1. El líder escribe el email en la pestaña **Miembros**.
2. Si el email ya está registrado, se añade al proyecto y se le avisa por correo.
3. Si no, se genera un token de un solo uso con 7 días de validez y se envía el
   enlace `FRONTEND_URL/invitacion/<token>`.
4. Al abrirlo, la persona inicia sesión (o se registra) y el sistema completa la
   incorporación al proyecto.

Las invitaciones son nominales: solo la cuenta invitada puede aceptarlas. El líder
puede ver las pendientes y revocarlas desde la misma pestaña.

Si el correo no se pudo enviar, la invitación queda en estado **fallida** con el
motivo del error (su enlace no se puede aceptar y no aparece entre las
pendientes; reinvitar la reemplaza). Cuando el correo es solo un aviso (el
usuario ya tenía cuenta) la incorporación se mantiene y se informa al líder de
que no se le pudo avisar.

El enlace del correo de asignación (`FRONTEND_URL/projects/<id>?tarea=<n>`) abre
el tablero con el detalle de esa tarea ya abierto.

### Recuperación de contraseña

1. `POST /auth/forgot-password` genera un token de un solo uso con 30 minutos de
   validez y lo envía por correo. La respuesta es idéntica exista o no la cuenta,
   para no revelar qué emails están registrados.
2. `POST /auth/reset-password` valida el token y guarda la nueva contraseña con
   bcrypt.

De los dos solo se almacena el hash SHA-256 del token: leer la tabla no permite
autenticarse con ella.

Como es un endpoint público que dispara un envío real, está limitado a **10
solicitudes por hora e IP** (`429` al superarlo). Toda la API tiene además un
límite global configurable con `THROTTLE_LIMIT` y `THROTTLE_TTL_MS`.

## API Endpoints principales

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Registro |
| POST | `/api/auth/login` | - | Inicio de sesión |
| POST | `/api/auth/forgot-password` | - | Solicitar restablecimiento de contraseña |
| POST | `/api/auth/reset-password` | - | Establecer nueva contraseña con el token |
| GET | `/api/auth/profile` | JWT | Perfil del usuario |
| GET | `/api/users` | Admin | Listar usuarios |
| POST | `/api/projects` | JWT | Crear proyecto |
| GET | `/api/projects` | JWT | Listar proyectos |
| POST | `/api/projects/:id/invitations` | Leader | Invitar por email (envía correo) |
| GET | `/api/projects/:id/invitations` | Leader | Invitaciones pendientes |
| DELETE | `/api/projects/:id/invitations/:invId` | Leader | Revocar una invitación |
| GET | `/api/invitations/:token` | - | Datos de una invitación (público) |
| POST | `/api/invitations/:token/accept` | JWT | Aceptar la invitación |
| GET | `/api/projects/:pid/tasks` | Member | Listar tareas |
| POST | `/api/projects/:pid/tasks` | Member | Crear tarea |
| PATCH | `/api/projects/:pid/tasks/:num/move` | Member | Mover tarea de estado |
| POST | `/api/projects/:pid/tasks/:num/generate-subtasks` | Member | Generar subtareas con IA |

## Scripts disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Iniciar en modo desarrollo |
| `npm run build` | Compilar a JavaScript |
| `npm run test` | Ejecutar tests unitarios |
| `npm run test:e2e` | Ejecutar tests e2e |
| `npm run lint` | Ejecutar ESLint |

### Microservicio IA

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Iniciar en modo desarrollo |
| `npm run build` | Compilar a JavaScript |
| `npm run test` | Ejecutar tests |
| `npm run lint` | Ejecutar ESLint |

## CI/CD

El proyecto incluye un pipeline de GitHub Actions que ejecuta:

1. **Backend:** `npm ci` → ESLint → Jest tests con cobertura → build
2. **Microservicio IA:** `npm ci` → ESLint → Jest tests → build

Se activa con cada push o Pull Request a la rama `main`.
