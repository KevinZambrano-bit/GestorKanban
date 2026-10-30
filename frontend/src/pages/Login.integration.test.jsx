import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import App from '../App'
import { AuthProvider } from '../context/AuthProvider'
import { ThemeProvider } from '../context/ThemeProvider'
import { API_URL } from '../services/api'
import { server } from '../test/server'

const USER = {
  id: 7,
  name: 'Ana Ruiz',
  email: 'ana@correo.com',
  role: { name: 'user' },
}

it('inicia sesión, guarda la sesión y llega al dashboard usando el token', async () => {
  let loginBody = null
  let projectsAuthHeader = null

  server.use(
    http.post(`${API_URL}/auth/login`, async ({ request }) => {
      loginBody = await request.json()
      return HttpResponse.json({ access_token: 'jwt-de-prueba', user: USER })
    }),
    http.get(`${API_URL}/projects`, ({ request }) => {
      projectsAuthHeader = request.headers.get('Authorization')
      return HttpResponse.json([])
    })
  )

  render(
    <MemoryRouter initialEntries={['/login']}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )

  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), USER.email)
  await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))

  // El saludo solo existe en el Dashboard, detrás de ProtectedRoute
  expect(await screen.findByRole('heading', { name: /, Ana$/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()

  expect(loginBody).toEqual({ email: USER.email, password: 'secreta123' })
  expect(localStorage.getItem('token')).toBe('jwt-de-prueba')
  expect(JSON.parse(localStorage.getItem('user'))).toEqual(USER)
  expect(projectsAuthHeader).toBe('Bearer jwt-de-prueba')
})
