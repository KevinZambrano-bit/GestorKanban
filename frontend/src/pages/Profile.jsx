import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getAvatarUrl } from "../utils/avatar";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ type: "error", text: "El nombre es requerido" });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await updateProfile({ name: name.trim() });
      setMsg({ type: "success", text: "Perfil actualizado correctamente" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <button className="btn btn-back" onClick={() => navigate("/")}>
        ← Volver al dashboard
      </button>
      <div className="profile-header">
        <h1>Mi perfil</h1>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-row">
          <img
            src={getAvatarUrl(user?.email)}
            alt={user?.name}
            className="avatar-lg"
          />
          <div className="profile-identity">
            <span className="profile-identity-name">{user?.name}</span>
            <span className="profile-identity-sub">
              Miembro de Gestor Kanban
            </span>
          </div>
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <span className="profile-field-label">Correo electrónico</span>
            <span className="profile-field-value">{user?.email}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Rol</span>
            <span className="profile-field-value">
              <span className="badge badge-member">
                {user?.role?.name || "Sin rol"}
              </span>
            </span>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          {msg.text && (
            <p className={msg.type === "error" ? "error" : "success"}>
              {msg.text}
            </p>
          )}

          <div className="profile-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
