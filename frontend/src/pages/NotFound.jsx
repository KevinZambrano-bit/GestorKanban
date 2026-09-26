import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="centered-page">
      <h1>404</h1>
      <p>Esta página no existe.</p>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        Volver al inicio
      </button>
    </div>
  );
}
