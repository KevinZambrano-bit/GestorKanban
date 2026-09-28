import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import useTasks, { TASK_STATUSES, UNASSIGNED } from '../../hooks/useTasks'
import KanbanColumn from './KanbanColumn'
import TaskFormModal from './TaskFormModal'
import TaskDetailModal from './TaskDetailModal'
import ConfirmDialog from '../ConfirmDialog'

const BOARD_COLUMNS = [
  { value: UNASSIGNED, label: 'Sin asignar', virtual: true },
  ...TASK_STATUSES,
]

const MOVE_UNASSIGNED_MSG = 'Debes asignar la tarea antes de moverla.'
const DROP_UNASSIGNED_MSG =
  'No puedes arrastrar tareas a "Sin asignar": la columna se actualiza sola según el responsable.'

function emptyGroups() {
  const groups = {}
  BOARD_COLUMNS.forEach((c) => {
    groups[c.value] = []
  })
  return groups
}

// Sin asignado → "Sin asignar" (sea cual sea su estado); si no, su estado real
function groupTasks(tasks) {
  const groups = emptyGroups()
  tasks.forEach((t) => {
    const key = t.assignee ? t.status : UNASSIGNED
    if (groups[key]) groups[key].push(t)
  })
  return groups
}

export default function KanbanBoard({ projectId, project, members, myRole }) {
  const {
    tasks,
    loading,
    error,
    setError,
    refresh,
    createTask,
    getTask,
    updateTask,
    moveTask,
    deleteTask,
    generateSubtasks,
    developTask,
    updateSubtask,
    deleteSubtask,
  } = useTasks(projectId)

  const [items, setItems] = useState(emptyGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [detailNumber, setDetailNumber] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [developing, setDeveloping] = useState(false)
  const [pendingSubtaskId, setPendingSubtaskId] = useState(null)
  const [removingSubtask, setRemovingSubtask] = useState(null)
  // Aparte del error global del tablero: ese bloque llama a refresh(), que
  // recargaria todas las tareas del proyecto por un fallo puntual de la IA.
  const [detailError, setDetailError] = useState('')
  const [notice, setNotice] = useState('')
  const originRef = useRef(null)
  const draggingTaskRef = useRef(null)

  // Buscar la tarea por id en cualquier columna
  function findTaskById(taskId) {
    for (const c of BOARD_COLUMNS) {
      const found = items[c.value].find((t) => t.id === taskId)
      if (found) return found
    }
    return null
  }

  useEffect(() => {
    setItems(groupTasks(tasks))
  }, [tasks])

  // El aviso de movimiento bloqueado se oculta solo
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4500)
    return () => clearTimeout(timer)
  }, [notice])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function findContainer(id) {
    if (Object.prototype.hasOwnProperty.call(items, id)) return id
    for (const c of BOARD_COLUMNS) {
      if (items[c.value].some((t) => t.id === id)) return c.value
    }
    return null
  }

  // Ningún movimiento puede entrar o salir de la columna virtual
  function isBlockedMove(from, to) {
    return from !== to && (from === UNASSIGNED || to === UNASSIGNED)
  }

  function handleDragStart(event) {
    originRef.current = findContainer(event.active.id)
    draggingTaskRef.current = findTaskById(event.active.id)
  }

  function handleDragOver(event) {
    const { active, over } = event
    const overId = over?.id
    if (!overId) return

    const from = originRef.current || findContainer(active.id)
    const to = findContainer(overId)
    if (!from || !to || from === to) return
    if (isBlockedMove(from, to)) return

    setItems((prev) => {
      const moved = prev[from].find((t) => t.id === active.id)
      if (!moved) return prev
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== active.id),
        [to]: [{ ...moved, status: to }, ...prev[to]],
      }
    })
  }

  const handleOpenDetail = (task) => {
    setDetailTask(task)
    setDetailNumber(task.taskNumber)
    setDetailLoading(true)
    setDetailError('')
    getTask(task.taskNumber)
      .then((data) => setDetailTask(data))
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false))
  }

  // Soltar fuera de una columna o cancelar con Escape: deshace la vista previa
  // que handleDragOver aplicó sobre items
  function handleDragCancel() {
    originRef.current = null
    draggingTaskRef.current = null
    setItems(groupTasks(tasks))
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    const overId = over?.id
    if (!overId) {
      handleDragCancel()
      return
    }

    const from = originRef.current || findContainer(active.id)
    const to = findContainer(overId)
    originRef.current = null
    if (!from || !to) return

    if (isBlockedMove(from, to)) {
      draggingTaskRef.current = null
      setNotice(from === UNASSIGNED ? MOVE_UNASSIGNED_MSG : DROP_UNASSIGNED_MSG)
      setItems(groupTasks(tasks))
      return
    }

    if (from === to) {
      setItems((prev) => {
        const col = [...prev[from]]
        const oldIndex = col.findIndex((t) => t.id === active.id)
        const newIndex = col.findIndex((t) => t.id === overId)
        if (oldIndex === -1 || newIndex === -1) return prev
        return { ...prev, [from]: arrayMove(col, oldIndex, newIndex) }
      })
      draggingTaskRef.current = null
      return
    }

    const task = draggingTaskRef.current || findTaskById(active.id)
    if (!task || task.status === to) return

    try {
      await moveTask(task.taskNumber, to)
    } catch (err) {
      setError(err.message)
      await refresh()
    } finally {
      draggingTaskRef.current = null
    }
  }

  // Replica el @RequireProjectRole(MEMBER, LEADER) del PATCH de tareas
  const canAssign = myRole === 'member' || myRole === 'leader'

  // Al asignar una tarea que estaba en "Sin asignar" arranca en Pendientes,
  // aunque su estado real fuera otro. La asignación ya quedó guardada, así
  // que un fallo aquí se muestra en el tablero en vez de relanzarse.
  async function sendToPendingIfNeeded(wasUnassigned, updated) {
    if (!wasUnassigned || !updated.assignee || updated.status === 'pending') return
    try {
      await moveTask(updated.taskNumber, 'pending')
    } catch (err) {
      setError(err.message)
    }
  }

  // Asignación rápida desde el badge de la tarjeta. Si el PATCH falla, el
  // error se relanza para que el popover lo muestre.
  async function handleQuickAssign(task, assigneeId) {
    const updated = await updateTask(task.taskNumber, { assigneeId })
    await sendToPendingIfNeeded(!task.assignee, updated)
  }

  const handleTaskSaved = async (payload) => {
    if (editingTask) {
      const wasUnassigned = !editingTask.assignee
      const updated = await updateTask(editingTask.taskNumber, payload)
      setEditingTask(null)
      await sendToPendingIfNeeded(wasUnassigned, updated)
      const fresh = await getTask(updated.taskNumber)
      setDetailTask(fresh)
    } else {
      await createTask(payload)
      setShowCreate(false)
    }
  }

  // Sin try/catch: si falla, ConfirmDialog muestra el error dentro del modal
  const handleDelete = async () => {
    await deleteTask(deletingTask.taskNumber)
    setDeletingTask(null)
    setDetailNumber(null)
    setDetailTask(null)
  }

  const handleCloseDetail = () => {
    setDetailNumber(null)
    setDetailTask(null)
    setDetailError('')
  }

  // detailTask es un estado independiente del array tasks (se puebla con un
  // getTask aparte al abrir el modal), asi que cada handler replica aqui el
  // cambio que el hook ya aplico en tasks, sin recargar la pagina.
  async function handleGenerateSubtasks() {
    if (!detailTask) return
    setGenerating(true)
    setDetailError('')
    try {
      const subtasks = await generateSubtasks(detailTask.taskNumber)
      setDetailTask((prev) => (prev ? { ...prev, subtasks } : prev))
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDevelop() {
    if (!detailTask) return
    setDeveloping(true)
    setDetailError('')
    try {
      const updated = await developTask(detailTask.taskNumber)
      setDetailTask(updated)
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setDeveloping(false)
    }
  }

  async function handleToggleSubtask(subtask) {
    if (!detailTask) return
    setPendingSubtaskId(subtask.id)
    setDetailError('')
    try {
      const updated = await updateSubtask(detailTask.taskNumber, subtask.id, {
        completed: !subtask.completed,
      })
      setDetailTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks || []).map((s) =>
                s.id === subtask.id
                  ? { ...s, title: updated.title, completed: updated.completed }
                  : s
              ),
            }
          : prev
      )
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setPendingSubtaskId(null)
    }
  }

  function handleRemoveSubtask(subtask) {
    if (!detailTask) return
    setRemovingSubtask(subtask)
  }

  // Si falla, el error se relanza para que ConfirmDialog lo muestre
  async function confirmRemoveSubtask() {
    const subtask = removingSubtask
    setPendingSubtaskId(subtask.id)
    setDetailError('')
    try {
      await deleteSubtask(detailTask.taskNumber, subtask.id)
      setDetailTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks || []).filter(
                (s) => s.id !== subtask.id
              ),
            }
          : prev
      )
      setRemovingSubtask(null)
    } finally {
      setPendingSubtaskId(null)
    }
  }

  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <p className="kanban-summary">
          {loading
            ? 'Cargando tareas…'
            : `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'} en el tablero`}
        </p>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nueva tarea
        </button>
      </div>

      {notice && (
        <div className="kanban-notice" role="status">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 3.2 17.4 16a.8.8 0 0 1-.7 1.2H3.3a.8.8 0 0 1-.7-1.2L10 3.2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M10 8v3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="14.2" r="0.95" fill="currentColor" />
          </svg>
          <p>{notice}</p>
          <button
            type="button"
            className="kanban-notice-close"
            onClick={() => setNotice('')}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="kanban-error">
          <p className="error">{error}</p>
          <button className="btn btn-sm" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="kanban-columns" aria-busy="true">
          {BOARD_COLUMNS.map((col) => (
            <div key={col.value} className="kanban-column is-loading">
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.label}</span>
              </div>
              <div className="kanban-task-list">
                <span className="skeleton kanban-skeleton-card" />
                <span className="skeleton kanban-skeleton-card short" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="kanban-columns">
            {BOARD_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.value}
                col={col}
                tasks={items[col.value] || []}
                wipLimit={project?.wipLimit}
                onTaskClick={handleOpenDetail}
                members={canAssign ? members : null}
                onQuickAssign={handleQuickAssign}
              />
            ))}
          </div>
        </DndContext>
      )}

      {detailNumber != null && (
        <TaskDetailModal
          task={detailTask}
          loading={detailLoading}
          myRole={myRole}
          error={detailError}
          generating={generating}
          developing={developing}
          pendingSubtaskId={pendingSubtaskId}
          onClose={handleCloseDetail}
          onEdit={() => setEditingTask(detailTask)}
          onDelete={() => setDeletingTask(detailTask)}
          onGenerateSubtasks={handleGenerateSubtasks}
          onDevelop={handleDevelop}
          onToggleSubtask={handleToggleSubtask}
          onRemoveSubtask={handleRemoveSubtask}
        />
      )}

      {editingTask && (
        <TaskFormModal
          initialData={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSave={handleTaskSaved}
        />
      )}

      {showCreate && (
        <TaskFormModal
          members={members}
          onClose={() => setShowCreate(false)}
          onSave={handleTaskSaved}
        />
      )}

      {deletingTask && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar tarea"
          message={
            <p>
              ¿Seguro que quieres eliminar la tarea{' '}
              <strong>
                #{deletingTask.taskNumber} · {deletingTask.title}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>
          }
          confirmText="Eliminar"
          onCancel={() => setDeletingTask(null)}
          onConfirm={handleDelete}
        />
      )}

      {removingSubtask && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar subtarea"
          message={<p>¿Eliminar la subtarea "{removingSubtask.title}"?</p>}
          confirmText="Eliminar"
          onCancel={() => setRemovingSubtask(null)}
          onConfirm={confirmRemoveSubtask}
        />
      )}
    </div>
  )
}