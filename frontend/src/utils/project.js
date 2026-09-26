export function isLeader(project, currentUserId) {
  if (!project?.members || !currentUserId) return false
  return project.members.some(
    (m) => m.user?.id === currentUserId && m.role === 'leader'
  )
}

export function getMyRole(project, currentUserId) {
  if (!project?.members || !currentUserId) return null
  const membership = project.members.find(
    (m) => m.user?.id === currentUserId
  )
  return membership?.role || null
}
