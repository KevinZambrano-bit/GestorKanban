export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-hero">
        <div className="auth-hero-brand">
          <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="1" y="1" width="5.5" height="18" rx="1.5" fill="currentColor" opacity="0.9" />
            <rect x="8.25" y="1" width="5.5" height="12" rx="1.5" fill="currentColor" opacity="0.55" />
            <rect x="15.5" y="1" width="3.5" height="8" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
          Gestor Kanban
        </div>

        <h1 className="auth-hero-title">
          Organiza el trabajo de tu equipo, tablero por tablero.
        </h1>
        <p className="auth-hero-sub">
          Proyectos, tareas y límites de trabajo en progreso, en un solo lugar.
        </p>

        <div className="mini-board" aria-hidden="true">
          <div className="mini-col">
            <span className="mini-col-title">Pendientes</span>
            <div className="mini-card" />
            <div className="mini-card mini-card-short" />
          </div>
          <div className="mini-col">
            <span className="mini-col-title">En progreso</span>
            <div className="mini-card mini-card-active" />
          </div>
          <div className="mini-col">
            <span className="mini-col-title">Hecho</span>
            <div className="mini-card mini-card-done" />
          </div>
        </div>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-form-card">
          <h2 className="auth-form-title">{title}</h2>
          {subtitle && <p className="auth-form-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}