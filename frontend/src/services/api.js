// frontend/src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor request: selalu sisipkan token jika ada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sigap_token");
  console.log("[api.js] Token ditemukan:", token); // debug
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log("[api.js] Headers yang dikirim:", config.headers); // debug
  return config;
});

// Interceptor response: tangani error 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sigap_token");
      localStorage.removeItem("sigap_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;