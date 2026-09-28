import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import { getAvatarUrl } from '../utils/avatar'
import { CreateProjectModal } from './Projects'

const RECENT_LIMIT = 6

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

function timeAgo(dateString) {
  if (!dateString) return null
  const diffSeconds = (new Date(dateString).getTime() - Date.now()) / 1000
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return 'hace un momento'
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function summaryLine(total, leading) {
  if (total === 0) return 'Aún no participas en ningún proyecto.'
  const projects = total === 1 ? '1 proyecto' : `${total} proyectos`
  if (leading === 0) return `Participas en ${projects} como miembro.`
  return `Participas en ${projects} y lideras ${leading}.`
}

export default function Dashboard() {
  const { user } = useAuth()
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

  const stats = useMemo(() => {
    const leading = projects.filter((p) => p.myRole === 'leader').length
    return {
      total: projects.length,
      leading,
      member: projects.length - leading,
      public: projects.filter((p) => p.isPublic).length,
    }
  }, [projects])

  const recent = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, RECENT_LIMIT),
    [projects]
  )

  const handleCreated = (newProject) => {
    setShowCreate(false)
    navigate(`/projects/${newProject.id}`)
  }

  const firstName = (user?.name || '').split(' ')[0] || user?.email

  return (
    <div className="dashboard-page">
      <header className="dash-hero">
        <img
          src={getAvatarUrl(user?.email)}
          alt=""
          className="dash-avatar"
          width="56"
          height="56"
        />
        <div className="dash-hero-text">
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p className="dash-hero-sub">
            {loading
              ? 'Cargando tu resumen…'
              : error
                ? 'No pudimos cargar tu resumen.'
                : summaryLine(stats.total, stats.leading)}
          </p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Nuevo proyecto
          </button>
          <Link to="/projects" className="btn dash-link-btn">
            Ver todos los proyectos
          </Link>
        </div>
      </header>

      {error ? (
        <div className="dash-error" role="alert">
          <p className="error">No se pudieron cargar tus proyectos: {error}</p>
          <button className="btn" onClick={fetchProjects}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section className="dash-stats" aria-label="Resumen">
            <StatCell label="Mis proyectos" value={stats.total} loading={loading} />
            <StatCell label="Lidero" value={stats.leading} loading={loading} />
            <StatCell label="Soy miembro" value={stats.member} loading={loading} />
            <StatCell label="Públicos" value={stats.public} loading={loading} />
            {!loading && stats.total > 0 && (
              <RoleBar leading={stats.leading} total={stats.total} />
            )}
          </section>

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>Proyectos recientes</h2>
              {!loading && stats.total > RECENT_LIMIT && (
                <Link to="/projects" className="dash-more">
                  Ver los {stats.total}
                </Link>
              )}
            </div>

            {loading ? (
              <div className="dash-grid" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="dash-card dash-card-skeleton">
                    <span className="skeleton skeleton-title" />
                    <span className="skeleton skeleton-line" />
                    <span className="skeleton skeleton-line short" />
                  </div>
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyProjects onCreate={() => setShowCreate(true)} />
            ) : (
              <ul className="dash-grid">
                {recent.map((project) => (
                  <li key={project.id}>
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
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

function StatCell({ label, value, loading }) {
  return (
    <div className="dash-stat">
      {loading ? (
        <span className="skeleton skeleton-number" />
      ) : (
        <span className="dash-stat-value">{value}</span>
      )}
      <span className="dash-stat-label">{label}</span>
    </div>
  )
}

function RoleBar({ leading, total }) {
  const pct = Math.round((leading / total) * 100)
  return (
    <div className="dash-rolebar">
      <div
        className="dash-rolebar-track"
        role="img"
        aria-label={`Lideras ${leading} de ${total} proyectos`}
      >
        <span className="dash-rolebar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="dash-rolebar-caption">
        Lideras el {pct}% de tus proyectos
      </span>
    </div>
  )
}

function ProjectCard({ project }) {
  const isLeader = project.myRole === 'leader'
  const created = timeAgo(project.createdAt)

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`dash-card ${isLeader ? 'is-leader' : ''}`}
    >
      <div className="dash-card-head">
        <h3>{project.name}</h3>
        <span className={`badge badge-${project.myRole}`}>
          {isLeader ? 'Líder' : 'Miembro'}
        </span>
      </div>
      <p className={`dash-card-desc ${project.description ? '' : 'is-empty'}`}>
        {project.description || 'Sin descripción'}
      </p>
      <div className="dash-card-meta">
        {created && <span>Creado {created}</span>}
        <span>{project.isPublic ? 'Público' : 'Privado'}</span>
        {project.wipLimit != null && <span>WIP {project.wipLimit}</span>}
      </div>
    </Link>
  )
}

function EmptyProjects({ onCreate }) {
  return (
    <div className="dash-empty">
      <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true">
        <rect x="2" y="2" width="18" height="44" rx="4" className="dash-empty-col" />
        <rect x="23" y="2" width="18" height="30" rx="4" className="dash-empty-col" />
        <rect x="44" y="2" width="18" height="18" rx="4" className="dash-empty-col" />
      </svg>
      <h3>Tu tablero está en blanco</h3>
      <p>
        Crea un proyecto para empezar a organizar tareas, o pide a un líder que te
        invite a uno existente.
      </p>
      <button className="btn btn-primary" onClick={onCreate}>
        Crear mi primer proyecto
      </button>
    </div>
  )
}
