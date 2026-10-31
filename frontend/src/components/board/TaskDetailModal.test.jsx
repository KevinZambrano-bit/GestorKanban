import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import AuthContext from '../../context/AuthContext'
import TaskDetailModal from './TaskDetailModal'

const task = {
  id: 1,
  taskNumber: 4,
  title: 'Preparar entrega',
  status: 'pending',
  subtasks: [{ id: 11, title: 'Revisar contenido', completed: false }],
}

function renderModal(onGenerateSubtasks) {
  return render(
    <AuthContext.Provider value={{ user: { id: 7, name: 'Ana Ruiz' } }}>
      <TaskDetailModal
        task={task}
        loading={false}
        myRole="leader"
        error=""
        generating={false}
        developing={false}
        pendingSubtaskId={null}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onGenerateSubtasks={onGenerateSubtasks}
        onDevelop={vi.fn()}
        onToggleSubtask={vi.fn()}
        onRemoveSubtask={vi.fn()}
      />
    </AuthContext.Provider>
  )
}

it('no regenera las subtareas existentes si se cancela la confirmación', async () => {
  const user = userEvent.setup()
  const onGenerateSubtasks = vi.fn()
  renderModal(onGenerateSubtasks)

  await user.click(screen.getByRole('button', { name: 'Regenerar con IA' }))
  expect(document.querySelector('.subtask-confirm')).toHaveTextContent(
    /elimina las 1 subtareas actuales/
  )
  expect(onGenerateSubtasks).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Cancelar' }))

  expect(onGenerateSubtasks).not.toHaveBeenCalled()
  expect(document.querySelector('.subtask-confirm')).not.toBeInTheDocument()
})

it('regenera las subtareas solo después de confirmar', async () => {
  const user = userEvent.setup()
  const onGenerateSubtasks = vi.fn()
  renderModal(onGenerateSubtasks)

  await user.click(screen.getByRole('button', { name: 'Regenerar con IA' }))
  await user.click(screen.getByRole('button', { name: 'Regenerar' }))

  expect(onGenerateSubtasks).toHaveBeenCalledOnce()
  expect(document.querySelector('.subtask-confirm')).not.toBeInTheDocument()
})
