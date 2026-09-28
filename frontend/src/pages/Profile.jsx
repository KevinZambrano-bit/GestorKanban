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

  const isAdmin = user?.role?.name === "admin";
  const unchanged = name.trim() === (user?.name || "");

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

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (msg.type === "success") setMsg({ type: "", text: "" });
  };

  return (
    <div className="profile-page">
      <button className="btn btn-back" onClick={() => navigate("/")}>
        ← Volver al dashboard
      </button>

      <h1 className="profile-title">Mi perfil</h1>

      <section className="profile-card">
        <header className="profile-identity">
          <img
            src={getAvatarUrl(user?.email)}
            alt=""
            className="profile-avatar"
            width="104"
            height="104"
          />
          <h2 className="profile-name">{user?.name}</h2>
          <span className={`badge ${isAdmin ? "badge-leader" : "badge-member"}`}>
            {isAdmin ? "Administrador" : "Usuario"}
          </span>
          <p className="profile-email">{user?.email}</p>
        </header>

        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <h3 className="profile-section-title">Datos de la cuenta</h3>

          <div className="profile-field">
            <label htmlFor="profile-name">Nombre</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-email">Correo electrónico</label>
            <div className="profile-readonly">
              <input
                id="profile-email"
                type="email"
                value={user?.email || ""}
                readOnly
                aria-describedby="profile-email-hint"
              />
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <span id="profile-email-hint" className="profile-hint">
              El correo identifica tu cuenta y no se puede cambiar.
            </span>
          </div>

          {msg.text && (
            <p
              className={`profile-msg ${msg.type === "error" ? "error" : "success"}`}
              role={msg.type === "error" ? "alert" : "status"}
            >
              {msg.text}
            </p>
          )}

          <div className="profile-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || unchanged}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
