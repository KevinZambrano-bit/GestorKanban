import { useNavigate } from "react-router-dom";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="centered-page">
      <h1>403</h1>
      <p>No tienes permiso para ver esta página.</p>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        Volver al inicio
      </button>
    </div>
  );
}
