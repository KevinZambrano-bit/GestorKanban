import { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import { getMyRole } from "../utils/project";
import { CreateProjectModal } from "./Projects";
import KanbanBoard from "../components/board/KanbanBoard";
import RequireProjectRole from "../components/RequireProjectRole";
import HeaderTabsContext from "../context/HeaderTabsContext";
import { getAvatarUrl } from "../utils/avatar";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("board");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // El correo de asignación enlaza a /projects/:id?tarea=<número>. Ese
  // parámetro se consume al abrir el tablero y se descarta de la URL para que
  // un recarga posterior no vuelva a forzar el modal de la tarea.
  const requestedTaskNumber = useMemo(() => {
    const raw = searchParams.get("tarea");
    const parsed = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [taskToOpen, setTaskToOpen] = useState(null);
  const openNonceRef = useRef(0);

  useEffect(() => {
    if (requestedTaskNumber === null) return;
    // El nonce permite reabrir la misma tarea si se vuelve a pulsar el enlace
    // del correo sin haber recargado la página.
    openNonceRef.current += 1;
    setTaskToOpen({ number: requestedTaskNumber, nonce: openNonceRef.current });
    navigate({ pathname: `/projects/${id}` }, { replace: true });
  }, [requestedTaskNumber, id, navigate]);

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

  // El admin global tiene control total: se le trata como líder de cualquier
  // proyecto, aunque no sea miembro, para que pueda gestionarlo desde la UI.
  const isAdmin = user?.role?.name === "admin";
  const myRole = isAdmin ? "leader" : getMyRole(project, user?.id);
  const { slot: headerTabsSlot } = useContext(HeaderTabsContext);

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

      {headerTabsSlot &&
        createPortal(
          <div className="header-tabs" role="tablist" aria-label="Secciones del proyecto">
            <button
              className={`tab ${tab === "board" ? "active" : ""}`}
              onClick={() => setTab("board")}
              role="tab"
              aria-selected={tab === "board"}
            >
              Tablero
            </button>
            <button
              className={`tab ${tab === "detail" ? "active" : ""}`}
              onClick={() => setTab("detail")}
              role="tab"
              aria-selected={tab === "detail"}
            >
              Detalle
            </button>
            <RequireProjectRole role={myRole} allowed={["leader"]}>
              <button
                className={`tab ${tab === "members" ? "active" : ""}`}
                onClick={() => setTab("members")}
                role="tab"
                aria-selected={tab === "members"}
              >
                Miembros ({members.length})
              </button>
            </RequireProjectRole>
            <RequireProjectRole role={myRole} allowed={["leader"]}>
              <button
                className={`tab ${tab === "wip" ? "active" : ""}`}
                onClick={() => setTab("wip")}
                role="tab"
                aria-selected={tab === "wip"}
              >
                Configuración WIP
              </button>
            </RequireProjectRole>
          </div>,
          headerTabsSlot,
        )}

      {tab === "board" && (
        <KanbanBoard
          projectId={id}
          project={project}
          members={members}
          myRole={myRole}
          taskToOpen={taskToOpen}
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
            isAdmin={isAdmin}
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

function MembersSection({ projectId, members, isAdmin, onRefresh }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [pending, setPending] = useState([]);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await api.get(`/projects/${projectId}/invitations`);
      setPending(Array.isArray(data) ? data : []);
    } catch {
      // La lista de pendientes es informativa: si falla no interrumpe el
      // resto de la sección de miembros.
      setPending([]);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // El backend decide según tenga o no cuenta: añade al miembro y le avisa,
  // o envía una invitación con un enlace válido 7 días.
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMsg({ type: "", text: "" });
    try {
      const result = await api.post(`/projects/${projectId}/invitations`, {
        email: email.trim(),
        role,
      });
      setEmail("");
      setRole("member");
      setMsg({ type: "success", text: result.message });
      await Promise.all([fetchInvitations(), onRefresh()]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (invitation) => {
    setMsg({ type: "", text: "" });
    try {
      const result = await api.delete(
        `/projects/${projectId}/invitations/${invitation.id}`,
      );
      setMsg({ type: "success", text: result.message });
      await fetchInvitations();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
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

      {pending.length > 0 && (
        <div className="invite-pending">
          <h4 className="invite-pending-title">
            Invitaciones pendientes ({pending.length})
          </h4>
          {pending.map((inv) => (
            <div key={inv.id} className="member-row">
              <div className="member-info">
                <div className="member-text">
                  <span className="member-name">{inv.email}</span>
                  <span className="member-email">
                    Invitado por {inv.invitedBy?.name || "un líder"} ·{" "}
                    {inv.expiresAt
                      ? `caduca el ${new Date(inv.expiresAt).toLocaleDateString()}`
                      : "sin caducidad"}
                  </span>
                </div>
                <span className={`badge badge-${inv.role}`}>
                  {inv.role === "leader" ? "Líder" : "Miembro"}
                </span>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleRevoke(inv)}
              >
                Revocar
              </button>
            </div>
          ))}
        </div>
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
            {/* Un admin global puede quitar a cualquier miembro, también al
                líder; un líder solo puede quitar a los miembros. */}
            {(isAdmin || m.role !== "leader") && (
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
