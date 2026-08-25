const API_URL = import.meta.env.VITE_API_URL

function getToken() {
  return localStorage.getItem('token')
}

function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

async function request(endpoint, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

const api = {
  get: (endpoint) => request(endpoint),

  post: (endpoint, data) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(data) }),

  put: (endpoint, data) =>
    request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),

  patch: (endpoint, data) =>
    request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}

export default api
