// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield, FiUser } from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

// --- Illustration: laptop + shield + lock + two petugas silhouettes ---
function SigapIllustration() {
  return (
    <svg viewBox="0 10 420 340" width="100%" height="100%" style={{ maxWidth: 420 }}>
      <circle cx="90" cy="60" r="70" fill="#FDECC8" opacity="0.6" />
      <circle cx="360" cy="260" r="90" fill="#FCE7D6" opacity="0.5" />

      <rect x="60" y="40" width="300" height="190" rx="14" fill="#131C2B" />
      <rect x="72" y="52" width="276" height="166" rx="6" fill="#FFFFFF" />

      <rect x="72" y="52" width="276" height="22" rx="6" fill="#EEF1F6" />
      <circle cx="86" cy="63" r="3" fill="#F2A93B" />
      <circle cx="98" cy="63" r="3" fill="#CBD5E1" />
      <circle cx="110" cy="63" r="3" fill="#CBD5E1" />

      <path
        d="M150 110 q20 -14 45 -6 q22 8 40 -2 q18 -10 32 4 q-6 14 -26 16 q-18 2 -30 12 q-14 12 -35 6 q-18 -6 -26 -22 Z"
        fill="#DDE6F2"
      />
      <circle cx="210" cy="118" r="10" fill="#F2A93B" />
      <circle cx="210" cy="115" r="4.5" fill="#FFFFFF" />

      <rect x="96" y="152" width="150" height="8" rx="4" fill="#DDE6F2" />
      <rect x="96" y="168" width="110" height="8" rx="4" fill="#F2A93B" opacity="0.5" />
      <rect x="96" y="184" width="130" height="8" rx="4" fill="#DDE6F2" />

      <path d="M40 232 L380 232 L360 250 L60 250 Z" fill="#1E293B" />

      <rect x="300" y="160" width="72" height="58" rx="10" fill="#F2A93B" />
      <path
        d="M316 160 v-18 a20 20 0 0 1 40 0 v18"
        fill="none"
        stroke="#131C2B"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="336" cy="186" r="6" fill="#131C2B" />
      <rect x="333" y="188" width="6" height="14" rx="3" fill="#131C2B" />

      <path
        d="M140 60 l24 -10 l24 10 v22 c0 18 -12 30 -24 34 c-12 -4 -24 -16 -24 -34 Z"
        fill="#FFFFFF"
        stroke="#F2A93B"
        strokeWidth="3"
      />
      <path d="M154 78 l7 7 l14 -16" fill="none" stroke="#2FAE79" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      <g transform="translate(120,240)">
        <ellipse cx="0" cy="86" rx="34" ry="6" fill="#E2E8F0" />
        <rect x="-14" y="20" width="28" height="46" rx="10" fill="#6B7B54" />
        <circle cx="0" cy="8" r="14" fill="#E7C9A9" />
        <path d="M-14 2 a14 8 0 0 1 28 0 z" fill="#4E5C3C" />
      </g>
      <g transform="translate(175,246)">
        <ellipse cx="0" cy="82" rx="30" ry="5.5" fill="#E2E8F0" />
        <rect x="-12" y="18" width="24" height="42" rx="9" fill="#7C8D63" />
        <circle cx="0" cy="6" r="12" fill="#E7C9A9" />
        <path d="M-12 0 a12 7 0 0 1 24 0 z" fill="#4E5C3C" />
      </g>
    </svg>
  );
}

// Reusable style: fixes the browser autofill blue-background + label overlap bug
const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#F8FAFC",
    "& fieldset": { borderColor: "#E4E9F2" },
    "&:hover fieldset": { borderColor: "#F2A93B" },
    "&.Mui-focused fieldset": { borderColor: "#F2A93B" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#F2A93B" },
  // --- autofill fix: without this, Chrome/Edge paint the input a hard
  // blue/yellow and the floating label can fail to shrink over it ---
  "& input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 1000px #F8FAFC inset",
    WebkitTextFillColor: "#131C2B",
    caretColor: "#131C2B",
    borderRadius: "inherit",
    transition: "background-color 9999s ease-in-out 0s", // delays Chrome's own autofill repaint
  },
};

