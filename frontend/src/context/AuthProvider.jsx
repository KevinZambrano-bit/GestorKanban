import { useState, useEffect } from "react";
import AuthContext from "./AuthContext";
import api from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  async function login(email, password) {
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function register(name, email, password) {
    setLoading(true);
    try {
      const data = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogleToken(token) {
    setLoading(true);
    try {
      localStorage.setItem("token", token);
      const profile = await api.get("/auth/profile");
      localStorage.setItem("user", JSON.stringify(profile));
      setUser(profile);
      return profile;
    } catch (err) {
      localStorage.removeItem("token");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  const value = { user, loading, login, register, loginWithGoogleToken, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
