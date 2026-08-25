# Microservicio IA — Generación de Subtareas con Gemini

Microservicio NestJS que recibe una tarea principal y genera subtareas mediante la API de Google Gemini.

## Arquitectura

```text
Backend Principal (Puerto 3000)
        │
        │ TCP
        ▼
Microservicio IA (Puerto 3001)
        │
        │ HTTP
        ▼
  Google Gemini API
```

## Requisitos

- Node.js >= 20
- NestJS CLI (`npm install -g @nestjs/cli`)
- Una API Key de [Google AI Studio](https://aistudio.google.com/)

## Instalación

```bash
cd microservicio_ia
npm install
```

## Configuración

Crear archivo `.env` en la raíz del proyecto:

```env
GEMINI_API_KEY=tu_api_key_aqui
PORT=3001
```

## Ejecución

```bash
# desarrollo
npm run start:dev

# producción
npm run build
npm run start:prod
```

## Comunicación TCP

El microservicio escucha en `localhost:3001` usando `Transport.TCP`.

### Patrón de mensaje

```text
generate_subtasks
```

### Solicitud

```json
{
  "task": "Implementar autenticación JWT"
}
```

### Respuesta

```json
{
  "success": true,
  "subtasks": [
    "Instalar dependencias JWT",
    "Crear estrategia JWT",
    "Configurar módulo de autenticación",
    "Implementar endpoint de login",
    "Proteger rutas privadas"
  ]
}
```

## Conexión desde el Backend Principal

```typescript
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host: 'localhost', port: 3001 },
});

const result = await client.send('generate_subtasks', {
  task: 'Implementar autenticación JWT',
}).toPromise();
```

## Tecnologías

- NestJS 11
- TypeScript
- @nestjs/microservices (TCP)
- @google/genai
- class-validator / class-transformer
