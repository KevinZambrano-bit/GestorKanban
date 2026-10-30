import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it } from 'vitest'
import AuthContext from '../context/AuthContext'
import RoleRoute from './RoleRoute'

function renderAdminRoute(user) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleRoute allowed={['admin']} />}>
            <Route path="/admin" element={<p>Panel de administración</p>} />
          </Route>
          <Route path="/forbidden" element={<p>Acceso denegado</p>} />
          <Route path="/login" element={<p>Inicia sesión</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

it('deja pasar al admin y redirige al resto de usuarios', () => {
  const admin = renderAdminRoute({ role: { name: 'admin' } })
  expect(screen.getByText('Panel de administración')).toBeInTheDocument()
  admin.unmount()

  const regular = renderAdminRoute({ role: { name: 'user' } })
  expect(screen.getByText('Acceso denegado')).toBeInTheDocument()
  expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument()
  regular.unmount()

  renderAdminRoute(null)
  expect(screen.getByText('Inicia sesión')).toBeInTheDocument()
  expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument()
})
