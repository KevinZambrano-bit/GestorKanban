import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import QuickAssign from './QuickAssign'

const members = [
  { id: 2, name: 'Ana Ruiz', email: 'ana@correo.com', role: 'member' },
]

it('cierra con Escape y devuelve el foco al botón que abrió el popover', async () => {
  const user = userEvent.setup()
  render(
    <QuickAssign taskTitle="Preparar entrega" members={members} onAssign={vi.fn()} />
  )

  const trigger = screen.getByRole('button', {
    name: 'Asignar responsable a "Preparar entrega"',
  })
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Elegir responsable' })).toBeInTheDocument()

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog', { name: 'Elegir responsable' })).not.toBeInTheDocument()
  await waitFor(() => expect(trigger).toHaveFocus())
})

it('muestra el error si falla la asignación del miembro seleccionado', async () => {
  const user = userEvent.setup()
  const onAssign = vi.fn().mockRejectedValue(new Error('No se pudo asignar'))
  render(
    <QuickAssign taskTitle="Preparar entrega" members={members} onAssign={onAssign} />
  )

  await user.click(
    screen.getByRole('button', {
      name: 'Asignar responsable a "Preparar entrega"',
    })
  )
  await user.click(screen.getByRole('button', { name: /Ana Ruiz/ }))

  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo asignar')
  expect(onAssign).toHaveBeenCalledWith(2)
})
