import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('Diálogo de confirmación', () => {
  it('muestra el título, el mensaje y los botones por defecto', () => {
    render(
      <ConfirmDialog
        title="Eliminar tarea"
        message="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Eliminar tarea' })).toBeInTheDocument()
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('muestra textos personalizados y llama a onConfirm al confirmar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        title="Guardar cambios"
        message="¿Quieres continuar?"
        confirmText="Guardar"
        cancelText="Volver"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('muestra el error de onConfirm y reactiva los botones al rechazarse', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockRejectedValue(new Error('No se pudo guardar'))
    render(
      <ConfirmDialog
        title="Guardar"
        message="Confirma el cambio."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  })

  it('llama a onCancel con el botón Cancelar y con la tecla Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Cerrar"
        message="¿Cerrar el diálogo?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('indica que procesa y deshabilita los botones mientras onConfirm está pendiente', async () => {
    const user = userEvent.setup()
    let finishConfirm
    const onConfirm = vi.fn(
      () =>
        new Promise((resolve) => {
          finishConfirm = resolve
        })
    )
    render(
      <ConfirmDialog
        title="Procesar"
        message="Espera un momento."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    finishConfirm()
    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })
})
