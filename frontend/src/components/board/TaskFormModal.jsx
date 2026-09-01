import { useState } from 'react'
import { TASK_STATUSES } from '../../hooks/useTasks'

export default function TaskFormModal({
  initialData,
  members,
  onClose,
  onSave,
}) {
  const isEditing = !!initialData
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [status, setStatus] = useState(initialData?.status || 'pending')
  const [assigneeId, setAssigneeId] = useState(
    initialData?.assignee?.id ?? ''
  )
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? String(initialData.startDate).slice(0, 10) : ''
  )
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? String(initialData.endDate).slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es requerido')
      return
    }

    const payload = { title: title.trim() }
    if (!isEditing) payload.status = status
    if (description.trim()) payload.description = description.trim()
    if (assigneeId) payload.assigneeId = Number(assigneeId)
    if (startDate) payload.startDate = startDate
    if (endDate) payload.endDate = endDate

    setSaving(true)
    setError('')
    try {
      await onSave(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Editar tarea' : 'Nueva tarea'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Título *
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          {!isEditing && (
            <label>
              Estado
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Asignado a
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.role === 'leader' ? '(Líder)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-dates">
            <label>
              Inicio
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              Fin
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}