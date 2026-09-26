import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="dashboard-page">
      <p className="dashboard-eyebrow">Hola de nuevo</p>
      <h1>{user?.name || user?.email}</h1>
      <p className="dashboard-sub">Tus proyectos y tableros te esperan.</p>
      <Link to="/projects" className="btn btn-primary dashboard-cta">
        Ver mis proyectos
      </Link>
    </div>
  )
}