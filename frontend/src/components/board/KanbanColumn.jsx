import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { UNASSIGNED } from '../../hooks/useTasks'
import TaskCard from './TaskCard'

const EMPTY_TEXT = {
  [UNASSIGNED]: 'Todas las tareas tienen responsable',
  pending: 'No hay tareas pendientes',
  in_progress: 'Nada en progreso ahora',
  done: 'Aún no hay tareas completadas',
}

export default function KanbanColumn({
  col,
  tasks,
  wipLimit,
  onTaskClick,
  members,
  onQuickAssign,
}) {
  const { setNodeRef } = useDroppable({ id: col.value })
  const { active, over } = useDndContext()

  // Resalta la columna tanto si el puntero está sobre ella como sobre una de
  // sus tarjetas
  const overContainer = over?.data?.current?.sortable?.containerId ?? over?.id
  const isOver = !!active && overContainer === col.value

  // Columna desde la que se arrastra (dnd-kit la expone en data.sortable)
  const activeContainer = active?.data?.current?.sortable?.containerId
  const blocked =
    !!activeContainer &&
    (col.virtual
      ? activeContainer !== col.value
      : activeContainer === UNASSIGNED)

  // El WIP solo aplica a "En progreso"; las sin asignar no cuentan
  const hasWip = col.value === 'in_progress' && wipLimit > 0
  const wipFull = hasWip && tasks.length >= wipLimit

  const className = [
    'kanban-column',
    `kanban-column-${col.value}`,
    isOver && !blocked ? 'kanban-column-over' : '',
    isOver && blocked ? 'kanban-column-blocked' : '',
    blocked ? 'is-drop-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section ref={setNodeRef} className={className} aria-label={col.label}>
      <header className="kanban-column-header">
        <span className="kanban-column-marker" aria-hidden="true" />
        <h3 className="kanban-column-title">{col.label}</h3>
        <span
          className={`kanban-column-count ${wipFull ? 'is-full' : ''}`}
          title={hasWip ? `Límite WIP: ${wipLimit}` : undefined}
        >
          {hasWip ? `${tasks.length} / ${wipLimit}` : tasks.length}
        </span>
      </header>

      {col.virtual && (
        <p className="kanban-column-note">
          Asigna un responsable para poder moverlas.
        </p>
      )}

      {hasWip && (
        <div className="kanban-wip">
          <div className="kanban-wip-track" aria-hidden="true">
            <span
              className="kanban-wip-fill"
              style={{ width: `${Math.min(100, (tasks.length / wipLimit) * 100)}%` }}
            />
          </div>
          <span className="kanban-wip-label">
            {wipFull
              ? 'Límite WIP alcanzado'
              : `Límite WIP: ${wipLimit}`}
          </span>
        </div>
      )}

      <SortableContext
        id={col.value}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kanban-task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              unassigned={col.virtual}
              onClick={() => onTaskClick?.(task)}
              assignableMembers={members}
              onQuickAssign={(assigneeId) => onQuickAssign?.(task, assigneeId)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="kanban-empty">
              {isOver
                ? blocked
                  ? 'No puedes soltar aquí'
                  : 'Suelta aquí'
                : EMPTY_TEXT[col.value]}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
