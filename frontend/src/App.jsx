import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";

import theme from "./theme/theme";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "leaflet/dist/leaflet.css";

import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import AgendaPage from "./pages/AgendaPage";
import BeritaPage from "./pages/BeritaPage";
import AnggotaPage from "./pages/AnggotaPage";
import AbsensiPage from "./pages/AbsensiPage";
import LaporanPage from "./pages/LaporanPage";
import SebaranPage from "./pages/SebaranPage";
import AduanPage from "./pages/AduanPage";
import TitikpklPage from "./pages/TitikpklPage";
import MonevPage from "./pages/MonevPage";
import UserPage from "./pages/UserPage";

// Halaman default per role saat user membuka /dashboard tanpa sub-path.
// Urutan ini mengikuti halaman pertama yang benar-benar bisa diakses
// oleh masing-masing role (lihat allowedRoles di setiap <Route> di bawah).
const DEFAULT_ROUTE_BY_ROLE = {
  admin: "sebaran",
  kepala_satgas: "sebaran",
  operator_kecamatan: "laporan",
  non_p3k: "absensi",
};

// Redirect ke halaman default yang sesuai dengan role user yang sedang login,
// bukan selalu ke "sebaran" (yang tidak bisa diakses operator_kecamatan / non_p3k).
function DefaultDashboardRedirect() {
  const { user } = useAuth();
  const target = DEFAULT_ROUTE_BY_ROLE[user?.role] || "laporan";
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Default — sesuai role, bukan hardcode "sebaran" */}
              <Route index element={<DefaultDashboardRedirect />} />

              {/* Admin & Kepala Satgas */}
              <Route
                path="sebaran"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "kepala_satgas"]}
                  >
                    <SebaranPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="agenda"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "kepala_satgas"]}
                  >
                    <AgendaPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="berita"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "kepala_satgas"]}
                  >
                    <BeritaPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="anggota"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "kepala_satgas"]}
                  >
                    <AnggotaPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="monev"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin", "kepala_satgas"]}
                  >
                    <MonevPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin, Kepala Satgas, Non P3K */}
              <Route
                path="absensi"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin",
                      "kepala_satgas",
                      "non_p3k",
                    ]}
                  >
                    <AbsensiPage />
                  </ProtectedRoute>
                }
              />

              {/* Semua kecuali yang tidak memiliki hak */}
              <Route
                path="laporan"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin",
                      "kepala_satgas",
                      "operator_kecamatan",
                      "non_p3k",
                    ]}
                  >
                    <LaporanPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="aduan"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin",
                      "kepala_satgas",
                      "operator_kecamatan",
                      "non_p3k",
                    ]}
                  >
                    <AduanPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="titikpkl"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin",
                      "kepala_satgas",
                      "operator_kecamatan",
                      "non_p3k",
                    ]}
                  >
                    <TitikpklPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin saja */}
              <Route
                path="user"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <UserPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}