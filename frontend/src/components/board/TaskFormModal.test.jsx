import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskFormModal from './TaskFormModal'

const MEMBERS = [
  { id: 2, name: 'Ana Ruiz', email: 'ana@correo.com', role: 'member' },
  { id: 3, name: 'Luis Díaz', email: 'luis@correo.com', role: 'leader' },
]

describe('Formulario de tarea', () => {
  it('exige el título y no guarda cuando está vacío', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<TaskFormModal members={MEMBERS} onClose={vi.fn()} onSave={onSave} />)

    await user.type(screen.getByLabelText('Título *'), '   ')
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }))

    expect(screen.getByText('El título es requerido')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('envía los datos normalizados al crear una tarea', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<TaskFormModal members={MEMBERS} onClose={vi.fn()} onSave={onSave} />)

    await user.type(screen.getByLabelText('Título *'), '  Revisar login  ')
    await user.type(screen.getByLabelText('Descripción'), '  Validar credenciales  ')
    await user.selectOptions(screen.getByLabelText('Estado'), 'in_progress')
    await user.selectOptions(screen.getByLabelText('Asignado a'), '2')
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Revisar login',
      description: 'Validar credenciales',
      status: 'in_progress',
      assigneeId: 2,
    })
  })

  it('en edición precarga los datos y no incluye el estado en el envío', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <TaskFormModal
        initialData={{
          title: 'Crear API',
          description: 'Endpoints de tareas',
          status: 'done',
          assignee: { id: 3 },
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: '2026-05-10T00:00:00.000Z',
        }}
        members={MEMBERS}
        onClose={vi.fn()}
        onSave={onSave}
      />
    )

    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Título *')).toHaveValue('Crear API')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Crear API',
      description: 'Endpoints de tareas',
      assigneeId: 3,
      startDate: '2026-05-01',
      endDate: '2026-05-10',
    })
  })
})
