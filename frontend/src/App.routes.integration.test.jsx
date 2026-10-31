import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeProvider'
import { API_URL } from './services/api'
import { server } from './test/server'

const USER = {
  id: 7,
  name: 'Ana Ruiz',
  email: 'ana@correo.com',
  role: { name: 'user' },
}

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

function saveSession(user = USER) {
  localStorage.setItem('token', 'jwt-de-prueba')
  localStorage.setItem('user', JSON.stringify(user))
}

describe('Rutas de la aplicación', () => {
  it('redirige de /projects al formulario de login cuando no hay sesión', async () => {
    renderApp('/projects')

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('redirige de /login al dashboard cuando hay sesión', async () => {
    saveSession()
    server.use(http.get(`${API_URL}/projects`, () => HttpResponse.json([])))

    renderApp('/login')

    expect(await screen.findByRole('heading', { name: /, Ana$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('muestra acceso denegado al usuario sin rol de administrador en /admin', async () => {
    saveSession()

    renderApp('/admin')

    expect(await screen.findByText('No tienes permiso para ver esta página.')).toBeInTheDocument()
  })

  it('muestra la página NotFound en una ruta inexistente', () => {
    renderApp('/ruta-inexistente')

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    expect(screen.getByText('Esta página no existe.')).toBeInTheDocument()
  })
})
