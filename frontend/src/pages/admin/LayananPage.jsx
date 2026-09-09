// frontend/src/pages/admin/LayananPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Card,
  Pagination,
} from "@mui/material";
import { FiTrash2, FiEye, FiX, FiPhone, FiMapPin } from "react-icons/fi";

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
  indigo: "#6C8EFF",
};

const JENIS_LIST = [
  "Laporan Bencana",
  "Pengaduan Tantribumlinmas",
  "Posyandu",
  "Pengaduan Sampah",
];
const STATUS_LIST = ["Baru", "Diproses", "Selesai"];

function statusTone(status) {
  if (status === "Selesai") return C.teal;
  if (status === "Diproses") return C.amber;
  return C.red; // Baru
}

// FILE_BASE_URL dipakai untuk menampilkan foto bukti yang di-upload
// (foto_url dari database berupa path relatif, contoh: /uploads/layanan/xxx.jpg)
const FILE_BASE_URL = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

export default function LayananPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detail, setDetail] = useState(null); // item yang sedang dibuka di modal detail

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: res } = await api.get("/layanan-publik", {
        params: {
          jenis: filterJenis || undefined,
          status: filterStatus || undefined,
          page,
          limit: 12,
        },
      });
      setData(res.data || []);
      setTotalPages((res.pagination && res.pagination.totalPages) || 1);
    } catch (err) {
      setErrorMsg("Gagal memuat data. Pastikan Anda sudah login sebagai admin/kepala satgas.");
    } finally {
      setLoading(false);
    }
  }, [filterJenis, filterStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus laporan ini?",
      text: `Laporan ${item.kode_layanan} dari "${item.nama_pelapor}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      background: C.panel,
      color: C.text,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/layanan-publik/${item.id}`);
      setData((prev) => prev.filter((d) => d.id !== item.id));
      Swal.fire({ icon: "success", title: "Terhapus", timer: 1200, showConfirmButton: false, background: C.panel, color: C.text });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal menghapus", background: C.panel, color: C.text, confirmButtonColor: C.amber });
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 1.5, color: C.amber, textTransform: "uppercase", mb: 0.5 }}>
          Layanan Publik
        </Typography>
        <Typography variant="h4" sx={{ color: C.text, fontSize: 24 }}>
          Pelayanan Linmas
        </Typography>
        <Typography sx={{ fontSize: 13, color: C.textDim, mt: 0.5 }}>
          Laporan Bencana, Pengaduan Tantribumlinmas, Posyandu, dan Pengaduan Sampah dari warga.
        </Typography>
      </Box>

      {/* Filter */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Jenis Layanan"
          value={filterJenis}
          onChange={(e) => {
            setFilterJenis(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">Semua Jenis</MenuItem>
          {JENIS_LIST.map((j) => (
            <MenuItem key={j} value={j}>
              {j}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Status"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Semua Status</MenuItem>
          {STATUS_LIST.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {data.map((item) => (
            <Card
              key={item.id}
              sx={{ bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: "14px", p: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
              elevation={0}
            >
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{ fontFamily: "monospace", fontSize: 11.5, color: C.textFaint }}>
                    {item.kode_layanan}
                  </Typography>
                  <Chip label={item.jenis} size="small" sx={{ bgcolor: C.panel2, color: C.indigo, border: `1px solid ${C.border}`, fontSize: 10.5 }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{item.nama_pelapor}</Typography>
                <Box sx={{ display: "flex", gap: 2, mt: 0.5, flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: C.textDim }}>
                    <FiPhone size={12} /> {item.no_hp}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: C.textDim }}>
                    <FiMapPin size={12} /> {item.lokasi}
                  </Box>
                </Box>
              </Box>

              <Chip
                label={item.status}
                size="small"
                sx={{ bgcolor: `${statusTone(item.status)}22`, color: statusTone(item.status), border: `1px solid ${statusTone(item.status)}55`, fontWeight: 600 }}
              />

              <Box sx={{ display: "flex", gap: 0.8 }}>
                <IconButton size="small" onClick={() => setDetail(item)} sx={{ color: C.textDim, border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                  <FiEye size={14} />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(item)} sx={{ color: C.red, border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                  <FiTrash2 size={14} />
                </IconButton>
              </Box>
            </Card>
          ))}
          {data.length === 0 && (
            <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
              Belum ada laporan yang sesuai dengan filter.
            </Box>
          )}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            page={page}
            count={totalPages}
            onChange={(e, val) => setPage(val)}
            sx={{ "& .MuiPaginationItem-root": { color: C.textDim }, "& .Mui-selected": { bgcolor: `${C.amber}33 !important`, color: C.amber } }}
          />
        </Box>
      )}

      <DetailModal
        item={detail}
        onClose={() => setDetail(null)}
        onUpdated={(updated) => {
          setData((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
          setDetail(null);
        }}
      />
    </Box>
  );
}

function DetailModal({ item, onClose, onUpdated }) {
  const [status, setStatus] = useState("Baru");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setCatatan(item.catatan_tindak_lanjut || "");
    }
  }, [item]);

  if (!item) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/layanan-publik/${item.id}/status`, {
        status,
        catatan_tindak_lanjut: catatan || undefined,
      });
      Swal.fire({ icon: "success", title: "Status diperbarui", timer: 1200, showConfirmButton: false, background: C.panel, color: C.text });
      onUpdated({ ...item, status, catatan_tindak_lanjut: catatan });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal menyimpan", background: C.panel, color: C.text, confirmButtonColor: C.amber });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!item} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Detail Laporan — {item.kode_layanan}
        <IconButton size="small" onClick={onClose}>
          <FiX size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <InfoRow label="Jenis Layanan" value={item.jenis} />
        <InfoRow label="Nama Pelapor" value={item.nama_pelapor} />
        <InfoRow label="No. HP" value={item.no_hp} />
        <InfoRow label="Lokasi" value={item.lokasi} />
        <Box sx={{ mt: 1.5, mb: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.4 }}>Deskripsi</Typography>
          <Typography sx={{ fontSize: 13.5 }}>{item.deskripsi}</Typography>
        </Box>

        {item.foto_url && (
          <Box
            component="img"
            src={`${FILE_BASE_URL}${item.foto_url}`}
            alt="Foto bukti"
            sx={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 2, mb: 2 }}
          />
        )}

        <TextField
          select
          fullWidth
          label="Status"
          margin="normal"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_LIST.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Catatan Tindak Lanjut (opsional)"
          margin="normal"
          multiline
          minRows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Tutup
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 600, bgcolor: C.amber, color: "#1A1200", "&:hover": { bgcolor: "#D9932E" } }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: "#1A1200" }} /> : "Simpan Status"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}