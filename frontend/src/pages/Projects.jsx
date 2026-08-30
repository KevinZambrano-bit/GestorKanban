import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/projects')
      setProjects(Array.isArray(data) ? data : data.projects || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev])
    setShowCreate(false)
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1>Mis Proyectos</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nuevo Proyecto
        </button>
      </div>

      {loading && <p className="loading">Cargando proyectos...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="empty-state">
          <p>No tienes ningún proyecto todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Crea tu primer proyecto
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card-header">
                <h2>{project.name}</h2>
                <span className={`badge badge-${project.myRole}`}>
                  {project.myRole === 'leader' ? 'Líder' : 'Miembro'}
                </span>
              </div>
              {project.description && (
                <p className="project-card-desc">{project.description}</p>
              )}
              <div className="project-card-footer">
                {project.wipLimit && (
                  <span className="wip-tag">WIP: {project.wipLimit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

function CreateProjectModal({ onClose, onCreated, initialData, onSaved }) {
  const isEditing = !!initialData
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { name: name.trim(), description: description.trim(), isPublic }
      if (isEditing) {
        const updated = await api.patch(`/projects/${initialData.id}`, payload)
        onSaved(updated)
      } else {
        const created = await api.post('/projects', payload)
        onCreated(created)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Nombre *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Proyecto público
          </label>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { CreateProjectModal }