// Cek apakah input terlihat seperti email (untuk memilih ikon saja, bukan validasi ketat)
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  const identifierValue = watch("identifier");

  const onSubmit = async (values) => {
    // login() dipanggil dengan identifier (email ATAU username) + password.
    // Backend yang menentukan apakah string ini email atau username.
    const result = await login(values.identifier, values.password);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Berhasil masuk",
        text: result.message,
        background: "#FFFFFF",
        color: "#131C2B",
        confirmButtonColor: "#F2A93B",
        timer: 1400,
        showConfirmButton: false,
      }).then(() => navigate("/dashboard"));
    } else {
      Swal.fire({
        icon: "error",
        title: "Gagal masuk",
        text: result.message,
        background: "#FFFFFF",
        color: "#131C2B",
        confirmButtonColor: "#F2A93B",
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        m: 0,
        bgcolor: "#F3F6FB",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      {/* Panel kiri — form login (2/3 lebar layar di sm ke atas) */}
      <Box
        sx={{
          flexBasis: { xs: "100%", sm: "66.6667%" },
          maxWidth: { xs: "100%", sm: "66.6667%" },
          flexGrow: 0,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: "rgba(242,169,59,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
            <Typography sx={{ color: "#131C2B", fontWeight: 800, fontSize: 20, letterSpacing: 0.2 }}>
              Sigap Linmas
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: { xs: 3, sm: 4.5 },
              bgcolor: "#FFFFFF",
              border: "1px solid #E4E9F2",
              borderRadius: 3,
              boxShadow: "0 12px 32px rgba(19,28,43,0.06)",
            }}
          >
            <Typography variant="h5" sx={{ color: "#131C2B", fontWeight: 700, mb: 0.5 }}>
              Masuk ke akun Anda
            </Typography>
            <Typography sx={{ color: "#64748B", fontSize: 13.5, mb: 3.5 }}>
              Gunakan email/username dan kata sandi yang terdaftar sebagai petugas Satgas Linmas.
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                fullWidth
                label="Email atau Username"
                type="text"
                margin="normal"
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {looksLikeEmail(identifierValue) ? (
                        <FiMail color="#94A3B8" />
                      ) : (
                        <FiUser color="#94A3B8" />
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
                error={!!errors.identifier}
                helperText={errors.identifier ? errors.identifier.message : ""}
                {...register("identifier", {
                  required: "Email atau username wajib diisi.",
                  minLength: {
                    value: 3,
                    message: "Minimal 3 karakter.",
                  },
                })}
              />

              <TextField
                fullWidth
                label="Kata Sandi"
                type={showPassword ? "text" : "password"}
                margin="normal"
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiLock color="#94A3B8" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {showPassword ? <FiEyeOff color="#64748B" /> : <FiEye color="#64748B" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
                error={!!errors.password}
                helperText={errors.password ? errors.password.message : ""}
                {...register("password", {
                  required: "Kata sandi wajib diisi.",
                  minLength: { value: 6, message: "Kata sandi minimal 6 karakter." },
                })}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.3,
                  bgcolor: "#F2A93B",
                  color: "#131C2B",
                  fontWeight: 700,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#D9911F", boxShadow: "none" },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#131C2B" }} /> : "Masuk"}
              </Button>
            </Box>

            <Typography sx={{ color: "#94A3B8", fontSize: 12, mt: 3, textAlign: "center" }}>
              Lupa kata sandi? Hubungi admin sistem di kantor kecamatan Anda.
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Panel kanan — ilustrasi (1/3 lebar layar di sm ke atas), disembunyikan di layar kecil */}
      <Box
        sx={{
          flexBasis: { xs: "0%", sm: "33.3333%" },
          maxWidth: { xs: "0%", sm: "33.3333%" },
          flexGrow: 0,
          flexShrink: 0,
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          pt: 8,
          px: 6,
          bgcolor: "#F8FAFC",
          borderLeft: "1px solid #E4E9F2",
        }}
      >
        <SigapIllustration />
        <Typography
          sx={{
            color: "#64748B",
            maxWidth: 380,
            fontSize: 14,
            lineHeight: 1.7,
            textAlign: "center",
            mt: -4,
          }}
        >
          Pusat kendali pemantauan Perlindungan Masyarakat — sebaran anggota,
          absensi digital, laporan kegiatan hingga aduan anggota dalam satu dashboard.
        </Typography>
      </Box>
    </Box>
  );
}