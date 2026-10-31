import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { expect, it } from 'vitest'
import AuthContext from '../context/AuthContext'
import { API_URL } from '../services/api'
import { server } from '../test/server'
import AcceptInvitation from './AcceptInvitation'

function ProjectDestination() {
  const { projectId } = useParams()
  return <p>Proyecto aceptado: {projectId}</p>
}

it('carga una invitación, la acepta y navega al proyecto indicado por la API', async () => {
  const requests = []
  server.use(
    http.get(`${API_URL}/invitations/token-prueba`, () =>
      HttpResponse.json({
        projectName: 'Proyecto Alfa',
        inviterName: 'Luis Díaz',
        email: 'ana@correo.com',
        role: 'member',
      })
    ),
    http.post(`${API_URL}/invitations/token-prueba/accept`, () => {
      requests.push('accept')
      return HttpResponse.json({ projectId: 42 })
    })
  )

  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/invitacion/token-prueba']}>
      <AuthContext.Provider
        value={{ user: { id: 7, name: 'Ana Ruiz', email: 'ana@correo.com' } }}
      >
        <Routes>
          <Route path="/invitacion/:token" element={<AcceptInvitation />} />
          <Route path="/projects/:projectId" element={<ProjectDestination />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )

  expect(await screen.findByRole('heading', { name: 'Proyecto Alfa' })).toBeInTheDocument()
  expect(screen.getByText(/Luis Díaz/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Aceptar invitación' }))

  expect(await screen.findByText('Proyecto aceptado: 42')).toBeInTheDocument()
  expect(requests).toEqual(['accept'])
})
