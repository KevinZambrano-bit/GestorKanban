import { render, screen, within } from '@testing-library/react'
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

function renderProfile() {
  localStorage.setItem('token', 'jwt-de-prueba')
  localStorage.setItem('user', JSON.stringify(USER))
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Perfil integrado con la sesión', () => {
  it('actualiza el nombre, guarda la sesión y refresca la cabecera', async () => {
    const user = userEvent.setup()
    let receivedBody

    server.use(
      http.patch(`${API_URL}/users/me`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ ...USER, name: receivedBody.name })
      })
    )

    renderProfile()

    const nameInput = await screen.findByLabelText('Nombre')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana María Ruiz')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Perfil actualizado correctamente'
    )
    expect(receivedBody).toEqual({ name: 'Ana María Ruiz' })
    expect(JSON.parse(localStorage.getItem('user')).name).toBe('Ana María Ruiz')
    const [appHeader] = screen.getAllByRole('banner')
    expect(within(appHeader).getByText('Ana María Ruiz')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana María Ruiz' })).toBeInTheDocument()
  })

  it('no envía la actualización si el nombre queda vacío', async () => {
    const user = userEvent.setup()
    let requests = 0

    server.use(
      http.patch(`${API_URL}/users/me`, () => {
        requests += 1
        return HttpResponse.json(USER)
      })
    )

    renderProfile()

    await user.clear(await screen.findByLabelText('Nombre'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(screen.getByRole('alert')).toHaveTextContent('El nombre es requerido')
    expect(requests).toBe(0)
  })
})
