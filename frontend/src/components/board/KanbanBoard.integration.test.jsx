import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { API_URL } from '../../services/api'
import { server } from '../../test/server'
import KanbanBoard from './KanbanBoard'

const TASKS_URL = `${API_URL}/projects/1/tasks`

const ANA = { id: 2, name: 'Ana Ruiz', email: 'ana@correo.com', role: 'member' }
const LUIS = { id: 3, name: 'Luis Díaz', email: 'luis@correo.com', role: 'leader' }

// El estado real es in_progress: la columna se decide por no tener responsable
const UNASSIGNED_TASK = {
  id: 10,
  taskNumber: 1,
  title: 'Diseñar login',
  status: 'in_progress',
  assignee: null,
}
const ASSIGNED_TASK = {
  id: 11,
  taskNumber: 2,
  title: 'Crear API',
  status: 'done',
  assignee: LUIS,
}

const column = (name) => within(screen.getByRole('region', { name }))

it('agrupa las tareas por columna y la asignación rápida envía la tarea a Pendientes', async () => {
  const patches = []

  server.use(
    http.get(TASKS_URL, () => HttpResponse.json([UNASSIGNED_TASK, ASSIGNED_TASK])),
    http.patch(`${TASKS_URL}/1`, async ({ request }) => {
      patches.push({ url: 'assign', body: await request.json() })
      return HttpResponse.json({ ...UNASSIGNED_TASK, assignee: ANA })
    }),
    http.patch(`${TASKS_URL}/1/move`, async ({ request }) => {
      patches.push({ url: 'move', body: await request.json() })
      return HttpResponse.json({ ...UNASSIGNED_TASK, assignee: ANA, status: 'pending' })
    })
  )

  render(<KanbanBoard projectId={1} project={{}} members={[ANA, LUIS]} myRole="leader" />)

  expect(await screen.findByText('2 tareas en el tablero')).toBeInTheDocument()
  // Las columnas se llenan en un efecto, un commit después del resumen
  expect(await column('Sin asignar').findByText('Diseñar login')).toBeInTheDocument()
  expect(column('Completadas').getByText('Crear API')).toBeInTheDocument()
  expect(column('Pendientes').getByText('No hay tareas pendientes')).toBeInTheDocument()

  const user = userEvent.setup()
  await user.click(
    screen.getByRole('button', { name: 'Asignar responsable a "Diseñar login"' })
  )
  const popover = screen.getByRole('dialog', { name: 'Elegir responsable' })
  await user.click(within(popover).getByRole('button', { name: /Ana Ruiz/ }))

  expect(await column('Pendientes').findByText('Diseñar login')).toBeInTheDocument()
  expect(column('Pendientes').getByText('Ana Ruiz')).toBeInTheDocument()
  expect(
    column('Sin asignar').getByText('Todas las tareas tienen responsable')
  ).toBeInTheDocument()
  expect(column('En progreso').queryByText('Diseñar login')).not.toBeInTheDocument()

  expect(patches).toEqual([
    { url: 'assign', body: { assigneeId: ANA.id } },
    { url: 'move', body: { status: 'pending' } },
  ])
})
