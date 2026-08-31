import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Completadas' },
]

export default function useTasks(projectId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.get(`/projects/${projectId}/tasks`)
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createTask = async (payload) => {
    const created = await api.post(`/projects/${projectId}/tasks`, payload)
    setTasks((prev) => [...prev, created])
    return created
  }

  const getTask = (taskNumber) =>
    api.get(`/projects/${projectId}/tasks/${taskNumber}`)

  const updateTask = async (taskNumber, payload) => {
    const updated = await api.patch(
      `/projects/${projectId}/tasks/${taskNumber}`,
      payload
    )
    setTasks((prev) =>
      prev.map((t) => (t.taskNumber === taskNumber ? updated : t))
    )
    return updated
  }

  const moveTask = async (taskNumber, status) => {
    const updated = await api.patch(
      `/projects/${projectId}/tasks/${taskNumber}/move`,
      { status }
    )
    setTasks((prev) =>
      prev.map((t) => (t.taskNumber === taskNumber ? updated : t))
    )
    return updated
  }

  const deleteTask = async (taskNumber) => {
    await api.delete(`/projects/${projectId}/tasks/${taskNumber}`)
    setTasks((prev) => prev.filter((t) => t.taskNumber !== taskNumber))
  }

  return {
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
  }
}