import { TASK_STATUSES } from '../../hooks/useTasks'

const STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
)

export default function TaskDetailModal({ task, myRole, onClose, onEdit, onDelete }) {
  if (!task) return <p className="loading">Cargando tarea...</p>

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail-header">
          <h2>
            #{task.taskNumber} · {task.title}
          </h2>
          <span className={`badge badge-status-${task.status}`}>
            {STATUS_LABELS[task.status] || task.status}
          </span>
        </div>

        <div className="task-detail-body">
          <div className="info-row">
            <span className="info-label">Descripción:</span>
            <span>{task.description || 'Sin descripción'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Asignado:</span>
            <span>{task.assignee?.name || 'Sin asignar'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Inicio:</span>
            <span>
              {task.startDate
                ? new Date(task.startDate).toLocaleDateString('es-ES')
                : '—'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Fin:</span>
            <span>
              {task.endDate
                ? new Date(task.endDate).toLocaleDateString('es-ES')
                : '—'}
            </span>
          </div>
          {task.subtasks?.length > 0 && (
            <div className="info-row">
              <span className="info-label">Subtareas:</span>
              <span>
                {task.subtasks.length}{' '}
                {task.subtasks.length === 1 ? 'subárea' : 'subáreas'}
              </span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn" onClick={onEdit}>
            Editar
          </button>
          {myRole === 'leader' && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}