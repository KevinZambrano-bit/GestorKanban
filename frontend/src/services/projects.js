import api from './api'

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (projectId) => api.get(`/projects/${projectId}`),
  create: (payload) => api.post('/projects', payload),
  update: (projectId, payload) => api.patch(`/projects/${projectId}`, payload),
  remove: (projectId) => api.delete(`/projects/${projectId}`),
  members: (projectId) => api.get(`/projects/${projectId}/members`),
  inviteMember: (projectId, payload) => api.post(`/projects/${projectId}/members`, payload),
  removeMember: (projectId, memberId) => api.delete(`/projects/${projectId}/members/${memberId}`),
  updateWip: (projectId, wipLimit) => api.patch(`/projects/${projectId}/wip`, { wipLimit }),
}