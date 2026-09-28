import { useState } from 'react'
import { TASK_STATUSES } from '../../hooks/useTasks'
import useAuth from '../../hooks/useAuth'
import RequireProjectRole from '../RequireProjectRole'

const STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
)

// Replica el @RequireProjectRole(MEMBER, LEADER) del backend
const MEMBER_ROLES = ['member', 'leader']

export default function TaskDetailModal({
  task,
  loading,
  myRole,
  error,
  generating,
  developing,
  pendingSubtaskId,
  onClose,
  onEdit,
  onDelete,
  onGenerateSubtasks,
  onDevelop,
  onToggleSubtask,
  onRemoveSubtask,
}) {
  const { user } = useAuth()
  // Regenerar es destructivo (el backend borra las subtareas previas), asi que
  // el primer clic solo muestra el aviso y no genera nada.
  const [confirmRegen, setConfirmRegen] = useState(false)

  if (!task && loading) return <p className="loading">Cargando tarea...</p>
  if (!task) return null

  const subtasks = task.subtasks || []
  const doneCount = subtasks.filter((s) => s.completed).length
  // El servicio exige member|leader Y ser el asignado (tasks.service.ts:243)
  const isAssignee = !!user && task.assignee?.id === user.id
  const canEditSubtasks = MEMBER_ROLES.includes(myRole)
  // Un unico flag deshabilita todos los controles: imposible pulsar dos veces
  const busy = generating || developing || pendingSubtaskId != null

  const handleGenerateClick = () => {
    if (subtasks.length > 0) {
      setConfirmRegen(true)
      return
    }
    onGenerateSubtasks()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
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

          <div className="task-detail-section">
            <div className="task-detail-section-header">
              <span className="info-label">Subtareas</span>
              {subtasks.length > 0 && (
                <span className="task-detail-hint">
                  {doneCount} de {subtasks.length} completadas
                </span>
              )}
            </div>

            <RequireProjectRole role={myRole} allowed={MEMBER_ROLES}>
              {confirmRegen ? (
                <div className="subtask-confirm">
                  <p>
                    Regenerar con IA <strong>elimina</strong> las{' '}
                    {subtasks.length} subtareas actuales.
                  </p>
                  <div className="subtask-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setConfirmRegen(false)}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ai btn-sm"
                      onClick={() => {
                        setConfirmRegen(false)
                        onGenerateSubtasks()
                      }}
                      disabled={busy}
                    >
                      Regenerar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`btn btn-ai btn-loading${
                    generating ? ' is-loading' : ''
                  }`}
                  onClick={handleGenerateClick}
                  disabled={busy}
                  aria-busy={generating}
                >
                  {generating ? (
                    <>
                      <span className="btn-spinner btn-spinner-dark" />
                      Generando subtareas...
                    </>
                  ) : subtasks.length > 0 ? (
                    'Regenerar con IA'
                  ) : (
                    'Generar subtareas con IA'
                  )}
                </button>
              )}
            </RequireProjectRole>

            {subtasks.length === 0 ? (
              <p className="subtask-empty">
                Esta tarea todavía no tiene subtareas.
              </p>
            ) : (
              <ul className="subtask-list">
                {subtasks.map((s) => (
                  <li
                    key={s.id}
                    className={`subtask-item${
                      s.completed ? ' is-completed' : ''
                    }`}
                  >
                    <label className="subtask-check">
                      <input
                        type="checkbox"
                        checked={!!s.completed}
                        disabled={busy || !canEditSubtasks}
                        onChange={() => onToggleSubtask(s)}
                      />
                      <span className="subtask-title">{s.title}</span>
                    </label>
                    <RequireProjectRole role={myRole} allowed={MEMBER_ROLES}>
                      <button
                        type="button"
                        className="subtask-remove"
                        onClick={() => onRemoveSubtask(s)}
                        disabled={busy}
                        aria-label={`Eliminar subtarea: ${s.title}`}
                        title="Eliminar subtarea"
                      >
                        {pendingSubtaskId === s.id ? (
                          <span className="btn-spinner btn-spinner-dark" />
                        ) : (
                          '×'
                        )}
                      </button>
                    </RequireProjectRole>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <RequireProjectRole role={myRole} allowed={MEMBER_ROLES}>
            <div className="task-detail-ai-actions">
              {task.status === 'done' ? (
                <p className="success">Tarea marcada como desarrollada</p>
              ) : isAssignee ? (
                <button
                  type="button"
                  className={`btn btn-ai btn-loading${
                    developing ? ' is-loading' : ''
                  }`}
                  onClick={onDevelop}
                  disabled={busy}
                  aria-busy={developing}
                >
                  {developing ? (
                    <>
                      <span className="btn-spinner btn-spinner-dark" />
                      Marcando...
                    </>
                  ) : (
                    'Marcar como desarrollada'
                  )}
                </button>
              ) : (
                <p className="task-detail-hint">
                  {task.assignee
                    ? `Solo ${task.assignee.name} puede marcar esta tarea como desarrollada.`
                    : 'Asigna la tarea a alguien para poder marcarla como desarrollada.'}
                </p>
              )}
            </div>
          </RequireProjectRole>

          {error && <p className="error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn" onClick={onEdit}>
            Editar
          </button>
          <RequireProjectRole role={myRole} allowed={['leader']}>
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Eliminar
            </button>
          </RequireProjectRole>
        </div>
      </div>
    </div>
  )
}
