// frontend/src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import {
  FiCalendar,
  FiGrid,
  FiFileText,
  FiUsers,
  FiCheckSquare,
  FiClipboard,
  FiMessageSquare,
  FiAlertTriangle,
  FiHeart,
  FiInbox,
  FiPhoneCall,
  FiStar,
  FiLogOut,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

export const SIDEBAR_WIDTH = 260;

// =========================
// Daftar Menu + Hak Akses
// =========================
const NAV_ITEMS = [
  {
    path: "/dashboard/sebaran",
    label: "Beranda",
    icon: FiGrid,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/agenda",
    label: "Agenda",
    icon: FiCalendar,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/berita",
    label: "Berita & Kaleidoskop",
    icon: FiFileText,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/anggota",
    label: "Daftar Anggota",
    icon: FiUsers,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/absensi",
    label: "Absensi Digital",
    icon: FiCheckSquare,
    roles: ["admin", "kepala_satgas", "non_p3k"],
  },
  {
    path: "/dashboard/laporan",
    label: "Laporan Kegiatan",
    icon: FiClipboard,
    roles: ["admin", "kepala_satgas", "operator_kecamatan", "non_p3k"],
  },
  {
    path: "/dashboard/aduan",
    label: "Aduan Anggota",
    icon: FiMessageSquare,
    roles: ["admin", "kepala_satgas", "operator_kecamatan", "non_p3k"],
  },
  {
    path: "/dashboard/titikpkl",
    label: "Peta Rawan PKL",
    icon: FiAlertTriangle,
    roles: ["admin", "kepala_satgas", "operator_kecamatan", "non_p3k"],
  },
  {
    path: "/dashboard/layanan",
    label: "Pelayanan Publik",
    icon: FiInbox,
    roles: ["admin", "kepala_satgas", "operator_kecamatan", "non_p3k"],
  },
  {
    path: "/dashboard/monev",
    label: "Laporan Monev",
    icon: FiHeart,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/kontak-darurat",
    label: "Kontak Darurat",
    icon: FiPhoneCall,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/kepuasan",
    label: "Kepuasan Masyarakat",
    icon: FiStar,
    roles: ["admin", "kepala_satgas"],
  },
  {
    path: "/dashboard/user",
    label: "Manajemen User",
    icon: FiUsers,
    roles: ["admin"],
  },
];

// =========================
// Warna
// =========================
const C = {
  bg: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  amberBg: "rgba(242,169,59,0.14)",
  red: "#E5484D",
};

export default function Sidebar({
  mobileOpen,
  onClose,
  desktopOpen = true,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width:900px)");

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Keluar dari akun?",
      text: "Anda perlu masuk kembali untuk mengakses dashboard.",
      showCancelButton: true,
      confirmButtonText: "Ya, keluar",
      cancelButtonText: "Batal",
      background: "#FFFFFF",
      color: C.text,
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });

    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  // =========================
  // Filter Menu Berdasarkan Role
  // =========================
  const role = user?.role;

  const menuItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );

  const content = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        bgcolor: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            bgcolor: C.amberBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src="/linmas.png"
            alt="Linmas"
            style={{
              width: 40,
              height: 40,
              marginRight: 8,
              objectFit: "contain",
            }}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 15,
              color: C.text,
              lineHeight: 1.2,
            }}
          >
            SIGAP LINMAS
          </Typography>

          <Typography
            sx={{
              fontSize: 10.5,
              color: C.textFaint,
              fontFamily: "monospace",
            }}
          >
            Pusat Kendali Wilayah
          </Typography>
        </Box>

        {!isDesktop && (
          <IconButton
            onClick={onClose}
            sx={{ ml: "auto", color: C.textDim }}
            size="small"
          >
            <FiX size={18} />
          </IconButton>
        )}
      </Box>

      {/* Menu */}
      <List
        sx={{
          flex: 1,
          px: 1.5,
          py: 1.5,
          overflowY: "auto",
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={!isDesktop ? onClose : undefined}
              sx={{
                borderRadius: "10px",
                mb: 0.4,
                py: 1,
                color: C.textDim,
                "&.active": {
                  bgcolor: C.amberBg,
                  color: C.amber,
                  "& .MuiListItemIcon-root": {
                    color: C.amber,
                  },
                },
                "&:hover": {
                  bgcolor: "rgba(19,28,43,0.04)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 34,
                  color: "inherit",
                }}
              >
                <Icon size={17} />
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: C.border }} />

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.3,
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: "rgba(59,130,246,0.12)",
            color: "#3B82F6",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {(user?.nama || "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: C.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user?.nama || "Pengguna"}
          </Typography>

          <Typography
            sx={{
              fontSize: 11,
              color: C.textFaint,
              textTransform: "capitalize",
            }}
          >
            {user?.role?.replace("_", " ") || "-"}
          </Typography>
        </Box>

        <IconButton
          onClick={handleLogout}
          size="small"
          sx={{ color: C.textDim }}
          title="Keluar"
        >
          <FiLogOut size={17} />
        </IconButton>
      </Box>
    </Box>
  );

  // Desktop
  if (isDesktop) {
    return (
      <Box
        sx={{
          width: desktopOpen ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 200ms ease",
        }}
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: SIDEBAR_WIDTH,
              border: "none",
              boxSizing: "border-box",
            },
          }}
        >
          {content}
        </Drawer>
      </Box>
    );
  }

  // Mobile
  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          border: "none",
          boxSizing: "border-box",
        },
      }}
    >
      {content}
    </Drawer>
  );
}