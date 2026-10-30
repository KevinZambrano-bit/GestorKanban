import { setupServer } from 'msw/node'

// Sin handlers globales: cada prueba de integración declara la API que necesita
export const server = setupServer()
