import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import { getMyRole } from "../utils/project";
import { CreateProjectModal } from "./Projects";
import KanbanBoard from "../components/board/KanbanBoard";
import RequireProjectRole from "../components/RequireProjectRole";
import { getAvatarUrl } from "../utils/avatar";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("board");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/projects/${id}`);
      setProject(data);
      if (data.members) {
        setMembers(
          data.members.map((m) => ({
            id: m.user?.id || m.id,
            name: m.user?.name || m.name,
            email: m.user?.email || m.email,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.get(`/projects/${id}/members`);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  const myRole = getMyRole(project, user?.id);

  // Si falla, ConfirmDialog muestra el error dentro del modal
  const handleDelete = async () => {
    await api.delete(`/projects/${id}`);
    navigate("/projects", { replace: true });
  };

  const handleSaved = (updated) => {
    setProject(updated);
    setEditing(false);
    fetchMembers();
  };

  if (loading) return <p className="loading">Cargando proyecto...</p>;
  if (error && !project) return <p className="error">{error}</p>;
  if (!project) return <p className="error">Proyecto no encontrado</p>;

  return (
    <div className="project-detail-page">
      <button className="btn btn-back" onClick={() => navigate("/projects")}>
        ← Volver a proyectos
      </button>

      <div className="project-detail-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && (
            <p className="project-detail-desc">{project.description}</p>
          )}
        </div>
        <RequireProjectRole role={myRole} allowed={["leader"]}>
          <div className="project-detail-actions">
            <button className="btn" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Eliminar
            </button>
          </div>
        </RequireProjectRole>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabs">
        <button
          className={`tab ${tab === "board" ? "active" : ""}`}
          onClick={() => setTab("board")}
        >
          Tablero
        </button>
        <button
          className={`tab ${tab === "detail" ? "active" : ""}`}
          onClick={() => setTab("detail")}
        >
          Detalle
        </button>
        <RequireProjectRole role={myRole} allowed={["leader"]}>
          <button
            className={`tab ${tab === "members" ? "active" : ""}`}
            onClick={() => setTab("members")}
          >
            Miembros ({members.length})
          </button>
        </RequireProjectRole>
        <RequireProjectRole role={myRole} allowed={["leader"]}>
          <button
            className={`tab ${tab === "wip" ? "active" : ""}`}
            onClick={() => setTab("wip")}
          >
            Configuración WIP
          </button>
        </RequireProjectRole>
      </div>

      {tab === "board" && (
        <KanbanBoard
          projectId={id}
          project={project}
          members={members}
          myRole={myRole}
        />
      )}

      {tab === "detail" && (
        <div className="project-info">
          <div className="info-row">
            <span className="info-label">Estado:</span>
            <span>{project.isPublic ? "Público" : "Privado"}</span>
          </div>
          {project.wipLimit && (
            <div className="info-row">
              <span className="info-label">Límite WIP:</span>
              <span>{project.wipLimit}</span>
            </div>
          )}
        </div>
      )}

      {tab === "members" && (
        <RequireProjectRole role={myRole} allowed={["leader"]}>
          <MembersSection
            projectId={id}
            members={members}
            onRefresh={fetchMembers}
          />
        </RequireProjectRole>
      )}

      {tab === "wip" && (
        <RequireProjectRole role={myRole} allowed={["leader"]}>
          <WipSection projectId={id} project={project} onUpdated={setProject} />
        </RequireProjectRole>
      )}

      {editing && (
        <CreateProjectModal
          initialData={project}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar proyecto"
          message={
            <p>
              ¿Estás seguro de que quieres eliminar este proyecto? Esta acción
              no se puede deshacer.
            </p>
          }
          confirmText="Eliminar"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function MembersSection({ projectId, members, onRefresh }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMsg({ type: "", text: "" });
    try {
      await api.post(`/projects/${projectId}/members`, {
        email: email.trim(),
        role,
      });
      setEmail("");
      setRole("member");
      setMsg({ type: "success", text: "Miembro añadido correctamente" });
      onRefresh();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  };

  const [removing, setRemoving] = useState(null);

  // Si falla, ConfirmDialog muestra el error dentro del modal
  const handleRemove = async () => {
    await api.delete(`/projects/${projectId}/members/${removing.id}`);
    setRemoving(null);
    onRefresh();
  };

  return (
    <div className="members-section">
      <form className="invite-form" onSubmit={handleInvite}>
        <input
          type="email"
          placeholder="Email del miembro"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="member">Miembro</option>
          <option value="leader">Líder</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? "Invitando..." : "Invitar"}
        </button>
      </form>
      {msg.text && (
        <p className={msg.type === "error" ? "error" : "success"}>{msg.text}</p>
      )}

      <div className="members-list">
        {members.map((m) => (
          <div key={m.id} className="member-row">
            <div className="member-info">
              <img
                src={getAvatarUrl(m.email)}
                alt={m.name}
                className="avatar-sm"
              />
              <div className="member-text">
                <span className="member-name">{m.name}</span>
                <span className="member-email">{m.email}</span>
              </div>
              <span className={`badge badge-${m.role}`}>
                {m.role === "leader" ? "Líder" : "Miembro"}
              </span>
            </div>
            {m.role !== "leader" && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setRemoving({ id: m.id, name: m.name })}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>

      {removing && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar miembro"
          message={<p>¿Eliminar a {removing.name} del proyecto?</p>}
          confirmText="Eliminar"
          onCancel={() => setRemoving(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}

function WipSection({ projectId, project, onUpdated }) {
  const [wipLimit, setWipLimit] = useState(project.wipLimit || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleSave = async () => {
    const val = parseInt(wipLimit, 10);
    if (isNaN(val) || val < 1) {
      setMsg({
        type: "error",
        text: "El límite WIP debe ser un número mayor o igual a 1",
      });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const updated = await api.patch(`/projects/${projectId}/wip`, {
        wipLimit: val,
      });
      onUpdated(updated);
      setMsg({ type: "success", text: "Límite WIP actualizado" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wip-section">
      <label>
        Límite WIP (tareas en progreso)
        <input
          type="number"
          min="1"
          value={wipLimit}
          onChange={(e) => setWipLimit(e.target.value)}
          placeholder="Ej: 5"
        />
      </label>
      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {msg.text && (
        <p className={msg.type === "error" ? "error" : "success"}>{msg.text}</p>
      )}
    </div>
  );
}
