import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API_URL } from '../services/api'
import { server } from '../test/server'
import useTasks from './useTasks'

const TASKS_URL = `${API_URL}/projects/1/tasks`

const TASK = {
  id: 10,
  taskNumber: 1,
  title: 'Diseñar login',
  status: 'pending',
  subtasks: [
    { id: 100, title: 'Wireframe', completed: false },
    { id: 101, title: 'Mockup', completed: false },
  ],
}

describe('Hook useTasks', () => {
  it('actualiza solo título y estado de una subtarea y elimina otra sin recargar', async () => {
    server.use(
      http.get(TASKS_URL, () => HttpResponse.json([TASK])),
      http.patch(`${TASKS_URL}/1/subtasks/100`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({
          id: 100,
          title: 'Wireframe',
          completed: body.completed,
          task: { id: 10 },
        })
      }),
      http.delete(`${TASKS_URL}/1/subtasks/101`, () => new HttpResponse(null, { status: 204 }))
    )

    const { result } = renderHook(() => useTasks(1))

    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    await act(async () => {
      await result.current.updateSubtask(1, 100, { completed: true })
    })

    expect(result.current.tasks[0].subtasks[0]).toEqual({
      id: 100,
      title: 'Wireframe',
      completed: true,
    })

    await act(async () => {
      await result.current.deleteSubtask(1, 101)
    })

    expect(result.current.tasks[0].subtasks.map((s) => s.id)).toEqual([100])
  })
})
