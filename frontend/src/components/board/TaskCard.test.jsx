import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TaskCard from './TaskCard'

function renderTaskCard(task) {
  return render(
    <DndContext>
      <SortableContext items={[task.id]}>
        <TaskCard task={task} />
      </SortableContext>
    </DndContext>
  )
}

const task = (overrides = {}) => ({
  id: 1,
  taskNumber: 1,
  title: 'Preparar entrega',
  status: 'pending',
  endDate: '2025-06-15',
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2025, 5, 16, 12))
})

afterEach(() => {
  vi.useRealTimers()
})

it('marca como vencida una fecha anterior y conserva su día local', () => {
  renderTaskCard(task())

  const date = screen.getByTitle('Fecha de fin vencida')
  expect(date).toHaveClass('is-overdue')
  expect(date).toHaveTextContent(/\b15\b/)
})

it('no marca como vencida una tarea completada aunque su fecha haya pasado', () => {
  renderTaskCard(task({ status: 'done' }))

  expect(screen.getByTitle('Fecha de fin')).not.toHaveClass('is-overdue')
  expect(screen.queryByTitle('Fecha de fin vencida')).not.toBeInTheDocument()
})

it('no marca como vencida una tarea que termina hoy', () => {
  renderTaskCard(task({ endDate: '2025-06-16' }))

  expect(screen.getByTitle('Fecha de fin')).not.toHaveClass('is-overdue')
})
