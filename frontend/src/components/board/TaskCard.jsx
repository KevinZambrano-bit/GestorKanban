import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_STATUSES } from '../../hooks/useTasks'
import { getAvatarUrl } from '../../utils/avatar'
import QuickAssign from './QuickAssign'

const STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
)

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
})

// endDate llega como 'YYYY-MM-DD'; new Date() lo leería en UTC y en América
// mostraría el día anterior, así que se construye en hora local
function parseDate(value) {
  if (!value) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function isOverdue(date, status) {
  if (!date || status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

// assignableMembers llega en null si el usuario no tiene rol para asignar:
// entonces "Sin asignar" es solo una etiqueta
export default function TaskCard({
  task,
  onClick,
  unassigned = false,
  assignableMembers = null,
  onQuickAssign,
}) {
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

  const endDate = parseDate(task.endDate)
  const overdue = isOverdue(endDate, task.status)

  const className = [
    'kanban-task-card',
    unassigned ? 'is-unassigned' : '',
    isDragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="kanban-task-card-header">
        <span className="kanban-task-num">#{task.taskNumber}</span>
        {unassigned && (
          <span className="kanban-task-status">
            {STATUS_LABELS[task.status] || task.status}
          </span>
        )}
      </div>

      <h4 className="kanban-task-title">{task.title}</h4>
      {task.description && (
        <p className="kanban-task-desc">{task.description}</p>
      )}

      <div className="kanban-task-footer">
        {task.assignee ? (
          <span className="kanban-assignee" title={task.assignee.email}>
            <img
              src={getAvatarUrl(task.assignee.email)}
              alt=""
              className="kanban-avatar"
              width="20"
              height="20"
            />
            <span className="kanban-assignee-name">{task.assignee.name}</span>
          </span>
        ) : (
          assignableMembers && onQuickAssign ? (
            <QuickAssign
              taskTitle={task.title}
              members={assignableMembers}
              onAssign={onQuickAssign}
            />
          ) : (
            <span className="kanban-unassigned-badge">Sin asignar</span>
          )
        )}
        {endDate && (
          <span
            className={`kanban-date ${overdue ? 'is-overdue' : ''}`}
            title={overdue ? 'Fecha de fin vencida' : 'Fecha de fin'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {overdue && <span className="sr-only">Vencida: </span>}
            {dateFormatter.format(endDate)}
          </span>
        )}
      </div>
    </div>
  )
}
