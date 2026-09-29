import { Link } from 'react-router-dom'
import './Landing.css'

const AV = ['#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#64748b']

const COLUMNS = [
  { name: 'Pendientes', count: 5, tasks: [
    { t: 'Definir alcance del sprint', p: 'Alta', pr: 10, d: '12 oct', a: ['AM', 'LR'] },
    { t: 'Diseñar flujo de registro', p: 'Media', pr: 25, d: '14 oct', a: ['SP'] },
    { t: 'Revisar permisos por rol', p: 'Alta', pr: 0, d: '15 oct', a: ['JG', 'AM', 'CT'] },
    { t: 'Documentar la API', p: 'Baja', pr: 5, d: '18 oct', a: ['LR'] },
    { t: 'Plan de pruebas de carga', p: 'Media', pr: 0, d: '20 oct', a: ['CT', 'SP'] },
  ] },
  { name: 'En progreso', count: '3/3', wip: true, tasks: [
    { t: 'Tablero con arrastrar y soltar', p: 'Alta', pr: 72, d: '10 oct', a: ['AM', 'JG'] },
    { t: 'Subtareas generadas con IA', p: 'Alta', pr: 48, d: '11 oct', a: ['SP', 'LR', 'CT'] },
    { t: 'Límites WIP por columna', p: 'Media', pr: 86, d: '09 oct', a: ['JG'] },
    { t: 'Notificaciones del equipo', p: 'Baja', pr: 33, d: '13 oct', a: ['LR', 'AM'] },
  ] },
  { name: 'Hecho', count: 4, tasks: [
    { t: 'Autenticación con Google', p: 'Alta', pr: 100, d: '02 oct', a: ['CT', 'AM'] },
    { t: 'Panel de administración', p: 'Media', pr: 100, d: '04 oct', a: ['JG'] },
    { t: 'Perfil de usuario', p: 'Baja', pr: 100, d: '05 oct', a: ['SP', 'LR'] },
  ] },
]

const AVC = Object.fromEntries(['AM', 'LR', 'SP', 'JG', 'CT'].map((k, i) => [k, AV[i]]))

const FEATURES = [
  { title: 'Tableros con arrastrar y soltar', text: 'Mueve cada tarea entre columnas con un gesto y ve en qué punto está el proyecto, sin reuniones de seguimiento.',
    icon: <><rect x="3" y="4" width="7" height="16" rx="2" /><rect x="14" y="4" width="7" height="8" rx="2" /><path d="M17.5 15v5m0 0-2-2m2 2 2-2" /></> },
  { title: 'Trabajo en equipo con roles', text: 'Invita a tu equipo y separa quién administra cada proyecto de quién colabora en sus tareas.',
    icon: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><circle cx="12" cy="10" r="2.2" /><path d="M8.500 16c.5-1.800 2-2.700 3.5-2.700s3 .9 3.5 2.700" /></> },
  { title: 'Subtareas generadas con IA', text: 'Describe la tarea y la IA propone los pasos para completarla. Tú revisas, editas y sigues avanzando.',
    icon: <><path d="M9.500 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2.5 4.500A3 3 0 0 0 12 18V6a2.5 2.5 0 0 0-2.5-2z" /><path d="M14.500 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2.5 4.500A3 3 0 0 1 12 18" /><path d="M19 1.5l.6 1.5 1.5.6-1.5.6L19 5.700l-.6-1.5-1.5-.6 1.5-.6z" /></> },
  { title: 'Límites de trabajo en progreso', text: 'Fija cuántas tareas caben en "En progreso" y termina lo empezado antes de abrir algo nuevo.',
    icon: <><path d="M4 4h16l-6 8v7l-4 2v-9L4 4z" /><path d="M7 7.5h10" /></> },
]

function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="18" rx="1.5" fill="#fff" />
      <rect x="8.25" y="1" width="5.5" height="12" rx="1.5" fill="#A855F7" />
      <rect x="15.5" y="1" width="3.5" height="8" rx="1.5" fill="#A855F7" opacity=".55" />
    </svg>
  )
}

