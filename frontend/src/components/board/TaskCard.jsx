import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-task-card ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="kanban-task-card-header">
        <span className="kanban-task-num">#{task.taskNumber}</span>
      </div>
      <h3 className="kanban-task-title">{task.title}</h3>
      {task.description && (
        <p className="kanban-task-desc">{task.description}</p>
      )}
      <div className="kanban-task-footer">
        {task.assignee?.name ? (
          <span className="kanban-assignee">{task.assignee.name}</span>
        ) : (
          <span className="kanban-assignee">Sin asignar</span>
        )}
        {task.endDate && (
          <span className="kanban-date">
            {new Date(task.endDate).toLocaleDateString('es-ES')}
          </span>
        )}
      </div>
    </div>
  )
}