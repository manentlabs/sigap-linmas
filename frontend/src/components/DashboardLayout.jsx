import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, AppBar, Toolbar, IconButton, Typography, useMediaQuery } from "@mui/material";
import { FiMenu, FiShield } from "react-icons/fi";

import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";

// --- Palet warna disamakan dengan halaman Login ---
const C = {
  bg: "#F3F6FB",
  surface: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textMuted: "#94A3B8",
  accent: "#F2A93B",
};

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:900px)");

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: C.bg }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: `1px solid ${C.border}`,
            color: C.text,
            boxShadow: "0 1px 0 rgba(19,28,43,0.02)",
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ color: C.textDim, mr: 1.5 }}
              >
                <FiMenu size={20} />
              </IconButton>
            )}

            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "rgba(242,169,59,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1.25,
              }}
            >
              <FiShield size={16} color={C.accent} />
            </Box>

            <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.2 }}>
              SIGAP Linmas
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3, flex: 1 }}>
          {/* Halaman modul (Ringkasan, Anggota, dll.) dirender di sini */}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}