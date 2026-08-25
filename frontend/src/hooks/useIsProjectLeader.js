import { useMemo } from 'react'
import useAuth from './useAuth'

export function getProjectMemberRole(project, userId) {
  if (!project || !userId) return null
  if (project.myRole) return project.myRole.toLowerCase()

  const membership = project.members?.find((member) => {
    const memberUserId = member.user?.id ?? member.id
    return Number(memberUserId) === Number(userId)
  })

  return membership?.role?.toLowerCase() || null
}

export default function useIsProjectLeader(project) {
  const { user } = useAuth()
  return useMemo(
    () => getProjectMemberRole(project, user?.id) === 'leader',
    [project, user?.id],
  )
}