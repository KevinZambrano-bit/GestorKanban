import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

export default function KanbanColumn({ col, tasks, wipLimit, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.value })

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column-over' : ''}`}
    >
      <div className="kanban-column-header">
        <span className="kanban-column-title">{col.label}</span>
        <span className="kanban-column-count">
          {col.value === 'in_progress' && wipLimit
            ? `${tasks.length}/${wipLimit}`
            : tasks.length}
        </span>
      </div>

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
              onClick={() => onTaskClick?.(task)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="kanban-drop-hint">
              {isOver ? 'Suelta aquí' : 'Sin tareas'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}