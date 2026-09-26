import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { getAvatarUrl } from '../../utils/avatar'

export default function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="1" y="1" width="5.5" height="18" rx="1.5" fill="currentColor" opacity="0.9" />
          <rect x="8.25" y="1" width="5.5" height="12" rx="1.5" fill="currentColor" opacity="0.55" />
          <rect x="15.5" y="1" width="3.5" height="8" rx="1.5" fill="currentColor" opacity="0.3" />
        </svg>
        Gestor Kanban
      </Link>

      <nav className="app-nav">
        <Link to="/projects" className="app-nav-link">Proyectos</Link>
      </nav>

      <div className="app-user">
        <img src={getAvatarUrl(user?.email)} alt={user?.name} className="avatar-sm" />
        <span className="app-user-name">{user?.name || user?.email}</span>
        <button className="btn btn-sm" onClick={handleLogout}>Salir</button>
      </div>
    </header>
  )
}