import { expect, it } from 'vitest'
import { getMyRole } from './project'

it('getMyRole obtiene el rol del usuario y devuelve null si no hay membresía', () => {
  const project = {
    members: [
      { user: { id: 1 }, role: 'leader' },
      { user: { id: 2 }, role: 'member' },
    ],
  }

  expect(getMyRole(project, 1)).toBe('leader')
  expect(getMyRole(project, 2)).toBe('member')

  expect(getMyRole(project, 99)).toBeNull()
  expect(getMyRole(project, undefined)).toBeNull()
  // Mientras el proyecto carga, ProjectDetail llama con null o sin members
  expect(getMyRole(null, 1)).toBeNull()
  expect(getMyRole({}, 1)).toBeNull()
})
