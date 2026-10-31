import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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

const PROJECTS = [
  {
    id: 1,
    name: 'Proyecto líder',
    description: 'Proyecto que lidero',
    myRole: 'leader',
    memberCount: 1,
    members: [],
    taskCounts: { pending: 0, in_progress: 0, done: 0, total: 0 },
    isPublic: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Proyecto miembro',
    description: 'Proyecto compartido',
    myRole: 'member',
    memberCount: 2,
    members: [],
    taskCounts: { pending: 0, in_progress: 0, done: 0, total: 0 },
    isPublic: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

function renderProjects() {
  localStorage.setItem('token', 'jwt-de-prueba')
  localStorage.setItem('user', JSON.stringify(USER))
  return render(
    <MemoryRouter initialEntries={['/projects']}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Página de proyectos integrada', () => {
  it('lista los proyectos que devuelve GET /projects con sus roles', async () => {
    server.use(http.get(`${API_URL}/projects`, () => HttpResponse.json(PROJECTS)))

    renderProjects()

    expect(await screen.findByRole('heading', { name: 'Proyecto líder' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Proyecto miembro' })).toBeInTheDocument()
  })

  it('filtra la lista para mostrar solo los proyectos que lidero', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${API_URL}/projects`, () => HttpResponse.json(PROJECTS)))

    renderProjects()

    const leaderFilter = await screen.findByRole('button', { name: /Lidero/ })
    await user.click(leaderFilter)

    expect(screen.getByRole('heading', { name: 'Proyecto líder' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Proyecto miembro' })).not.toBeInTheDocument()
  })

  it('crea un proyecto con el nombre indicado y lo añade a la lista', async () => {
    const user = userEvent.setup()
    let receivedBody
    server.use(
      http.get(`${API_URL}/projects`, () => HttpResponse.json(PROJECTS)),
      http.post(`${API_URL}/projects`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 3, name: receivedBody.name })
      })
    )

    renderProjects()
    await user.click(await screen.findByRole('button', { name: '+ Nuevo proyecto' }))
    await user.type(screen.getByLabelText('Nombre *'), 'Proyecto recién creado')
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))

    expect(await screen.findByRole('heading', { name: 'Proyecto recién creado' })).toBeInTheDocument()
    expect(receivedBody).toEqual({
      name: 'Proyecto recién creado',
      description: '',
      isPublic: false,
    })
  })

  it('muestra el error de carga y permite volver a solicitar los proyectos', async () => {
    const user = userEvent.setup()
    let requests = 0
    server.use(
      http.get(`${API_URL}/projects`, () => {
        requests += 1
        if (requests === 1) {
          return HttpResponse.json({ message: 'Error 500' }, { status: 500 })
        }
        return HttpResponse.json(PROJECTS)
      })
    )

    renderProjects()

    expect(await screen.findByText(/No se pudieron cargar tus proyectos/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Proyecto líder' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Proyecto miembro' })).toBeInTheDocument()
    expect(requests).toBe(2)
  })
})
