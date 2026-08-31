// frontend/src/pages/anggota/AnggotaPage.jsx
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
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination,
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiSearch,
  FiEye,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiHash,
} from "react-icons/fi";

import api from "../services/api";

// Palet disamakan persis dengan Sidebar.jsx / BeritaPage.jsx supaya konsisten
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
  slate: "#64748B",
  slateBg: "rgba(100,116,139,0.10)",
};

const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const EMPTY_FORM = {
  id: null,
  nama: "",
  nik: "",
  jenis_kelamin: "L",
  tempat_lahir: "",
  tanggal_lahir: "",
  alamat: "",
  no_hp: "",
  kecamatan_id: "",
  tanggal_bergabung: "",
  status: "Aktif",
  bpjs_status: "Belum Terdaftar",
};

export default function AnggotaPage() {
  const [list, setList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterKecamatan, setFilterKecamatan] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterBpjs, setFilterBpjs] = useState("Semua");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  // Pagination sisi server (page dimulai dari 0 mengikuti konvensi MUI TablePagination)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  const fetchKecamatan = useCallback(async () => {
    try {
      const res = await api.get("/kecamatan");
      setKecamatanList(res.data.data || []);
    } catch (err) {
      showToast("Gagal memuat daftar kecamatan", "error");
    }
  }, []);

  // Debounce pencarian: tunggu 450ms setelah user berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 450);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset ke halaman pertama setiap kali filter/pencarian berubah
  useEffect(() => {
    setPage(0);
  }, [filterKecamatan, filterStatus, filterBpjs, qDebounced]);

  const fetchAnggota = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1, // backend pakai basis 1
        limit: rowsPerPage,
      };
      if (filterKecamatan !== "Semua") params.kecamatan_id = filterKecamatan;
      if (filterStatus !== "Semua") params.status = filterStatus;
      if (filterBpjs !== "Semua") params.bpjs_status = filterBpjs;
      if (qDebounced) params.q = qDebounced;

      const res = await api.get("/anggota", { params });
      setList(res.data.data || []);
      setTotalRows(res.data.pagination?.total ?? 0);
    } catch (err) {
      showToast("Gagal memuat data anggota", "error");
    } finally {
      setLoading(false);
    }
  }, [filterKecamatan, filterStatus, filterBpjs, qDebounced, page, rowsPerPage]);

  useEffect(() => {
    fetchKecamatan();
  }, [fetchKecamatan]);

  useEffect(() => {
    fetchAnggota();
  }, [fetchAnggota]);

  // ---------------------------------------------------------------------
  // Form anggota (tambah/edit)
  // ---------------------------------------------------------------------
  const openTambah = () => {
    setForm(EMPTY_FORM);
    setFotoFile(null);
    setFotoPreview(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      nama: item.nama,
      nik: item.nik,
      jenis_kelamin: item.jenis_kelamin,
      tempat_lahir: item.tempat_lahir || "",
      tanggal_lahir: item.tanggal_lahir ? item.tanggal_lahir.slice(0, 10) : "",
      alamat: item.alamat || "",
      no_hp: item.no_hp || "",
      kecamatan_id: item.kecamatan_id,
      tanggal_bergabung: item.tanggal_bergabung ? item.tanggal_bergabung.slice(0, 10) : "",
      status: item.status,
      bpjs_status: item.bpjs_status,
    });
    setFotoFile(null);
    setFotoPreview(item.foto_url ? `${FILE_BASE_URL}${item.foto_url}` : null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const openView = (item) => {
    setViewData(item);
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewData(null);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.nama.trim() || !form.nik.trim() || !form.kecamatan_id || !form.tanggal_bergabung) {
      showToast("Nama, NIK, kecamatan, dan tanggal bergabung wajib diisi", "error");
      return;
    }

    const fd = new FormData();
    fd.append("nama", form.nama);
    fd.append("nik", form.nik);
    fd.append("jenis_kelamin", form.jenis_kelamin);
    fd.append("tempat_lahir", form.tempat_lahir || "");
    fd.append("tanggal_lahir", form.tanggal_lahir || "");
    fd.append("alamat", form.alamat || "");
    fd.append("no_hp", form.no_hp || "");
    fd.append("kecamatan_id", form.kecamatan_id);
    fd.append("tanggal_bergabung", form.tanggal_bergabung);
    fd.append("status", form.status);
    fd.append("bpjs_status", form.bpjs_status);
    if (fotoFile) fd.append("foto", fotoFile);

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/anggota/${form.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Data anggota berhasil diperbarui");
      } else {
        await api.post("/anggota", fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Anggota berhasil ditambahkan");
      }
      setFormOpen(false);
      fetchAnggota();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan data anggota", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus anggota ini?",
      text: `"${item.nama}" (${item.kode_anggota}) akan dihapus permanen beserta datanya.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/anggota/${item.id}`);
      showToast("Data anggota berhasil dihapus");
      // Kalau ini satu-satunya baris di halaman saat ini (bukan halaman pertama), mundur satu halaman
      if (list.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        fetchAnggota();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menghapus data anggota", "error");
    }
  };

  const kecamatanNama = useMemo(() => {
    const map = {};
    kecamatanList.forEach((k) => (map[k.id] = k.nama));
    return map;
  }, [kecamatanList]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.3 }}>
            Keanggotaan
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Data Anggota Satlinmas
          </Typography>
        </Box>
        <Button onClick={openTambah} variant="contained" startIcon={<FiPlus size={15} />} sx={primaryBtnSx}>
          Tambah Anggota
        </Button>
      </Box>

      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1.2, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kecamatan</InputLabel>
          <Select label="Kecamatan" value={filterKecamatan} onChange={(e) => setFilterKecamatan(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            {kecamatanList.map((k) => (
              <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Aktif">Aktif</MenuItem>
            <MenuItem value="Nonaktif">Nonaktif</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status BPJS</InputLabel>
          <Select label="Status BPJS" value={filterBpjs} onChange={(e) => setFilterBpjs(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Belum Terdaftar">Belum Terdaftar</MenuItem>
            <MenuItem value="Proses">Proses</MenuItem>
            <MenuItem value="Aktif">Aktif</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Cari nama, kode, atau NIK..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <FiSearch size={15} color={C.textFaint} style={{ marginRight: 8 }} />,
            },
          }}
          sx={{ minWidth: 240 }}
        />

        <Typography sx={{ ml: "auto", fontSize: 12.5, color: C.textFaint }}>
          {totalRows} anggota ditemukan
        </Typography>
      </Box>

      {/* Konten */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : (
        <>
          <TabelAnggota
            list={list}
            kecamatanNama={kecamatanNama}
            onView={openView}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
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
      )}

      {/* Dialog form tambah/edit */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit Data Anggota" : "Tambah Anggota Baru"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={fotoPreview} sx={{ width: 64, height: 64, bgcolor: C.amberBg }}>
                <FiUser color={C.amber} />
              </Avatar>
              <Button component="label" variant="outlined" size="small" sx={{ textTransform: "none", borderColor: C.border, color: C.textDim }}>
                Pilih Foto
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFotoChange} />
              </Button>
            </Box>

            <TextField
              label="Nama Lengkap"
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              fullWidth
              size="small"
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="NIK"
                value={form.nik}
                onChange={(e) => setForm((f) => ({ ...f, nik: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ maxLength: 20 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Jenis Kelamin</InputLabel>
                <Select
                  label="Jenis Kelamin"
                  value={form.jenis_kelamin}
                  onChange={(e) => setForm((f) => ({ ...f, jenis_kelamin: e.target.value }))}
                >
                  <MenuItem value="L">Laki-laki</MenuItem>
                  <MenuItem value="P">Perempuan</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="Tempat Lahir"
                value={form.tempat_lahir}
                onChange={(e) => setForm((f) => ({ ...f, tempat_lahir: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Tanggal Lahir"
                type="date"
                value={form.tanggal_lahir}
                onChange={(e) => setForm((f) => ({ ...f, tanggal_lahir: e.target.value }))}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              label="Alamat"
              value={form.alamat}
              onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="No. HP"
                value={form.no_hp}
                onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                fullWidth
                size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Kecamatan</InputLabel>
                <Select
                  label="Kecamatan"
                  value={form.kecamatan_id}
                  onChange={(e) => setForm((f) => ({ ...f, kecamatan_id: e.target.value }))}
                >
                  {kecamatanList.map((k) => (
                    <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Tanggal Bergabung"
              type="date"
              value={form.tanggal_bergabung}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_bergabung: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <MenuItem value="Aktif">Aktif</MenuItem>
                  <MenuItem value="Nonaktif">Nonaktif</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Status BPJS</InputLabel>
                <Select
                  label="Status BPJS"
                  value={form.bpjs_status}
                  onChange={(e) => setForm((f) => ({ ...f, bpjs_status: e.target.value }))}
                >
                  <MenuItem value="Belum Terdaftar">Belum Terdaftar</MenuItem>
                  <MenuItem value="Proses">Proses</MenuItem>
                  <MenuItem value="Aktif">Aktif</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeForm} sx={{ color: C.textDim, textTransform: "none" }}>Batal</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={primaryBtnSx}>
            {saving ? <CircularProgress size={18} sx={{ color: "#1A1200" }} /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog detail lengkap anggota */}
      <Dialog open={viewOpen} onClose={closeView} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Detail Anggota</DialogTitle>
        <DialogContent dividers>
          {viewData && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  variant="square"
                  src={viewData.foto_url ? `${FILE_BASE_URL}${viewData.foto_url}` : undefined}
                  sx={{ width: 200, height: 200, bgcolor: C.amberBg }}
                >
                  <FiUser size={26} color={C.amber} />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                    {viewData.nama}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: C.textFaint, fontFamily: "monospace", mb: 0.6 }}>
                    {viewData.kode_anggota}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.8 }}>
                    Status
                    <Chip
                      label={viewData.status}
                      size="small"
                      sx={{
                        bgcolor: viewData.status === "Aktif" ? C.tealBg : C.redBg,
                        color: viewData.status === "Aktif" ? C.teal : C.red,
                        fontWeight: 600,
                        fontSize: 8,
                      }}
                    />
                    BPJS
                    <Chip
                      label={viewData.bpjs_status}
                      size="small"
                      sx={{
                        bgcolor: bpjsChipColor(viewData.bpjs_status).bg,
                        color: bpjsChipColor(viewData.bpjs_status).color,
                        fontWeight: 600,
                        fontSize: 8,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <DetailItem icon={<FiHash size={14} />} label="NIK" value={viewData.nik} />
                <DetailItem
                  icon={<FiUser size={14} />}
                  label="Jenis Kelamin"
                  value={viewData.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                />
                <DetailItem
                  icon={<FiCalendar size={14} />}
                  label="Tempat, Tanggal Lahir"
                  value={
                    viewData.tempat_lahir || viewData.tanggal_lahir
                      ? `${viewData.tempat_lahir || "-"}, ${formatTanggal(viewData.tanggal_lahir)}`
                      : "-"
                  }
                />
                <DetailItem icon={<FiPhone size={14} />} label="No. HP" value={viewData.no_hp || "-"} />
                <DetailItem
                  icon={<FiMapPin size={14} />}
                  label="Kecamatan"
                  value={viewData.kecamatan_nama || "-"}
                />
                <DetailItem
                  icon={<FiCalendar size={14} />}
                  label="Tanggal Bergabung"
                  value={formatTanggal(viewData.tanggal_bergabung)}
                />
              </Box>

              <DetailItem
                icon={<FiMapPin size={14} />}
                label="Alamat"
                value={viewData.alamat || "-"}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeView} sx={{ color: C.textDim, textTransform: "none" }}>Tutup</Button>
          <Button
            onClick={() => {
              closeView();
              openEdit(viewData);
            }}
            variant="contained"
            startIcon={<FiEdit2 size={14} />}
            sx={primaryBtnSx}
          >
            Edit Data
          </Button>
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
// Sub-komponen: Tabel anggota
// ===========================================================================
function TabelAnggota({ list, kecamatanNama, onView, onEdit, onDelete }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (list.length === 0) {
    return (
      <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
        Tidak ada anggota yang sesuai dengan filter.
      </Box>
    );
  }

  // ---------- Tampilan kartu (mobile) ----------
  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {list.map((a) => (
          <Box
            key={a.id}
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
              src={a.foto_url ? `${FILE_BASE_URL}${a.foto_url}` : undefined}
              sx={{ width: 52, height: 52, bgcolor: C.amberBg, flexShrink: 0 }}
            >
              <FiUser size={18} color={C.amber} />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                    {a.nama}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace" }}>
                    {a.kode_anggota} • {a.nik}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => onView(a)} sx={{ color: C.slate, p: 0.6 }}>
                    <FiEye size={14} />
                  </IconButton>
                  <IconButton size="small" onClick={() => onEdit(a)} sx={{ color: C.indigo, p: 0.6 }}>
                    <FiEdit2 size={14} />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(a)} sx={{ color: C.red, p: 0.6 }}>
                    <FiTrash2 size={14} />
                  </IconButton>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 12.5, color: C.textDim, mt: 0.6 }}>
                {a.kecamatan_nama || kecamatanNama[a.kecamatan_id] || "-"}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
                <Chip
                  label={a.status}
                  size="small"
                  sx={{
                    bgcolor: a.status === "Aktif" ? C.tealBg : C.redBg,
                    color: a.status === "Aktif" ? C.teal : C.red,
                    fontWeight: 600,
                    fontSize: 10.5,
                    height: 20,
                  }}
                />
                <Chip
                  label={a.bpjs_status}
                  size="small"
                  sx={{
                    bgcolor: bpjsChipColor(a.bpjs_status).bg,
                    color: bpjsChipColor(a.bpjs_status).color,
                    fontWeight: 600,
                    fontSize: 10.5,
                    height: 20,
                  }}
                />
                <Typography sx={{ fontSize: 11, color: C.textFaint, fontFamily: "monospace", ml: "auto" }}>
                  {formatTanggal(a.tanggal_bergabung)}
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
            {["Foto", "Kode", "Nama", "Kecamatan", "Bergabung", "Status", "BPJS", "Aksi"].map((h) => (
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
          {list.map((a) => (
            <TableRow key={a.id} hover>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Avatar
                  src={a.foto_url ? `${FILE_BASE_URL}${a.foto_url}` : undefined}
                  sx={{ width: 40, height: 40, bgcolor: C.amberBg }}
                >
                  <FiUser size={16} color={C.amber} />
                </Avatar>
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>
                {a.kode_anggota}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, maxWidth: 220 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{a.nama}</Typography>
                <Typography sx={{ fontSize: 12, color: C.textFaint }}>{a.nik}</Typography>
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                {a.kecamatan_nama || kecamatanNama[a.kecamatan_id] || "-"}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>
                {formatTanggal(a.tanggal_bergabung)}
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Chip
                  label={a.status}
                  size="small"
                  sx={{
                    bgcolor: a.status === "Aktif" ? C.tealBg : C.redBg,
                    color: a.status === "Aktif" ? C.teal : C.red,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                />
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <Chip
                  label={a.bpjs_status}
                  size="small"
                  sx={{
                    bgcolor: bpjsChipColor(a.bpjs_status).bg,
                    color: bpjsChipColor(a.bpjs_status).color,
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                />
              </TableCell>
              <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                <IconButton size="small" onClick={() => onView(a)} sx={{ color: C.slate, mr: 0.5 }}>
                  <FiEye size={15} />
                </IconButton>
                <IconButton size="small" onClick={() => onEdit(a)} sx={{ color: C.indigo, mr: 0.5 }}>
                  <FiEdit2 size={15} />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(a)} sx={{ color: C.red }}>
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
// Sub-komponen: Item label-value di dialog detail anggota
// ===========================================================================
function DetailItem({ icon, label, value, fullWidth }) {
  return (
    <Box sx={{ gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.4 }}>
        <Box sx={{ color: C.amber, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: C.text }}>{value}</Typography>
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

function bpjsChipColor(status) {
  if (status === "Aktif") return { bg: C.tealBg, color: C.teal };
  if (status === "Proses") return { bg: C.amberBg, color: C.amber };
  return { bg: C.slateBg, color: C.slate };
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