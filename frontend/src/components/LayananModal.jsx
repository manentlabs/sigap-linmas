// frontend/src/components/LayananModal.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

import api from "../services/api";

const C = {
  text: "#131C2B",
  textDim: "#64748B",
  border: "#E4E9F2",
  greenMain: "#1B5E20",
};

// item: salah satu entri dari data/layananConfig.js ({ jenis, title, icon, color, bg })
export default function LayananModal({ open, onClose, item }) {
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ mode: "onBlur" });

  if (!item) return null;
  const Icon = item.icon;

  function handleFotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setFotoFile(null);
      setPreview(null);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Ukuran file terlalu besar",
        text: "Foto maksimal 3MB.",
        confirmButtonColor: C.greenMain,
      });
      e.target.value = "";
      return;
    }
    setFotoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleClose() {
    reset();
    setFotoFile(null);
    setPreview(null);
    onClose();
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("jenis", item.jenis);
      formData.append("nama_pelapor", values.nama_pelapor);
      formData.append("no_hp", values.no_hp);
      formData.append("lokasi", values.lokasi);
      formData.append("deskripsi", values.deskripsi);
      if (fotoFile) formData.append("foto", fotoFile);

      // Content-Type sengaja tidak di-set manual — biarkan browser/axios
      // otomatis menambahkan boundary multipart yang benar.
      const { data } = await api.post("/layanan-publik", formData, {
        headers: { "Content-Type": undefined },
      });

      Swal.fire({
        icon: "success",
        title: "Laporan terkirim",
        html: `Terima kasih, laporan Anda telah kami terima.<br/>Kode laporan: <b>${data.data.kode_layanan}</b>`,
        confirmButtonColor: C.greenMain,
      });

      handleClose();
    } catch (err) {
      const message =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "Tidak dapat mengirim laporan. Periksa koneksi Anda dan coba lagi.";
      Swal.fire({
        icon: "error",
        title: "Gagal mengirim",
        text: message,
        confirmButtonColor: C.greenMain,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 6 }}>
        <Avatar sx={{ bgcolor: item.bg, color: item.color, width: 40, height: 40 }}>
          <Icon fontSize="small" />
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17, color: C.text, lineHeight: 1.2 }}>
            {item.title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: C.textDim }}>
            Isi formulir di bawah, tim kami akan menindaklanjuti laporan Anda.
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ position: "absolute", right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers sx={{ borderColor: C.border }}>
          <TextField
            fullWidth
            label="Nama Lengkap"
            margin="normal"
            error={!!errors.nama_pelapor}
            helperText={errors.nama_pelapor ? errors.nama_pelapor.message : ""}
            {...register("nama_pelapor", { required: "Nama wajib diisi." })}
          />

          <TextField
            fullWidth
            label="Nomor HP / WhatsApp"
            margin="normal"
            placeholder="Contoh: 0812xxxxxxx"
            error={!!errors.no_hp}
            helperText={errors.no_hp ? errors.no_hp.message : ""}
            {...register("no_hp", {
              required: "Nomor HP wajib diisi.",
              minLength: { value: 8, message: "Nomor HP terlalu pendek." },
            })}
          />

          <TextField
            fullWidth
            label="Lokasi Kejadian"
            margin="normal"
            placeholder="Contoh: RT 02/RW 05, Kec. Sukajaya"
            error={!!errors.lokasi}
            helperText={errors.lokasi ? errors.lokasi.message : ""}
            {...register("lokasi", { required: "Lokasi wajib diisi." })}
          />

          <TextField
            fullWidth
            label="Deskripsi"
            margin="normal"
            multiline
            minRows={3}
            placeholder="Jelaskan kejadian atau kendala secara singkat dan jelas..."
            error={!!errors.deskripsi}
            helperText={errors.deskripsi ? errors.deskripsi.message : ""}
            {...register("deskripsi", {
              required: "Deskripsi wajib diisi.",
              minLength: { value: 10, message: "Deskripsi minimal 10 karakter." },
            })}
          />

          {/* Upload foto bukti — opsional */}
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: 12.5, color: C.textDim, mb: 0.7, fontWeight: 500 }}>
              Foto Bukti (opsional, maks. 3MB)
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<PhotoCameraOutlinedIcon />}
              sx={{ textTransform: "none", borderColor: C.border, color: C.text }}
            >
              Pilih Foto
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFotoChange} />
            </Button>
            {preview && (
              <Box
                component="img"
                src={preview}
                alt="Pratinjau foto"
                sx={{ mt: 1.5, width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 2, border: `1px solid ${C.border}` }}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleClose} sx={{ textTransform: "none", color: C.textDim }}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: C.greenMain,
              px: 3,
              "&:hover": { bgcolor: "#154D19" },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Kirim Laporan"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}