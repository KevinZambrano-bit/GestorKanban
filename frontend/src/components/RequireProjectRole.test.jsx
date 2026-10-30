import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import RequireProjectRole from './RequireProjectRole'

it('muestra el contenido solo si el rol del proyecto está permitido', () => {
  const ui = (role) => (
    <RequireProjectRole role={role} allowed={['leader']}>
      <button>Eliminar proyecto</button>
    </RequireProjectRole>
  )

  const { rerender } = render(ui('leader'))
  expect(screen.getByRole('button', { name: 'Eliminar proyecto' })).toBeInTheDocument()

  rerender(ui('member'))
  expect(screen.queryByRole('button', { name: 'Eliminar proyecto' })).not.toBeInTheDocument()

  // getMyRole devuelve null para quien no pertenece al proyecto
  rerender(ui(null))
  expect(screen.queryByRole('button', { name: 'Eliminar proyecto' })).not.toBeInTheDocument()
})