const stroke = { fill: 'none', stroke: 'url(#lp-g)', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ln = { fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', stroke: 'currentColor' }

export default function Landing() {
  return (
    <div className="lp">
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="lp-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9d5ff" /><stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link to="/" className="lp-brand" aria-label="Gestor Kanban, inicio">
            <Logo />Gestor <span>Kanban</span>
          </Link>
          <nav className="lp-nav-r" aria-label="Acceso">
            <Link to="/login" className="lp-textlink">Iniciar sesión</Link>
            <Link to="/register" className="lp-btn lp-btn-solid lp-btn-sm">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-l">
            <div className="lp-hero-copy">
              <h1>Organiza tu equipo, tablero por tablero.</h1>
              <p className="lp-tag">Tu equipo avanza cuando el progreso se ve.</p>
              <p className="lp-desc">Simplifica la gestión de proyectos, delega responsabilidades y elimina cuellos de botella en tableros compartidos de alto rendimiento.</p>
              <div className="lp-cta">
                <Link to="/login" className="lp-btn lp-btn-solid lp-btn-lg">Iniciar sesión</Link>
                <Link to="/register" className="lp-btn lp-btn-ghost lp-btn-lg">Crear cuenta</Link>
              </div>
            </div>
          </div>

          <div className="lp-hero-r">
            <div className="lp-panel" role="img" aria-label="Vista del tablero Kanban del producto con tres columnas de tareas">
              <div className="lp-app-bar">
                <i /><i /><i /><b>Lanzamiento v2 · Tablero</b>
                <span className="lp-app-av">{['AM', 'LR', 'SP', 'JG'].map((k) => <em key={k} style={{ background: AVC[k] }}>{k}</em>)}</span>
              </div>
              <div className="lp-board">
                {COLUMNS.map((c) => (
                  <div className={`lp-col${c.wip ? ' lp-col-wip' : ''}`} key={c.name}>
                    <div className="lp-col-h"><span>{c.name}</span><b>{c.count}</b></div>
                    {c.tasks.map((k) => (
                      <div className="lp-task" key={k.t}>
                        <div className="lp-task-top"><span className={`lp-pri lp-pri-${k.p}`}>{k.p}</span><small>{k.d}</small></div>
                        <p>{k.t}</p>
                        <div className="lp-bar"><i style={{ width: `${k.pr}%` }} /></div>
                        <div className="lp-task-bot">
                          <span className="lp-app-av">{k.a.map((x) => <em key={x} style={{ background: AVC[x] }}>{x}</em>)}</span>
                          <small>{k.pr}%</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lp-feat" aria-labelledby="lp-ft">
          <div className="lp-wrap">
            <h2 id="lp-ft">Todo lo que tu equipo necesita para no perder el hilo</h2>
            <p className="lp-feat-sub">Cuatro ideas simples que convierten un tablero en una forma de trabajar.</p>
            <ul className="lp-grid">
              {FEATURES.map((f) => (
                <li className="lp-fcard" key={f.title}>
                  <span className="lp-ico"><svg width="30" height="30" viewBox="0 0 24 24" {...stroke}>{f.icon}</svg></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <Link to="/" className="lp-brand" aria-label="Gestor Kanban, inicio"><Logo size={26} />Gestor <span>Kanban</span></Link>
          <ul className="lp-links">
            <li><a href="#"><svg width="16" height="16" viewBox="0 0 24 24" {...ln}><circle cx="12" cy="12" r="9" /><path d="M9.500 9.500a2.5 2.5 0 1 1 3.5 2.300c-.6.300-1 .8-1 1.5M12 17h.01" /></svg>Soporte</a></li>
            <li><a href="#"><svg width="16" height="16" viewBox="0 0 24 24" {...ln}><path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7zM17 7l-3 7a3 3 0 0 0 6 0l-3-7z" /></svg>Aviso legal</a></li>
            <li><a href="#"><svg width="16" height="16" viewBox="0 0 24 24" {...ln}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>Privacidad</a></li>
          </ul>
          <p className="lp-copy">© 2026 Gestor Kanban. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
