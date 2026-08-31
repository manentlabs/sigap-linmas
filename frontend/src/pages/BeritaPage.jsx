// frontend/src/pages/berita/BeritaPage.jsx
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  TablePagination,
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiImage,
  FiSearch,
  FiGrid,
  FiClock,
} from "react-icons/fi";

import api from "../services/api";

// Palet disamakan persis dengan Sidebar.jsx supaya konsisten di seluruh dashboard
const C = {
  bg: "#F7F9FC",
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  amberBg: "rgba(242,169,59,0.14)",
  red: "#E5484D",
  redBg: "rgba(229,72,77,0.10)",
  teal: "#0EA5A5",
  tealBg: "rgba(14,165,165,0.10)",
  indigo: "#3B82F6",
  indigoBg: "rgba(59,130,246,0.10)",
};

// Basis URL untuk mengakses file gambar statis (folder /uploads di server, bukan di bawah /api).
// Sesuaikan VITE_FILE_URL di .env jika backend Anda men-serve static folder secara berbeda.
const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const EMPTY_FORM = {
  id: null,
  judul: "",
  kategori_id: "",
  ringkasan: "",
  konten: "",
  tanggal_publish: "",
  is_published: true,
};

export default function BeritaPage() {
  const [mode, setMode] = useState("tabel"); // "tabel" | "kaleidoskop"
  const [list, setList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterTahun, setFilterTahun] = useState("Semua");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  // Pagination sisi server (page dimulai dari 0 mengikuti konvensi MUI TablePagination)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [gambarFile, setGambarFile] = useState(null);
  const [gambarPreview, setGambarPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [kategoriDialogOpen, setKategoriDialogOpen] = useState(false);
  const [kategoriBaru, setKategoriBaru] = useState("");

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  const fetchKategori = useCallback(async () => {
    try {
      const res = await api.get("/kategori-berita");
      setKategoriList(res.data.data || []);
    } catch (err) {
      showToast("Gagal memuat daftar kategori", "error");
    }
  }, []);

  const fetchTahun = useCallback(async () => {
    try {
      const res = await api.get("/berita/tahun-list");
      setTahunList(res.data.data || []);
    } catch (err) {
      // diamkan, tidak kritikal untuk filter
    }
  }, []);

  // Debounce pencarian: tunggu 450ms setelah user berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 450);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset ke halaman pertama setiap kali filter/pencarian/mode berubah
  useEffect(() => {
    setPage(0);
  }, [filterTahun, filterKategori, filterStatus, qDebounced, mode]);

  const fetchBerita = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1, // backend pakai basis 1
        limit: rowsPerPage,
      };
      if (filterTahun !== "Semua") params.tahun = filterTahun;
      if (filterKategori !== "Semua") params.kategori_id = filterKategori;
      if (filterStatus === "Published") params.status = "published";
      if (filterStatus === "Draft") params.status = "draft";
      if (qDebounced) params.q = qDebounced;
      if (mode === "kaleidoskop") params.sort = "asc";

      const res = await api.get("/berita", { params });
      setList(res.data.data || []);
      setTotalRows(res.data.pagination?.total ?? 0);
    } catch (err) {
      showToast("Gagal memuat data berita", "error");
    } finally {
      setLoading(false);
    }
  }, [filterTahun, filterKategori, filterStatus, qDebounced, mode, page, rowsPerPage]);

  useEffect(() => {
    fetchKategori();
    fetchTahun();
  }, [fetchKategori, fetchTahun]);

  useEffect(() => {
    fetchBerita();
  }, [fetchBerita]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ---------------------------------------------------------------------
  // Form berita (tambah/edit)
  // ---------------------------------------------------------------------
  const openTambah = () => {
    setForm(EMPTY_FORM);
    setGambarFile(null);
    setGambarPreview(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      judul: item.judul,
      kategori_id: item.kategori_id,
      ringkasan: item.ringkasan,
      konten: item.konten || "",
      tanggal_publish: item.tanggal_publish ? item.tanggal_publish.slice(0, 10) : "",
      is_published: !!item.is_published,
    });
    setGambarFile(null);
    setGambarPreview(item.gambar_url ? `${FILE_BASE_URL}${item.gambar_url}` : null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const handleGambarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGambarFile(file);
    setGambarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.judul.trim() || !form.kategori_id || !form.ringkasan.trim() || !form.tanggal_publish) {
      showToast("Judul, kategori, ringkasan, dan tanggal publish wajib diisi", "error");
      return;
    }

    const fd = new FormData();
    fd.append("judul", form.judul);
    fd.append("kategori_id", form.kategori_id);
    fd.append("ringkasan", form.ringkasan);
    fd.append("konten", form.konten || "");
    fd.append("tanggal_publish", form.tanggal_publish);
    fd.append("is_published", form.is_published ? "1" : "0");
    if (gambarFile) fd.append("gambar", gambarFile);

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/berita/${form.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Berita berhasil diperbarui");
      } else {
        await api.post("/berita", fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Berita berhasil ditambahkan");
      }
      setFormOpen(false);
      fetchBerita();
      fetchTahun();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan berita", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus berita ini?",
      text: `"${item.judul}" akan dihapus permanen beserta gambarnya.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/berita/${item.id}`);
      showToast("Berita berhasil dihapus");
      // Kalau ini satu-satunya baris di halaman saat ini (bukan halaman pertama), mundur satu halaman
      if (list.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        fetchBerita();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menghapus berita", "error");
    }
  };

  // ---------------------------------------------------------------------
  // Tambah kategori cepat (dari dalam form berita)
  // ---------------------------------------------------------------------
  const handleTambahKategori = async () => {
    if (!kategoriBaru.trim()) return;
    try {
      const res = await api.post("/kategori-berita", { nama: kategoriBaru.trim() });
      const baru = res.data.data;
      setKategoriList((prev) => [...prev, baru].sort((a, b) => a.nama.localeCompare(b.nama)));
      setForm((f) => ({ ...f, kategori_id: baru.id }));
      setKategoriBaru("");
      setKategoriDialogOpen(false);
      showToast("Kategori berhasil ditambahkan");
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menambah kategori", "error");
    }
  };

  const kategoriNama = useMemo(() => {
    const map = {};
    kategoriList.forEach((k) => (map[k.id] = k.nama));
    return map;
  }, [kategoriList]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.3 }}>
            Publikasi
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Berita & Kaleidoskop Kegiatan
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={() => setMode("tabel")}
            startIcon={<FiGrid size={15} />}
            sx={tabBtnSx(mode === "tabel")}
          >
            Tabel
          </Button>
          <Button
            onClick={() => setMode("kaleidoskop")}
            startIcon={<FiClock size={15} />}
            sx={tabBtnSx(mode === "kaleidoskop")}
          >
            Kaleidoskop
          </Button>
          <Button onClick={openTambah} variant="contained" startIcon={<FiPlus size={15} />} sx={primaryBtnSx}>
            Tambah Berita
          </Button>
        </Box>
      </Box>

      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1.2, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Tahun</InputLabel>
          <Select label="Tahun" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            {tahunList.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kategori</InputLabel>
          <Select label="Kategori" value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            {kategoriList.map((k) => (
              <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {mode === "tabel" && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="Semua">Semua</MenuItem>
              <MenuItem value="Published">Published</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
            </Select>
          </FormControl>
        )}

        <TextField
          size="small"
          placeholder="Cari judul berita..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <FiSearch size={15} color={C.textFaint} style={{ marginRight: 8 }} />,
            },
          }}
          sx={{ minWidth: 220 }}
        />

        <Typography sx={{ ml: "auto", fontSize: 12.5, color: C.textFaint }}>
          {totalRows} berita ditemukan
        </Typography>
      </Box>

      {/* Konten */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : mode === "tabel" ? (
        <>
          <TabelBerita list={list} onEdit={openEdit} onDelete={handleDelete} />
          <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Baris per halaman"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            />
          </Box>
        </>
      ) : (
        <>
          <KaleidoskopView list={list} />
          <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", mt: "-1px" }}>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Baris per halaman"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            />
          </Box>
        </>
      )}

      {/* Dialog form tambah/edit */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit Berita" : "Tambah Berita Baru"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField
              label="Judul Berita"
              value={form.judul}
              onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
              fullWidth
              size="small"
            />

            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Kategori</InputLabel>
                <Select
                  label="Kategori"
                  value={form.kategori_id}
                  onChange={(e) => setForm((f) => ({ ...f, kategori_id: e.target.value }))}
                >
                  {kategoriList.map((k) => (
                    <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Tambah kategori baru">
                <IconButton onClick={() => setKategoriDialogOpen(true)} sx={{ border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                  <FiPlus size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              label="Ringkasan"
              value={form.ringkasan}
              onChange={(e) => setForm((f) => ({ ...f, ringkasan: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${form.ringkasan.length}/500`}
            />

            <TextField
              label="Konten Lengkap (opsional)"
              value={form.konten}
              onChange={(e) => setForm((f) => ({ ...f, konten: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={4}
            />

            <TextField
              label="Tanggal Publish"
              type="date"
              value={form.tanggal_publish}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_publish: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <Box>
              <Typography sx={{ fontSize: 12.5, color: C.textDim, mb: 0.7, fontWeight: 500 }}>Gambar Berita</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar variant="rounded" src={gambarPreview} sx={{ width: 64, height: 64, bgcolor: C.amberBg, borderRadius: "10px" }}>
                  <FiImage color={C.amber} />
                </Avatar>
                <Button component="label" variant="outlined" size="small" sx={{ textTransform: "none", borderColor: C.border, color: C.textDim }}>
                  Pilih Gambar
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleGambarChange} />
                </Button>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                  sx={{ "& .Mui-checked": { color: C.amber }, "& .Mui-checked + .MuiSwitch-track": { backgroundColor: C.amber } }}
                />
              }
              label={<Typography sx={{ fontSize: 13.5, color: C.text }}>{form.is_published ? "Published" : "Draft"}</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeForm} sx={{ color: C.textDim, textTransform: "none" }}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={primaryBtnSx}>
            {saving ? <CircularProgress size={18} sx={{ color: "#1A1200" }} /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tambah kategori cepat */}
      <Dialog open={kategoriDialogOpen} onClose={() => setKategoriDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Tambah Kategori Berita</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            label="Nama Kategori"
            value={kategoriBaru}
            onChange={(e) => setKategoriBaru(e.target.value)}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setKategoriDialogOpen(false)} sx={{ color: C.textDim, textTransform: "none" }}>Batal</Button>
          <Button onClick={handleTambahKategori} variant="contained" sx={primaryBtnSx}>Simpan</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ===========================================================================
// Sub-komponen: Tabel berita
// ===========================================================================
function TabelBerita({ list, onEdit, onDelete }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (list.length === 0) {
    return (
      <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
        Tidak ada berita yang sesuai dengan filter.
      </Box>
    );
  }

  // ---------- Tampilan kartu (mobile) ----------
  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {list.map((b) => (
          <Box
            key={b.id}
            sx={{
              bgcolor: "#FFFFFF",
              border: `1px solid ${C.border}`,
              borderRadius: "14px",
              p: 1.6,
              display: "flex",
              gap: 1.4,
            }}
          >
            <Avatar
              variant="rounded"
              src={b.gambar_url ? `${FILE_BASE_URL}${b.gambar_url}` : undefined}
              sx={{ width: 56, height: 56, bgcolor: C.amberBg, borderRadius: "10px", flexShrink: 0 }}
            >
              <FiImage size={18} color={C.amber} />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                  {b.judul}
                </Typography>
                <Box sx={{ display: "flex", flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => onEdit(b)} sx={{ color: C.indigo, p: 0.6 }}>
                    <FiEdit2 size={14} />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(b)} sx={{ color: C.red, p: 0.6 }}>
                    <FiTrash2 size={14} />
                  </IconButton>
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: 12.5,
                  color: C.textFaint,
                  mt: 0.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {b.ringkasan}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
                <Chip
                  label={b.is_published ? "Published" : "Draft"}
                  size="small"
                  sx={{
                    bgcolor: b.is_published ? C.tealBg : C.redBg,
                    color: b.is_published ? C.teal : C.red,
                    fontWeight: 600,
                    fontSize: 10.5,
                    height: 20,
                  }}
                />
                <Chip
                  label={b.kategori_nama}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10.5, height: 20, borderColor: C.border, color: C.textDim }}
                />
                <Typography sx={{ fontSize: 11, color: C.textFaint, fontFamily: "monospace", ml: "auto" }}>
                  {formatTanggal(b.tanggal_publish)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  // ---------- Tampilan tabel (desktop/tablet) ----------
  return (
    <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", overflowX: "auto" }}>
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            {["Gambar", "Judul", "Kategori", "Tanggal Publish", "Status", "Aksi"].map((h) => (
              <TableCell
                key={h}
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderBottom: `1px solid ${C.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((b) => (
            <TableRow key={b.id} hover>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Avatar
                  variant="rounded"
                  src={b.gambar_url ? `${FILE_BASE_URL}${b.gambar_url}` : undefined}
                  sx={{ width: 44, height: 44, bgcolor: C.amberBg, borderRadius: "8px" }}
                >
                  <FiImage size={16} color={C.amber} />
                </Avatar>
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, maxWidth: 280 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{b.judul}</Typography>
                <Typography sx={{ fontSize: 12, color: C.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.ringkasan}
                </Typography>
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{b.kategori_nama}</TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>
                {formatTanggal(b.tanggal_publish)}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Chip
                  label={b.is_published ? "Published" : "Draft"}
                  size="small"
                  sx={{
                    bgcolor: b.is_published ? C.tealBg : C.redBg,
                    color: b.is_published ? C.teal : C.red,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                />
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <IconButton size="small" onClick={() => onEdit(b)} sx={{ color: C.indigo, mr: 0.5 }}>
                  <FiEdit2 size={15} />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(b)} sx={{ color: C.red }}>
                  <FiTrash2 size={15} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ===========================================================================
// Sub-komponen: Tampilan kaleidoskop (timeline urut tanggal ASC, per halaman)
// ===========================================================================
function KaleidoskopView({ list }) {
  if (list.length === 0) {
    return (
      <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
        Belum ada kegiatan tercatat untuk filter ini.
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", p: 3 }}>
      <Box sx={{ position: "relative", pl: 3 }}>
        <Box sx={{ position: "absolute", left: 5, top: 6, bottom: 6, width: "2px", bgcolor: C.border }} />
        {list.map((b, i) => (
          <Box key={b.id} sx={{ position: "relative", pb: i === list.length - 1 ? 0 : 3.2 }}>
            <Box sx={{
              position: "absolute", left: -24, top: 3, width: 12, height: 12, borderRadius: "50%",
              bgcolor: C.amber, border: "2px solid #fff", boxShadow: `0 0 0 2px ${C.amber}`,
            }} />
            <Typography sx={{ fontFamily: "monospace", fontSize: 11, color: C.amber, mb: 0.4 }}>
              {formatTanggal(b.tanggal_publish)}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: C.text, mb: 0.4 }}>{b.judul}</Typography>
            <Typography sx={{ fontSize: 13, color: C.textDim }}>{b.ringkasan}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================
function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function tabBtnSx(active) {
  return {
    textTransform: "none",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: "9px",
    px: 1.6,
    color: active ? C.amber : C.textDim,
    bgcolor: active ? C.amberBg : "transparent",
    border: `1px solid ${active ? "rgba(242,169,59,0.4)" : C.border}`,
    "&:hover": { bgcolor: active ? C.amberBg : "rgba(19,28,43,0.04)" },
  };
}

const primaryBtnSx = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: "10px",
  bgcolor: C.amber,
  color: "#1A1200",
  boxShadow: "none",
  "&:hover": { bgcolor: "#DE9A2E", boxShadow: "none" },
};