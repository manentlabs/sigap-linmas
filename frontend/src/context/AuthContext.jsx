// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("sigap_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { identifier: email, password });
      localStorage.setItem("sigap_token", data.token);
      localStorage.setItem("sigap_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, message: data.message, user: data.user };
    } catch (err) {
      const message =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("sigap_token");
    localStorage.removeItem("sigap_user");
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  }
  return ctx;
}