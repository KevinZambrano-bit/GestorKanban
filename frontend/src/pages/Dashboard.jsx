import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import ProjectForm from '../components/ProjectForm'
import { projectsApi } from '../services/projects'

export default function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function loadProjects() {
    setLoading(true)
    setError('')
    try {
      setProjects(await projectsApi.list())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])

  async function createProject(payload) {
    setSaving(true)
    setSaveError('')
    try {
      const project = await projectsApi.create(payload)
      setShowCreate(false)
      navigate(`/projects/${project.id}`)
    } catch (requestError) {
      setSaveError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="page"><p className="status">Cargando proyectos...</p></main>
  if (error) return <main className="page"><div className="feedback error">{error}</div><button className="button" onClick={loadProjects}>Reintentar</button></main>

  return (
    <main className="page">
      <header className="page-header"><div><p className="eyebrow">Espacio de trabajo</p><h1>Mis proyectos</h1><p className="subtitle">Organiza el trabajo que importa.</p></div><button className="button" onClick={() => { setSaveError(''); setShowCreate(true) }}>+ Nuevo proyecto</button></header>
      {!projects.length ? <section className="empty-state"><h2>Aún no tienes proyectos</h2><p>Crea el primero y empieza a convertir ideas en tareas.</p><button className="button" onClick={() => setShowCreate(true)}>Crear proyecto</button></section> : <section className="project-grid">{projects.map((project) => <article className="project-card" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}><div className="card-top"><span className="project-mark">{project.name?.slice(0, 1).toUpperCase()}</span><span className={`role-badge ${project.myRole}`}>{project.myRole === 'leader' ? 'Líder' : 'Miembro'}</span></div><h2>{project.name}</h2><p>{project.description || 'Sin descripción todavía.'}</p><div className="card-meta"><span>WIP {project.wipLimit}</span><span>{project.isPublic ? 'Público' : 'Privado'}</span></div></article>)}</section>}
      {showCreate && <Modal title="Nuevo proyecto" onClose={() => setShowCreate(false)}><ProjectForm saving={saving} error={saveError} onSubmit={createProject} onCancel={() => setShowCreate(false)} /></Modal>}
    </main>
  )
}
