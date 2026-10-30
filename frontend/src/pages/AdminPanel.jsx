import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import useAuth from "../hooks/useAuth";
import { TASK_STATUSES } from "../hooks/useTasks";
import { getAvatarUrl } from "../utils/avatar";
import ConfirmDialog from "../components/ConfirmDialog";

const ROLE_LABELS = { admin: "Admin", user: "Usuario" };

export default function AdminPanel() {
  const { user: me } = useAuth();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });
  const [removingUser, setRemovingUser] = useState(null);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      setStats(await api.get("/admin/stats"));
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // El backend no garantiza orden en GET /users: se ordena por id para que
  // las filas no salten de sitio al refrescar tras un cambio de rol.
  const loadUsers = useCallback(async () => {
    const data = await api.get("/users");
    setUsers(Array.isArray(data) ? [...data].sort((a, b) => a.id - b.id) : []);
  }, []);

  // El admin puede ver TODOS los proyectos de la plataforma, no solo en los
  // que participa. Desde aquí entra a cualquiera para gestionarlo.
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const data = await api.get("/projects/admin/all");
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setProjectsError(err.message);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      setUsersError("");
      try {
        // Los IDs de rol se generan al sembrar la BD, así que se resuelven
        // por nombre en vez de fijarlos en el código.
        const [, rolesData] = await Promise.all([
          loadUsers(),
          api.get("/roles"),
        ]);
        if (!cancelled) setRoles(Array.isArray(rolesData) ? rolesData : []);
      } catch (err) {
        if (!cancelled) setUsersError(err.message);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const handleRoleChange = async (target, roleName) => {
    const role = roles.find((r) => r.name === roleName);
    if (!role || target.role?.name === roleName) return;

    setPendingUserId(target.id);
    setActionMsg({ type: "", text: "" });
    try {
      await api.patch(`/users/${target.id}`, { roleId: role.id });
      await loadUsers();
      setActionMsg({
        type: "success",
        text: `${target.name} ahora es ${ROLE_LABELS[roleName] || roleName}`,
      });
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setPendingUserId(null);
    }
  };

  // Si falla, ConfirmDialog muestra el error dentro del modal
  const handleDeleteUser = async () => {
    await api.delete(`/users/${removingUser.id}`);
    setRemovingUser(null);
    await loadUsers();
    setActionMsg({
      type: "success",
      text: `${removingUser.name} ha sido eliminado de la plataforma`,
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Panel de administración</h1>
        <p className="admin-sub">
          Estadísticas globales y gestión de usuarios de Gestor Kanban.
        </p>
      </div>

      <section className="admin-section">
        <h2>Estadísticas</h2>
        {statsLoading ? (
          <p className="loading">Cargando estadísticas...</p>
        ) : statsError ? (
          <div className="admin-error">
            <p className="error">{statsError}</p>
            <button className="btn btn-sm" onClick={loadStats}>
              Reintentar
            </button>
          </div>
        ) : (
          stats && (
            <div className="admin-kpis">
              <div className="admin-kpi">
                <span className="admin-kpi-label">Usuarios</span>
                <span className="admin-kpi-value">{stats.users}</span>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">Proyectos</span>
                <span className="admin-kpi-value">{stats.projects}</span>
              </div>
              <div className="admin-kpi">
                <span className="admin-kpi-label">Tareas</span>
                <span className="admin-kpi-value">{stats.tasks.total}</span>
                <div className="admin-kpi-breakdown">
                  {TASK_STATUSES.map((s) => (
                    <span
                      key={s.value}
                      className={`badge badge-status-${s.value}`}
                    >
                      {s.label}: {stats.tasks.byStatus?.[s.value] ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </section>

      <section className="admin-section">
        <h2>Usuarios</h2>
        {actionMsg.text && (
          <p className={actionMsg.type === "error" ? "error" : "success"}>
            {actionMsg.text}
          </p>
        )}
        {usersLoading ? (
          <p className="loading">Cargando usuarios...</p>
        ) : usersError ? (
          <p className="error">{usersError}</p>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol global</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  const roleName = u.role?.name || "";
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="admin-user-cell">
                          <img
                            src={getAvatarUrl(u.email)}
                            alt=""
                            className="admin-avatar"
                          />
                          <span className="admin-user-name">
                            {u.name}
                            {isMe && <span className="admin-you">(tú)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="admin-email">{u.email}</td>
                      <td>
                        <div className="admin-role-cell">
                          <select
                            value={roleName}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            // Un admin no puede degradarse a sí mismo: la
                            // plataforma podría quedarse sin administradores.
                            disabled={
                              isMe || pendingUserId !== null || roles.length === 0
                            }
                            title={
                              isMe
                                ? "No puedes cambiar tu propio rol"
                                : undefined
                            }
                            aria-label={`Rol global de ${u.name}`}
                          >
                            {!roleName && <option value="">Sin rol</option>}
                            {roles.map((r) => (
                              <option key={r.id} value={r.name}>
                                {ROLE_LABELS[r.name] || r.name}
                              </option>
                            ))}
                          </select>
                          {pendingUserId === u.id && (
                            <span className="btn-spinner btn-spinner-dark" />
                          )}
                        </div>
                      </td>
                      <td>
                        {/* El admin no puede borrarse a sí mismo: la
                            plataforma podría quedarse sin administradores. */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setRemovingUser(u)}
                          disabled={isMe}
                          title={
                            isMe
                              ? "No puedes eliminar tu propia cuenta"
                              : undefined
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Proyectos</h2>
        {projectsLoading ? (
          <p className="loading">Cargando proyectos...</p>
        ) : projectsError ? (
          <div className="admin-error">
            <p className="error">{projectsError}</p>
            <button className="btn btn-sm" onClick={loadProjects}>
              Reintentar
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>No hay proyectos registrados.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Creador</th>
                  <th>Visibilidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="admin-email">{p.createdBy?.name}</td>
                    <td>{p.isPublic ? "Público" : "Privado"}</td>
                    <td>
                      <Link to={`/projects/${p.id}`} className="btn btn-sm">
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {removingUser && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar usuario"
          message={
            <p>
              ¿Eliminar a {removingUser.name} de la plataforma? Se borrará su
              cuenta y no podrá iniciar sesión de nuevo.
            </p>
          }
          confirmText="Eliminar"
          onCancel={() => setRemovingUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}
