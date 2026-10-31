import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it } from 'vitest'
import { ThemeProvider } from '../context/ThemeProvider'
import { API_URL } from '../services/api'
import { server } from '../test/server'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'

function renderPage(path, page) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/forgot-password" element={page} />
          <Route path="/reset-password" element={page} />
          <Route path="/login" element={<h1>Inicio de sesión</h1>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

it('solicita un enlace de recuperación y muestra un mensaje neutral de éxito', async () => {
  let requestBody
  server.use(
    http.post(`${API_URL}/auth/forgot-password`, async ({ request }) => {
      requestBody = await request.json()
      return HttpResponse.json({ message: 'Solicitud procesada' })
    })
  )

  const user = userEvent.setup()
  renderPage('/forgot-password', <ForgotPassword />)

  await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
  await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

  expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument()
  expect(screen.getByText(/Si esa cuenta existe/)).toBeInTheDocument()
  expect(requestBody).toEqual({ email: 'ana@correo.com' })
})

it('no envía contraseñas distintas y envía el token al confirmar una coincidencia', async () => {
  let requestBody
  server.use(
    http.post(`${API_URL}/auth/reset-password`, async ({ request }) => {
      requestBody = await request.json()
      return HttpResponse.json({ message: 'Contraseña actualizada' })
    })
  )

  const user = userEvent.setup()
  renderPage('/reset-password?token=token-prueba', <ResetPassword />)

  const password = screen.getByLabelText('Nueva contraseña')
  const confirmation = screen.getByLabelText('Repite la contraseña')
  await user.type(password, 'contraseña-segura')
  await user.type(confirmation, 'otra-contraseña')
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

  expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
  expect(requestBody).toBeUndefined()

  await user.clear(confirmation)
  await user.type(confirmation, 'contraseña-segura')
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

  expect(await screen.findByRole('heading', { name: 'Inicio de sesión' })).toBeInTheDocument()
  expect(requestBody).toEqual({
    token: 'token-prueba',
    password: 'contraseña-segura',
  })
})
