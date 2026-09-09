// frontend/src/pages/admin/KontakDaruratPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import {
  Box,
  Grid,
  Card,
  Typography,
  Chip,
  Switch,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import { FiPlus, FiEdit2, FiTrash2, FiPhoneCall, FiX } from "react-icons/fi";

import api from "../../services/api";

const C = {
  panel: "#121A26",
  panel2: "#182335",
  border: "#243349",
  borderSoft: "#1B2536",
  text: "#E7ECF3",
  textDim: "#8FA0B8",
  textFaint: "#5A6B84",
  amber: "#F2A93B",
  teal: "#35C7B3",
  red: "#EF5B5B",
};

const KATEGORI_LIST = [
  "Pemadam Kebakaran",
  "Ambulans/Kesehatan",
  "Kepolisian",
  "Komando Linmas",
  "BPBD",
  "Lainnya",
];

export default function KontakDaruratPage() {
  const [kontak, setKontak] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = tambah baru, object = edit

  const loadKontak = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/kontak-darurat/all", { params: { limit: 100 } });
      setKontak(data.data || []);
    } catch (err) {
      setErrorMsg("Gagal memuat data. Pastikan Anda sudah login sebagai admin/kepala satgas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKontak();
  }, [loadKontak]);

  function openTambah() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setModalOpen(true);
  }

  async function handleToggleActive(item) {
    try {
      await api.patch(`/kontak-darurat/${item.id}/status`, { is_active: !item.is_active });
      setKontak((prev) =>
        prev.map((k) => (k.id === item.id ? { ...k, is_active: item.is_active ? 0 : 1 } : k))
      );
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Tidak dapat mengubah status kontak.", background: C.panel, color: C.text, confirmButtonColor: C.amber });
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus kontak ini?",
      text: `"${item.nama_kontak}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      background: C.panel,
      color: C.text,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/kontak-darurat/${item.id}`);
      setKontak((prev) => prev.filter((k) => k.id !== item.id));
      Swal.fire({ icon: "success", title: "Terhapus", timer: 1200, showConfirmButton: false, background: C.panel, color: C.text });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal menghapus", background: C.panel, color: C.text, confirmButtonColor: C.amber });
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 1.5, color: C.amber, textTransform: "uppercase", mb: 0.5 }}>
            Layanan Publik
          </Typography>
          <Typography variant="h4" sx={{ color: C.text, fontSize: 24 }}>
            Kontak Darurat
          </Typography>
        </Box>
        <Button
          onClick={openTambah}
          startIcon={<FiPlus />}
          variant="contained"
          sx={{ textTransform: "none", fontWeight: 600, bgcolor: C.amber, color: "#1A1200", "&:hover": { bgcolor: "#D9932E" } }}
        >
          Tambah Kontak
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: C.amber }} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {kontak.map((k) => (
            <Grid item xs={12} sm={6} md={4} key={k.id}>
              <Card sx={{ bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: "14px", p: 2.2 }} elevation={0}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                  <Chip
                    icon={<FiPhoneCall size={12} />}
                    label={k.kategori}
                    size="small"
                    sx={{ bgcolor: C.panel2, color: C.textDim, border: `1px solid ${C.border}`, fontSize: 11 }}
                  />
                  <Switch
                    size="small"
                    checked={!!k.is_active}
                    onChange={() => handleToggleActive(k)}
                    sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: C.teal }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: C.teal } }}
                  />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: C.text, mb: 0.4 }}>
                  {k.nama_kontak}
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.amber, mb: 0.6, fontFamily: "monospace" }}>
                  {k.nomor_telepon}
                </Typography>
                {k.kecamatan_nama && (
                  <Typography sx={{ fontSize: 12, color: C.textFaint, mb: 0.4 }}>Kec. {k.kecamatan_nama}</Typography>
                )}
                {k.keterangan && (
                  <Typography sx={{ fontSize: 12, color: C.textDim, mb: 1.5 }}>{k.keterangan}</Typography>
                )}
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <IconButton size="small" onClick={() => openEdit(k)} sx={{ color: C.textDim, border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                    <FiEdit2 size={14} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(k)} sx={{ color: C.red, border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                    <FiTrash2 size={14} />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
          {kontak.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
                Belum ada kontak darurat. Klik "Tambah Kontak" untuk menambahkan.
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <KontakFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={loadKontak}
      />
    </Box>
  );
}

function KontakFormModal({ open, onClose, editing, onSaved }) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              kategori: editing.kategori,
              nama_kontak: editing.nama_kontak,
              nomor_telepon: editing.nomor_telepon,
              keterangan: editing.keterangan || "",
              urutan: editing.urutan || 0,
            }
          : { kategori: "Lainnya", nama_kontak: "", nomor_telepon: "", keterangan: "", urutan: 0 }
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/kontak-darurat/${editing.id}`, values);
      } else {
        await api.post("/kontak-darurat", values);
      }
      Swal.fire({
        icon: "success",
        title: editing ? "Kontak diperbarui" : "Kontak ditambahkan",
        timer: 1200,
        showConfirmButton: false,
        background: C.panel,
        color: C.text,
      });
      onClose();
      onSaved();
    } catch (err) {
      const message =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "Gagal menyimpan kontak.";
      Swal.fire({ icon: "error", title: "Gagal", text: message, background: C.panel, color: C.text, confirmButtonColor: C.amber });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {editing ? "Edit Kontak Darurat" : "Tambah Kontak Darurat"}
        <IconButton size="small" onClick={onClose}>
          <FiX size={16} />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label="Kategori"
            margin="normal"
            defaultValue={editing ? editing.kategori : "Lainnya"}
            {...register("kategori", { required: true })}
          >
            {KATEGORI_LIST.map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Nama Kontak"
            margin="normal"
            error={!!errors.nama_kontak}
            helperText={errors.nama_kontak ? "Nama kontak wajib diisi." : ""}
            {...register("nama_kontak", { required: true })}
          />

          <TextField
            fullWidth
            label="Nomor Telepon"
            margin="normal"
            error={!!errors.nomor_telepon}
            helperText={errors.nomor_telepon ? "Nomor telepon wajib diisi." : ""}
            {...register("nomor_telepon", { required: true })}
          />

          <TextField
            fullWidth
            label="Keterangan (opsional)"
            margin="normal"
            placeholder="Contoh: Siaga 24 jam"
            {...register("keterangan")}
          />

          <TextField
            fullWidth
            type="number"
            label="Urutan Tampil"
            margin="normal"
            {...register("urutan", { valueAsNumber: true })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: "none", color: C.textDim }}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: C.amber, color: "#1A1200", "&:hover": { bgcolor: "#D9932E" } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: "#1A1200" }} /> : "Simpan"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}