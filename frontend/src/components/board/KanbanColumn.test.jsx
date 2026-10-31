import { DndContext } from '@dnd-kit/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import KanbanColumn from './KanbanColumn'

const COLUMN = { value: 'in_progress', label: 'En progreso' }

const task = (id, taskNumber) => ({
  id,
  taskNumber,
  title: `Tarea ${taskNumber}`,
  status: 'in_progress',
  assignee: { id: 3, name: 'Luis Díaz', email: 'luis@correo.com' },
})

function renderColumn(props) {
  return render(
    <DndContext>
      <KanbanColumn col={COLUMN} onTaskClick={vi.fn()} {...props} />
    </DndContext>
  )
}

describe('Columna del tablero', () => {
  it('muestra el conteo y avisa cuando se alcanza el límite WIP', () => {
    const { rerender } = renderColumn({ tasks: [task(1, 1)], wipLimit: 2 })

    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('Límite WIP: 2')).toBeInTheDocument()

    rerender(
      <DndContext>
        <KanbanColumn
          col={COLUMN}
          tasks={[task(1, 1), task(2, 2)]}
          wipLimit={2}
          onTaskClick={vi.fn()}
        />
      </DndContext>
    )

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('Límite WIP alcanzado')).toBeInTheDocument()
  })

  it('muestra el mensaje vacío correspondiente a la columna', () => {
    renderColumn({ tasks: [], wipLimit: 0 })

    expect(screen.getByText('Nada en progreso ahora')).toBeInTheDocument()
  })
})
