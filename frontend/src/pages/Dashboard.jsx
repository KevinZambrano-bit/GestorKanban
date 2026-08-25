import useAuth from '../hooks/useAuth'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.name || user?.email}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}
