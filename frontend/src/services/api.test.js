import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import api, { API_URL } from './api'
import { server } from '../test/server'

describe('Cliente HTTP de la API', () => {
  it('envía el token de autorización solo cuando existe en localStorage', async () => {
    const authorizationHeaders = []
    server.use(
      http.get(`${API_URL}/private`, ({ request }) => {
        authorizationHeaders.push(request.headers.get('Authorization'))
        return HttpResponse.json({ ok: true })
      })
    )

    await api.get('/private')
    localStorage.setItem('token', 'token-de-prueba')
    await api.get('/private')

    expect(authorizationHeaders).toEqual([null, 'Bearer token-de-prueba'])
  })

  it('envía el cuerpo de una petición POST como JSON', async () => {
    let receivedBody
    server.use(
      http.post(`${API_URL}/projects`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 1 })
      })
    )

    const payload = { name: 'Proyecto nuevo', isPublic: false }
    await api.post('/projects', payload)

    expect(receivedBody).toEqual(payload)
  })

  it('devuelve null cuando el servidor responde 204', async () => {
    server.use(http.delete(`${API_URL}/projects/1`, () => new HttpResponse(null, { status: 204 })))

    await expect(api.delete('/projects/1')).resolves.toBeNull()
  })

  it('lanza el mensaje del servidor cuando recibe 403', async () => {
    server.use(
      http.get(`${API_URL}/private`, () =>
        HttpResponse.json({ message: 'Acceso restringido' }, { status: 403 })
      )
    )

    await expect(api.get('/private')).rejects.toThrow('Acceso restringido')
  })

  it('limpia la sesión y lanza Sesión expirada al recibir 401', async () => {
    server.use(http.get(`${API_URL}/private`, () => new HttpResponse(null, { status: 401 })))
    localStorage.setItem('token', 'token-vencido')
    localStorage.setItem('user', JSON.stringify({ id: 1 }))
    const originalWindow = window
    vi.stubGlobal('window', { location: { href: '' } })

    try {
      await expect(api.get('/private')).rejects.toThrow('Sesión expirada')
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(window.location.href).toBe('/login')
    } finally {
      vi.stubGlobal('window', originalWindow)
    }
  })
})
