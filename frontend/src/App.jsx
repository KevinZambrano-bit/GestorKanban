import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import RoleRoute from "./components/RoleRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import OAuthCallback from "./pages/OAuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* El token viaja en la URL, así que el enlace funciona con o sin
            sesión iniciada: la pantalla de aceptación detecta cuál es el caso. */}
        <Route path="/invitacion/:token" element={<AcceptInvitation />} />
      </Route>
      {/* ResetPassword queda fuera de PublicRoute: con sesión activa el
          formulario se muestra igualmente, pero nunca desplaza al dashboard. */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<RoleRoute allowed={["admin"]} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
