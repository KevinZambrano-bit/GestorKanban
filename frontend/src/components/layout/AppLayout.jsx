import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}