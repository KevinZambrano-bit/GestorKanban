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
│   │   ├── auth/            # Registro, login, Google OAuth, JWT
│   │   ├── users/           # CRUD de usuarios
│   │   ├── roles/           # Roles globales (admin, user)
│   │   ├── projects/        # Proyectos, miembros, roles de proyecto
│   │   ├── tasks/           # Tareas, subtareas, flujo Kanban
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

## API Endpoints principales

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Registro |
| POST | `/api/auth/login` | - | Inicio de sesión |
| GET | `/api/auth/profile` | JWT | Perfil del usuario |
| GET | `/api/users` | Admin | Listar usuarios |
| POST | `/api/projects` | JWT | Crear proyecto |
| GET | `/api/projects` | JWT | Listar proyectos |
| POST | `/api/projects/:id/members` | Leader | Invitar miembro |
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
