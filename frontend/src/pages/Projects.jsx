import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import { getAvatarUrl } from "../utils/avatar";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "leader", label: "Lidero" },
  { value: "member", label: "Soy miembro" },
];

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/projects");
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // POST /projects devuelve el proyecto sin el resumen de la lista; uno recién
  // creado tiene como único miembro (líder) a su creador y ninguna tarea, así
  // que se completa aquí sin volver a pedir la lista.
  const handleCreated = (newProject) => {
    setProjects((prev) => [
      {
        ...newProject,
        myRole: "leader",
        memberCount: 1,
        members: user
          ? [{ id: user.id, name: user.name, email: user.email, role: "leader" }]
          : [],
        taskCounts: { pending: 0, in_progress: 0, done: 0, total: 0 },
      },
      ...prev,
    ]);
    setShowCreate(false);
  };

  const counts = useMemo(() => {
    const leader = projects.filter((p) => p.myRole === "leader").length;
    return { all: projects.length, leader, member: projects.length - leader };
  }, [projects]);

  const visible = useMemo(
    () =>
      projects
        .filter((p) => filter === "all" || p.myRole === filter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, filter],
  );

  const hasProjects = !loading && !error && projects.length > 0;

  return (
    <div className="projects-page">
      <button className="btn btn-back" onClick={() => navigate("/")}>
        ← Volver al dashboard
      </button>

      <header className="projects-header">
        <div>
          <h1>Mis proyectos</h1>
          {hasProjects && (
            <p className="projects-sub">
              Participas en {counts.all}{" "}
              {counts.all === 1 ? "proyecto" : "proyectos"}
              {counts.leader > 0 && ` y lideras ${counts.leader}`}.
            </p>
          )}
        </div>
        {hasProjects && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Nuevo proyecto
          </button>
        )}
      </header>

      {hasProjects && counts.leader > 0 && counts.member > 0 && (
        <div className="projects-filter" role="group" aria-label="Filtrar por rol">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              className={`projects-filter-btn ${filter === f.value ? "is-active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              <span className="projects-filter-count">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="projects-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="project-card project-card-skeleton">
              <span className="skeleton skeleton-title" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line short" />
              <span className="skeleton project-skeleton-bar" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="projects-error" role="alert">
          <p className="error">No se pudieron cargar tus proyectos: {error}</p>
          <button className="btn" onClick={fetchProjects}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="projects-empty">
          <svg width="88" height="64" viewBox="0 0 88 64" aria-hidden="true">
            <rect x="2" y="2" width="24" height="60" rx="5" className="projects-empty-col" />
            <rect x="32" y="2" width="24" height="42" rx="5" className="projects-empty-col" />
            <rect x="62" y="2" width="24" height="24" rx="5" className="projects-empty-col" />
            <rect x="7" y="8" width="14" height="8" rx="2" className="projects-empty-card" />
            <rect x="37" y="8" width="14" height="8" rx="2" className="projects-empty-card" />
          </svg>
          <h2>Todavía no tienes proyectos</h2>
          <p>
            Crea un proyecto para organizar tareas en un tablero Kanban e
            invitar a tu equipo. Si alguien te invita a uno, aparecerá aquí.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            Crear mi primer proyecto
          </button>
        </div>
      )}

      {hasProjects && (
        <ul className="projects-grid">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
          {filter !== "member" && (
            <li>
              <button
                type="button"
                className="project-card project-card-new"
                onClick={() => setShowCreate(true)}
              >
                <span className="project-card-new-icon" aria-hidden="true">
                  +
                </span>
                Nuevo proyecto
              </button>
            </li>
          )}
        </ul>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function ProjectCard({ project }) {
  const isLeader = project.myRole === "leader";
  const members = project.members || [];
  const memberCount = project.memberCount ?? members.length;
  const extraMembers = memberCount - members.length;

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`project-card ${isLeader ? "is-leader" : ""}`}
    >
      <div className="project-card-header">
        <h2>{project.name}</h2>
        <span className={`badge badge-${project.myRole}`}>
          {isLeader ? "Líder" : "Miembro"}
        </span>
      </div>

      <p className={`project-card-desc ${project.description ? "" : "is-empty"}`}>
        {project.description || "Sin descripción"}
      </p>

      {project.taskCounts && <TaskProgress counts={project.taskCounts} />}

      <div className="project-card-footer">
        <div
          className="project-members"
          title={members.map((m) => m.name).join(", ")}
        >
          {members.length > 0 && (
            <span className="avatar-stack" aria-hidden="true">
              {members.map((m) => (
                <img
                  key={m.id}
                  src={getAvatarUrl(m.email)}
                  alt=""
                  width="24"
                  height="24"
                />
              ))}
              {extraMembers > 0 && (
                <span className="avatar-stack-more">+{extraMembers}</span>
              )}
            </span>
          )}
          <span>
            {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
          </span>
        </div>

        <div className="project-tags">
          {project.wipLimit != null && (
            <span className="project-tag" title="Límite de tareas en progreso">
              WIP {project.wipLimit}
            </span>
          )}
          <span className="project-tag">
            {project.isPublic ? <GlobeIcon /> : <LockIcon />}
            {project.isPublic ? "Público" : "Privado"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TaskProgress({ counts }) {
  const { total = 0, done = 0, pending = 0, in_progress: inProgress = 0 } = counts;

  if (total === 0) {
    return (
      <div className="project-progress is-empty">
        <div className="project-progress-track" />
        <span className="project-progress-label">Sin tareas todavía</span>
      </div>
    );
  }

  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className="project-progress">
      <div
        className="project-progress-track"
        role="img"
        aria-label={`${done} completadas, ${inProgress} en progreso y ${pending} pendientes`}
      >
        <span className="project-progress-done" style={{ width: pct(done) }} />
        <span className="project-progress-doing" style={{ width: pct(inProgress) }} />
      </div>
      <span className="project-progress-label">
        {done} de {total} {total === 1 ? "tarea completada" : "tareas completadas"}
        {inProgress > 0 && `, ${inProgress} en progreso`}
      </span>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1.8 8h12.4M8 1.7c1.8 1.8 2.6 4 2.6 6.3S9.8 12.5 8 14.3M8 1.7C6.2 3.5 5.4 5.7 5.4 8s.8 4.5 2.6 6.3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CreateProjectModal({ onClose, onCreated, initialData, onSaved }) {
  const isEditing = !!initialData;
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        isPublic,
      };
      if (isEditing) {
        const updated = await api.patch(`/projects/${initialData.id}`, payload);
        onSaved(updated);
      } else {
        const created = await api.post("/projects", payload);
        onCreated(created);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? "Editar Proyecto" : "Nuevo Proyecto"}</h2>
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
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CreateProjectModal };
