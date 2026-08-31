import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.name || user?.email}</p>
      <div className="dashboard-actions">
        <Link to="/projects" className="btn btn-primary">
          Ver mis proyectos
        </Link>
        <button className="btn" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
