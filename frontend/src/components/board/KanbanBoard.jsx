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
import useTasks, { TASK_STATUSES } from '../../hooks/useTasks'
import KanbanColumn from './KanbanColumn'
import TaskFormModal from './TaskFormModal'
import TaskDetailModal from './TaskDetailModal'
import DeleteTaskConfirm from './DeleteTaskConfirm'

function emptyGroups() {
  const groups = {}
  TASK_STATUSES.forEach((s) => {
    groups[s.value] = []
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
  } = useTasks(projectId)

  const [items, setItems] = useState(emptyGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [detailNumber, setDetailNumber] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const originRef = useRef(null)
  const draggingTaskRef = useRef(null)

  // Buscar la tarea por id en cualquier columna
  function findTaskById(taskId) {
    for (const s of TASK_STATUSES) {
      const found = items[s.value].find((t) => t.id === taskId)
      if (found) return found
    }
    return null
  }

  useEffect(() => {
    const next = emptyGroups()
    tasks.forEach((t) => {
      if (next[t.status]) next[t.status].push(t)
    })
    setItems(next)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function findContainer(id) {
    if (Object.prototype.hasOwnProperty.call(items, id)) return id
    for (const s of TASK_STATUSES) {
      if (items[s.value].some((t) => t.id === id)) return s.value
    }
    return null
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
    getTask(task.taskNumber)
      .then((data) => setDetailTask(data))
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false))
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    const overId = over?.id
    if (!overId) return

    const from = originRef.current || findContainer(active.id)
    const to = findContainer(overId)
    originRef.current = null
    if (!from || !to) return

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

  const handleTaskSaved = async (payload) => {
    if (editingTask) {
      const updated = await updateTask(editingTask.taskNumber, payload)
      setEditingTask(null)
      const fresh = await getTask(updated.taskNumber)
      setDetailTask(fresh)
    } else {
      await createTask(payload)
      setShowCreate(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTask(deletingTask.taskNumber)
      setDeletingTask(null)
      setDetailNumber(null)
      setDetailTask(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCloseDetail = () => {
    setDetailNumber(null)
    setDetailTask(null)
  }

  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <span className="kanban-wip-total">
          Límite WIP: {project?.wipLimit ?? '-'}
        </span>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nueva tarea
        </button>
      </div>

      {error && (
        <div className="kanban-error">
          <p className="error">{error}</p>
          <button className="btn btn-sm" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}

      {loading && <p className="loading">Cargando tareas...</p>}

      {!loading && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-columns">
            {TASK_STATUSES.map((col) => (
              <KanbanColumn
                key={col.value}
                col={col}
                tasks={items[col.value] || []}
                wipLimit={project?.wipLimit}
                onTaskClick={handleOpenDetail}
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
          onClose={handleCloseDetail}
          onEdit={() => setEditingTask(detailTask)}
          onDelete={() => setDeletingTask(detailTask)}
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
        <DeleteTaskConfirm
          task={deletingTask}
          onCancel={() => setDeletingTask(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}