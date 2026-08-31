// frontend/src/pages/laporan/LaporanPage.jsx
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useState, useEffect, useCallback } from "react";
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
  Tabs,
  Tab,
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
  CircularProgress,
  Snackbar,
  Alert,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
  FiDownload,
  FiCamera,
  FiHash,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiFileText,
  FiX,
  FiMail,
  FiFolder,
} from "react-icons/fi";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "../services/api";
import Swal from "sweetalert2";

// Palet warna (konsisten dengan komponen lain)
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
  purple: "#8B5CF6",
  purpleBg: "rgba(139,92,246,0.10)",
};

const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const BULAN_NAMA = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ============================================================================
//  KOMPONEN UTAMA
// ============================================================================
export default function LaporanPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.3 }}>
            Kegiatan
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Laporan Satlinmas
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: `1px solid ${C.border}` }}>
        <Tab label="Non‑P3K Paruh Waktu" icon={<FiFileText size={16} />} iconPosition="start" />
        <Tab label="Laporan Bulanan Kecamatan" icon={<FiFolder size={16} />} iconPosition="start" />
      </Tabs>

      {/* Tab panels */}
      {tab === 0 && <LaporanNonP3K />}
      {tab === 1 && <LaporanBulanan />}
    </Box>
  );
}

// ============================================================================
//  TAB 1 – LAPORAN NON‑P3K (Paruh Waktu)
// ============================================================================
function LaporanNonP3K() {
  // State data
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Filter
  const [filterKecamatan, setFilterKecamatan] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dropdown
  const [kecamatanList, setKecamatanList] = useState([]);

  // Form (tambah/edit)
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    id: null,
    tanggal: new Date().toISOString().split("T")[0],
    kecamatan_id: "",
    status: "Proses",
    kepada: "Yth. Kepala Satuan Polisi Pamong Praja",
    dari: "Bidang Linmas",
    nomor_surat: "",
    perihal: "",
    dasar_surat: "",
    isi_laporan: [""],
    nama_pelapor: "",
    jabatan_pelapor: "SATGAS LINMAS",
  });
  const [fotoFilesBaru, setFotoFilesBaru] = useState([]);
  const [fotoExisting, setFotoExisting] = useState([]);
  const [fotoHapusIds, setFotoHapusIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Toast
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // -------------------------------------------------------------------------
  //  Ambil data dropdown
  // -------------------------------------------------------------------------
  useEffect(() => {
    api.get("/kecamatan").then(res => setKecamatanList(res.data.data || [])).catch(() => {});
  }, []);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [filterKecamatan, filterStatus, filterTanggal, debouncedSearch]);

  // -------------------------------------------------------------------------
  //  Ambil daftar laporan
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filterKecamatan !== "Semua") params.kecamatan_id = filterKecamatan;
      if (filterStatus !== "Semua") params.status = filterStatus;
      if (filterTanggal) params.tanggal = filterTanggal;
      if (debouncedSearch) params.q = debouncedSearch;

      const res = await api.get("/laporan", { params });
      setList(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      showToast("Gagal memuat laporan", "error");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterKecamatan, filterStatus, filterTanggal, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  //  Reset state foto
  // -------------------------------------------------------------------------
  const resetFotoState = () => {
    setFotoFilesBaru([]);
    setFotoExisting([]);
    setFotoHapusIds([]);
  };

  // -------------------------------------------------------------------------
  //  Buka form tambah / edit
  // -------------------------------------------------------------------------
  const openTambah = () => {
    setForm({
      id: null,
      tanggal: new Date().toISOString().split("T")[0],
      kecamatan_id: "",
      status: "Proses",
      kepada: "Yth. Kepala Satuan Polisi Pamong Praja",
      dari: "Bidang Linmas",
      nomor_surat: "",
      perihal: "",
      dasar_surat: "",
      isi_laporan: [""],
      nama_pelapor: "",
      jabatan_pelapor: "SATGAS LINMAS",
    });
    resetFotoState();
    setFormOpen(true);
  };

  const openEdit = async (item) => {
    try {
      const res = await api.get(`/laporan/${item.id}`);
      const data = res.data.data;
      setForm({
        id: data.id,
        tanggal: data.tanggal,
        kecamatan_id: data.kecamatan_id,
        status: data.status,
        kepada: data.kepada || "",
        dari: data.dari || "",
        nomor_surat: data.nomor_surat || "",
        perihal: data.perihal || "",
        dasar_surat: data.dasar_surat || "",
        isi_laporan: data.isi_laporan?.length ? data.isi_laporan : [""],
        nama_pelapor: data.nama_pelapor || "",
        jabatan_pelapor: data.jabatan_pelapor || "SATGAS LINMAS",
      });
      setFotoExisting(data.foto_list || []);
      setFotoFilesBaru([]);
      setFotoHapusIds([]);
      setFormOpen(true);
    } catch {
      showToast("Gagal mengambil detail laporan", "error");
    }
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  // -------------------------------------------------------------------------
  //  Manajemen foto banyak
  // -------------------------------------------------------------------------
  const handleFotoBanyakChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setFotoFilesBaru(prev => [...prev, ...files]);
      e.target.value = "";
    }
  };
  const removeFotoBaru = (idx) => {
    setFotoFilesBaru(prev => prev.filter((_, i) => i !== idx));
  };
  const removeFotoExisting = (fotoId) => {
    setFotoExisting(prev => prev.filter(f => f.id !== fotoId));
    setFotoHapusIds(prev => [...prev, fotoId]);
  };

  // -------------------------------------------------------------------------
  //  Manajemen isi_laporan (poin)
  // -------------------------------------------------------------------------
  const updatePoin = (idx, value) => {
    setForm(f => {
      const isi = [...f.isi_laporan];
      isi[idx] = value;
      return { ...f, isi_laporan: isi };
    });
  };
  const tambahPoin = () => {
    setForm(f => ({ ...f, isi_laporan: [...f.isi_laporan, ""] }));
  };
  const hapusPoin = (idx) => {
    setForm(f => {
      const isi = f.isi_laporan.filter((_, i) => i !== idx);
      return { ...f, isi_laporan: isi.length ? isi : [""] };
    });
  };

  // -------------------------------------------------------------------------
  //  Submit form
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    const poinValid = form.isi_laporan.filter(p => p.trim());
    if (!form.tanggal || !form.kecamatan_id || !form.perihal.trim() || !form.dasar_surat.trim() || !form.nama_pelapor.trim() || poinValid.length === 0) {
      showToast("Tanggal, kecamatan, perihal, dasar surat, nama pelapor, dan minimal 1 poin isi laporan wajib diisi", "error");
      return;
    }

    const fd = new FormData();
    fd.append("tanggal", form.tanggal);
    fd.append("kecamatan_id", form.kecamatan_id);
    fd.append("status", form.status);
    fd.append("kepada", form.kepada);
    fd.append("dari", form.dari);
    fd.append("nomor_surat", form.nomor_surat);
    fd.append("perihal", form.perihal);
    fd.append("dasar_surat", form.dasar_surat);
    fd.append("nama_pelapor", form.nama_pelapor);
    fd.append("jabatan_pelapor", form.jabatan_pelapor);
    fd.append("isi_laporan", JSON.stringify(poinValid));

    fotoFilesBaru.forEach(file => fd.append("foto", file));
    if (form.id && fotoHapusIds.length) {
      fd.append("hapus_foto_ids", JSON.stringify(fotoHapusIds));
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/laporan/${form.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Laporan berhasil diperbarui");
      } else {
        await api.post("/laporan", fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Laporan berhasil dibuat");
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan laporan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  //  Hapus
  // -------------------------------------------------------------------------
  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus laporan ini?",
      text: `Laporan "${item.kode_laporan}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/laporan/${item.id}`);
      showToast("Laporan berhasil dihapus");
      if (list.length === 1 && page > 0) setPage(p => p - 1);
      else fetchData();
    } catch {
      showToast("Gagal menghapus laporan", "error");
    }
  };

  // -------------------------------------------------------------------------
  //  Detail
  // -------------------------------------------------------------------------
  const openDetail = async (item) => {
    try {
      const res = await api.get(`/laporan/${item.id}`);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch {
      showToast("Gagal memuat detail", "error");
    }
  };
  const closeDetail = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  // -------------------------------------------------------------------------
  //  PDF
  // -------------------------------------------------------------------------
  const downloadFilteredPDF = async () => {
    try {
      const params = {};
      if (filterKecamatan !== "Semua") params.kecamatan_id = filterKecamatan;
      if (filterStatus !== "Semua") params.status = filterStatus;
      if (filterTanggal) params.tanggal = filterTanggal;
      if (debouncedSearch) params.q = debouncedSearch;

      const res = await api.get("/laporan/pdf", { params, responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "laporan-non-p3k.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Gagal mengunduh PDF", "error");
    }
  };

  const downloadSinglePDF = async (id) => {
    try {
      const res = await api.get(`/laporan/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `laporan-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Gagal mengunduh PDF", "error");
    }
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // =========================================================================
  //  RENDER TAB NON‑P3K
  // =========================================================================
  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1.2, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kecamatan</InputLabel>
          <Select label="Kecamatan" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            {kecamatanList.map(k => <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Proses">Proses</MenuItem>
            <MenuItem value="Selesai">Selesai</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="Tanggal"
          value={filterTanggal}
          onChange={e => setFilterTanggal(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 170 }}
        />

        <TextField
          size="small"
          placeholder="Cari kode, perihal, petugas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <FiSearch size={15} color={C.textFaint} style={{ marginRight: 8 }} />,
            },
          }}
          sx={{ minWidth: 260 }}
        />

        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button onClick={downloadFilteredPDF} variant="outlined" startIcon={<FiDownload size={15} />} sx={outlineBtnSx}>
            Download Semua
          </Button>
          <Button onClick={openTambah} variant="contained" startIcon={<FiPlus size={15} />} sx={primaryBtnSx}>
            Tambah Laporan
          </Button>
        </Box>
      </Box>

      {/* Tabel */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : (
        <>
          {isMobile ? (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {list.map(item => (
                  <Box
                    key={item.id}
                    sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px", p: 1.6 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                          {item.perihal || "-"}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace" }}>
                          {item.kode_laporan}
                        </Typography>
                      </Box>
                      <Chip label={item.status} size="small" sx={{
                        bgcolor: item.status === "Selesai" ? C.tealBg : C.amberBg,
                        color: item.status === "Selesai" ? C.teal : C.amber,
                        fontWeight: 600, fontSize: 10.5, height: 20, flexShrink: 0,
                      }} />
                    </Box>

                    <Typography sx={{ fontSize: 12.5, color: C.textDim, mt: 0.8 }}>
                      {item.kecamatan_nama} · {item.petugas_nama}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace", mt: 0.3 }}>
                      {formatTanggal(item.tanggal)}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.3, mt: 1 }}>
                      <IconButton size="small" onClick={() => openDetail(item)} sx={{ color: C.slate, p: 0.6 }}><FiEye size={14} /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: C.indigo, p: 0.6 }}><FiEdit2 size={14} /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(item)} sx={{ color: C.red, p: 0.6 }}><FiTrash2 size={14} /></IconButton>
                    </Box>
                  </Box>
                ))}
                {list.length === 0 && (
                  <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px", py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
                    Belum ada laporan Non‑P3K.
                  </Box>
                )}
              </Box>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", mt: 1.2 }}>
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="Baris"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
                />
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", overflowX: "auto" }}>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      {["Kode", "Tanggal", "Kecamatan", "Petugas", "Perihal", "Status", "Aksi"].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map(item => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>{item.kode_laporan}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>{formatTanggal(item.tanggal)}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{item.kecamatan_nama}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{item.petugas_nama}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>
                          {item.perihal || "-"}
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                          <Chip label={item.status} size="small" sx={{
                            bgcolor: item.status === "Selesai" ? C.tealBg : C.amberBg,
                            color: item.status === "Selesai" ? C.teal : C.amber,
                            fontWeight: 600, fontSize: 11.5,
                          }} />
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                          <IconButton size="small" onClick={() => openDetail(item)} sx={{ color: C.slate, mr: 0.5 }}><FiEye size={15} /></IconButton>
                          <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: C.indigo, mr: 0.5 }}><FiEdit2 size={15} /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(item)} sx={{ color: C.red }}><FiTrash2 size={15} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {list.length === 0 && (
                  <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
                    Belum ada laporan Non‑P3K.
                  </Box>
                )}
              </Box>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
                <TablePagination
                  component="div"
                  count={total}
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
        </>
      )}

      {/* Dialog Form */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit Laporan Non‑P3K" : "Tambah Laporan Non‑P3K"}
          <Chip label="Non P3K Paruh Waktu" size="small" sx={{ ml: 1.2, bgcolor: C.purpleBg, color: C.purple, fontWeight: 600, fontSize: 11.5 }} />
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField label="Tanggal" type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth size="small" />
            <FormControl fullWidth size="small">
              <InputLabel>Kecamatan</InputLabel>
              <Select label="Kecamatan" value={form.kecamatan_id} onChange={e => setForm(f => ({ ...f, kecamatan_id: e.target.value }))}>
                {kecamatanList.map(k => <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Kepada" value={form.kepada} onChange={e => setForm(f => ({ ...f, kepada: e.target.value }))} fullWidth size="small" />
            <TextField label="Dari" value={form.dari} onChange={e => setForm(f => ({ ...f, dari: e.target.value }))} fullWidth size="small" />
            <TextField label="Nomor Surat" placeholder="300.1.4/xxx/Bid.Linmas/2026" value={form.nomor_surat} onChange={e => setForm(f => ({ ...f, nomor_surat: e.target.value }))} fullWidth size="small" />
            <TextField label="Perihal" value={form.perihal} onChange={e => setForm(f => ({ ...f, perihal: e.target.value }))} fullWidth size="small" />
            <TextField label="Dasar Surat" value={form.dasar_surat} onChange={e => setForm(f => ({ ...f, dasar_surat: e.target.value }))} fullWidth size="small" multiline minRows={2} />

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Isi Laporan (poin bernomor)</Typography>
              {form.isi_laporan.map((poin, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "flex-start" }}>
                  <Typography sx={{ fontSize: 13, color: C.textFaint, mt: 1, minWidth: 18 }}>{idx + 1}.</Typography>
                  <TextField value={poin} onChange={e => updatePoin(idx, e.target.value)} fullWidth size="small" multiline minRows={1} />
                  <IconButton size="small" onClick={() => hapusPoin(idx)} sx={{ color: C.red, mt: 0.3 }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={tambahPoin} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Poin</Button>
            </Box>

            <TextField label="Nama Pelapor" value={form.nama_pelapor} onChange={e => setForm(f => ({ ...f, nama_pelapor: e.target.value }))} fullWidth size="small" />
            <TextField label="Jabatan Pelapor" value={form.jabatan_pelapor} onChange={e => setForm(f => ({ ...f, jabatan_pelapor: e.target.value }))} fullWidth size="small" />

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <MenuItem value="Proses">Proses</MenuItem>
                <MenuItem value="Selesai">Selesai</MenuItem>
              </Select>
            </FormControl>

            {/* Foto */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Foto Kegiatan (bisa lebih dari satu)</Typography>
              <Button component="label" variant="outlined" size="small" startIcon={<FiCamera size={14} />} sx={{ textTransform: "none", borderColor: C.border, color: C.textDim, mb: 1.2 }}>
                Tambah Foto
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFotoBanyakChange} />
              </Button>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {fotoExisting.map(foto => (
                  <Box key={foto.id} sx={{ position: "relative" }}>
                    <Box component="img" src={`${FILE_BASE_URL}${foto.foto_url}`} sx={{ width: 70, height: 70, objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />
                    <IconButton size="small" onClick={() => removeFotoExisting(foto.id)} sx={{ position: "absolute", top: -8, right: -8, bgcolor: C.red, color: "#fff", width: 20, height: 20, "&:hover": { bgcolor: C.red } }}>
                      <FiX size={11} />
                    </IconButton>
                  </Box>
                ))}
                {fotoFilesBaru.map((file, idx) => (
                  <Box key={idx} sx={{ position: "relative" }}>
                    <Box component="img" src={URL.createObjectURL(file)} sx={{ width: 70, height: 70, objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />
                    <IconButton size="small" onClick={() => removeFotoBaru(idx)} sx={{ position: "absolute", top: -8, right: -8, bgcolor: C.red, color: "#fff", width: 20, height: 20, "&:hover": { bgcolor: C.red } }}>
                      <FiX size={11} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
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

      {/* Dialog Detail */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Detail Laporan Non‑P3K</DialogTitle>
        <DialogContent dividers>
          {detailData && <DetailNonP3K data={detailData} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDetail} sx={{ color: C.textDim, textTransform: "none" }}>Tutup</Button>
          <Button onClick={() => downloadSinglePDF(detailData?.id)} variant="outlined" startIcon={<FiDownload size={14} />} sx={outlineBtnSx}>Download PDF</Button>
          <Button onClick={() => { closeDetail(); openEdit(detailData); }} variant="contained" startIcon={<FiEdit2 size={14} />} sx={primaryBtnSx}>Edit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(t => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ============================================================================
//  TAB 2 – LAPORAN BULANAN KECAMATAN
// ============================================================================
function LaporanBulanan() {
  // State data
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Filter
  const [filterKecamatan, setFilterKecamatan] = useState("Semua");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [filterStatus, setFilterStatus] = useState("Semua");

  // Dropdown
  const [kecamatanList, setKecamatanList] = useState([]);

  // Form (tambah/edit)
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    id: null,
    kecamatan_id: "",
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    dasar_surat_nomor: "",
    dasar_surat_perihal: "",
    jenis_operasi: "",
    sasaran_operasi: "",
    misi_metode_operasi: "",
    misi_sop: "",
    tanggal_kegiatan: [],
    hambatan: [],
    solusi: [],
    rekap_kegiatan: [],
    daftar_petugas: [],
    status: "Proses",
  });
  const [saving, setSaving] = useState(false);

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Toast
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // -------------------------------------------------------------------------
  //  Ambil data dropdown
  // -------------------------------------------------------------------------
  useEffect(() => {
    api.get("/kecamatan").then(res => setKecamatanList(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filterKecamatan, filterBulan, filterTahun, filterStatus]);

  // -------------------------------------------------------------------------
  //  Ambil daftar laporan bulanan
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filterKecamatan !== "Semua") params.kecamatan_id = filterKecamatan;
      if (filterBulan) params.bulan = filterBulan;
      if (filterTahun) params.tahun = filterTahun;
      if (filterStatus !== "Semua") params.status = filterStatus;

      const res = await api.get("/laporan/bulanan", { params });
      setList(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      showToast("Gagal memuat laporan bulanan", "error");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterKecamatan, filterBulan, filterTahun, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  //  Buka form tambah / edit
  // -------------------------------------------------------------------------
  const resetForm = () => {
    setForm({
      id: null,
      kecamatan_id: "",
      bulan: new Date().getMonth() + 1,
      tahun: new Date().getFullYear(),
      dasar_surat_nomor: "",
      dasar_surat_perihal: "",
      jenis_operasi: "",
      sasaran_operasi: "",
      misi_metode_operasi: "",
      misi_sop: "",
      tanggal_kegiatan: [],
      hambatan: [],
      solusi: [],
      rekap_kegiatan: [],
      daftar_petugas: [],
      status: "Proses",
    });
  };

  const openTambah = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = async (item) => {
    try {
      const res = await api.get(`/laporan/bulanan/${item.id}`);
      const data = res.data.data;
      setForm({
        id: data.id,
        kecamatan_id: data.kecamatan_id,
        bulan: data.bulan,
        tahun: data.tahun,
        dasar_surat_nomor: data.dasar_surat_nomor || "",
        dasar_surat_perihal: data.dasar_surat_perihal || "",
        jenis_operasi: data.jenis_operasi || "",
        sasaran_operasi: data.sasaran_operasi || "",
        misi_metode_operasi: data.misi_metode_operasi || "",
        misi_sop: data.misi_sop || "",
        tanggal_kegiatan: data.tanggal_kegiatan || [],
        hambatan: data.hambatan || [],
        solusi: data.solusi || [],
        rekap_kegiatan: data.rekap_kegiatan || [],
        daftar_petugas: data.daftar_petugas || [],
        status: data.status || "Proses",
      });
      setFormOpen(true);
    } catch {
      showToast("Gagal mengambil detail laporan", "error");
    }
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  // -------------------------------------------------------------------------
  //  Helper untuk array
  // -------------------------------------------------------------------------
  const pushToArray = (field, value) => {
    setForm(f => ({ ...f, [field]: [...f[field], value] }));
  };
  const removeFromArray = (field, index) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  };
  const updateArrayItem = (field, index, value) => {
    setForm(f => {
      const arr = [...f[field]];
      arr[index] = value;
      return { ...f, [field]: arr };
    });
  };
  // Untuk rekap_kegiatan (array of objects)
  const updateRekapKegiatan = (index, key, value) => {
    setForm(f => {
      const arr = [...f.rekap_kegiatan];
      if (!arr[index]) arr[index] = { tanggal: "", kegiatan: [] };
      arr[index][key] = value;
      return { ...f, rekap_kegiatan: arr };
    });
  };
  const addKegiatanItem = (index, label, jumlah) => {
    setForm(f => {
      const arr = [...f.rekap_kegiatan];
      if (!arr[index]) arr[index] = { tanggal: "", kegiatan: [] };
      arr[index].kegiatan.push({ label, jumlah: jumlah || "" });
      return { ...f, rekap_kegiatan: arr };
    });
  };
  const removeKegiatanItem = (groupIdx, itemIdx) => {
    setForm(f => {
      const arr = [...f.rekap_kegiatan];
      if (arr[groupIdx]) {
        arr[groupIdx].kegiatan = arr[groupIdx].kegiatan.filter((_, i) => i !== itemIdx);
        if (arr[groupIdx].kegiatan.length === 0) {
          arr.splice(groupIdx, 1);
        }
      }
      return { ...f, rekap_kegiatan: arr };
    });
  };
  // Untuk daftar_petugas (array of {nama})
  const updatePetugas = (index, value) => {
    setForm(f => {
      const arr = [...f.daftar_petugas];
      arr[index] = { nama: value };
      return { ...f, daftar_petugas: arr };
    });
  };

  // -------------------------------------------------------------------------
  //  Submit form
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!form.kecamatan_id || !form.bulan || !form.tahun || !form.jenis_operasi.trim()) {
      showToast("Kecamatan, bulan, tahun, dan jenis operasi wajib diisi", "error");
      return;
    }

    const payload = {
      kecamatan_id: form.kecamatan_id,
      bulan: form.bulan,
      tahun: form.tahun,
      dasar_surat_nomor: form.dasar_surat_nomor || null,
      dasar_surat_perihal: form.dasar_surat_perihal || null,
      jenis_operasi: form.jenis_operasi,
      sasaran_operasi: form.sasaran_operasi || null,
      misi_metode_operasi: form.misi_metode_operasi || null,
      misi_sop: form.misi_sop || null,
      tanggal_kegiatan: form.tanggal_kegiatan,
      hambatan: form.hambatan,
      solusi: form.solusi,
      rekap_kegiatan: form.rekap_kegiatan.map(g => ({
        tanggal: g.tanggal,
        kegiatan: g.kegiatan.map(k => ({ label: k.label, jumlah: k.jumlah })),
      })),
      daftar_petugas: form.daftar_petugas.map(p => ({ nama: p.nama })),
      status: form.status,
    };

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/laporan/bulanan/${form.id}`, payload);
        showToast("Laporan bulanan berhasil diperbarui");
      } else {
        await api.post("/laporan/bulanan", payload);
        showToast("Laporan bulanan berhasil dibuat");
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan laporan", "error");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  //  Hapus
  // -------------------------------------------------------------------------
  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus laporan ini?",
      text: `Laporan "${item.kode_laporan}" akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      cancelButtonColor: "#94A3B8",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/laporan/bulanan/${item.id}`);
      showToast("Laporan bulanan berhasil dihapus");
      if (list.length === 1 && page > 0) setPage(p => p - 1);
      else fetchData();
    } catch {
      showToast("Gagal menghapus laporan", "error");
    }
  };

  // -------------------------------------------------------------------------
  //  Detail
  // -------------------------------------------------------------------------
  const openDetail = async (item) => {
    try {
      const res = await api.get(`/laporan/bulanan/${item.id}`);
      setDetailData(res.data.data);
      setDetailOpen(true);
    } catch {
      showToast("Gagal memuat detail", "error");
    }
  };
  const closeDetail = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  // -------------------------------------------------------------------------
  //  PDF
  // -------------------------------------------------------------------------
  const downloadSinglePDF = async (id) => {
    try {
      const res = await api.get(`/laporan/bulanan/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `laporan-bulanan-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Gagal mengunduh PDF", "error");
    }
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // =========================================================================
  //  RENDER TAB BULANAN
  // =========================================================================
  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1.2, mb: 2.5, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Kecamatan</InputLabel>
          <Select label="Kecamatan" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            {kecamatanList.map(k => <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Bulan</InputLabel>
          <Select label="Bulan" value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
            <MenuItem value="">Semua</MenuItem>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(b => <MenuItem key={b} value={b}>{BULAN_NAMA[b]}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Tahun"
          value={filterTahun}
          onChange={e => setFilterTahun(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 110 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Proses">Proses</MenuItem>
            <MenuItem value="Selesai">Selesai</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button onClick={openTambah} variant="contained" startIcon={<FiPlus size={15} />} sx={primaryBtnSx}>
            Tambah Laporan Bulanan
          </Button>
        </Box>
      </Box>

      {/* Tabel */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : (
        <>
          {isMobile ? (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {list.map(item => (
                  <Box
                    key={item.id}
                    sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px", p: 1.6 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                          {item.jenis_operasi}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace" }}>
                          {item.kode_laporan}
                        </Typography>
                      </Box>
                      <Chip label={item.status} size="small" sx={{
                        bgcolor: item.status === "Selesai" ? C.tealBg : C.amberBg,
                        color: item.status === "Selesai" ? C.teal : C.amber,
                        fontWeight: 600, fontSize: 10.5, height: 20, flexShrink: 0,
                      }} />
                    </Box>

                    <Typography sx={{ fontSize: 12.5, color: C.textDim, mt: 0.8 }}>
                      {item.kecamatan_nama}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: C.textFaint, mt: 0.3 }}>
                      {BULAN_NAMA[item.bulan]} {item.tahun}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.3, mt: 1 }}>
                      <IconButton size="small" onClick={() => openDetail(item)} sx={{ color: C.slate, p: 0.6 }}><FiEye size={14} /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: C.indigo, p: 0.6 }}><FiEdit2 size={14} /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(item)} sx={{ color: C.red, p: 0.6 }}><FiTrash2 size={14} /></IconButton>
                    </Box>
                  </Box>
                ))}
                {list.length === 0 && (
                  <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px", py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
                    Belum ada laporan bulanan.
                  </Box>
                )}
              </Box>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", mt: 1.2 }}>
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="Baris"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
                />
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", overflowX: "auto" }}>
                <Table sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow>
                      {["Kode", "Kecamatan", "Bulan/Tahun", "Jenis Operasi", "Status", "Aksi"].map(h => (
                        <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map(item => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>{item.kode_laporan}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{item.kecamatan_nama}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{BULAN_NAMA[item.bulan]} {item.tahun}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>{item.jenis_operasi}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                          <Chip label={item.status} size="small" sx={{
                            bgcolor: item.status === "Selesai" ? C.tealBg : C.amberBg,
                            color: item.status === "Selesai" ? C.teal : C.amber,
                            fontWeight: 600, fontSize: 11.5,
                          }} />
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                          <IconButton size="small" onClick={() => openDetail(item)} sx={{ color: C.slate, mr: 0.5 }}><FiEye size={15} /></IconButton>
                          <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: C.indigo, mr: 0.5 }}><FiEdit2 size={15} /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(item)} sx={{ color: C.red }}><FiTrash2 size={15} /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {list.length === 0 && (
                  <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
                    Belum ada laporan bulanan.
                  </Box>
                )}
              </Box>
              <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
                <TablePagination
                  component="div"
                  count={total}
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
        </>
      )}

      {/* Dialog Form */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit Laporan Bulanan" : "Tambah Laporan Bulanan"}
          <Chip label="Laporan Bulanan Kecamatan" size="small" sx={{ ml: 1.2, bgcolor: C.indigoBg, color: C.indigo, fontWeight: 600, fontSize: 11.5 }} />
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Kecamatan</InputLabel>
              <Select label="Kecamatan" value={form.kecamatan_id} onChange={e => setForm(f => ({ ...f, kecamatan_id: e.target.value }))}>
                {kecamatanList.map(k => <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Bulan</InputLabel>
                <Select label="Bulan" value={form.bulan} onChange={e => setForm(f => ({ ...f, bulan: e.target.value }))}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(b => <MenuItem key={b} value={b}>{BULAN_NAMA[b]}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Tahun" type="number" value={form.tahun} onChange={e => setForm(f => ({ ...f, tahun: parseInt(e.target.value) || new Date().getFullYear() }))} size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            </Box>

            <TextField label="Jenis Operasi" value={form.jenis_operasi} onChange={e => setForm(f => ({ ...f, jenis_operasi: e.target.value }))} fullWidth size="small" />
            <TextField label="Dasar Surat Nomor" value={form.dasar_surat_nomor} onChange={e => setForm(f => ({ ...f, dasar_surat_nomor: e.target.value }))} fullWidth size="small" />
            <TextField label="Dasar Surat Perihal" value={form.dasar_surat_perihal} onChange={e => setForm(f => ({ ...f, dasar_surat_perihal: e.target.value }))} fullWidth size="small" />
            <TextField label="Sasaran Operasi" value={form.sasaran_operasi} onChange={e => setForm(f => ({ ...f, sasaran_operasi: e.target.value }))} fullWidth size="small" />
            <TextField label="Metode Operasi" value={form.misi_metode_operasi} onChange={e => setForm(f => ({ ...f, misi_metode_operasi: e.target.value }))} fullWidth size="small" />
            <TextField label="SOP yang digunakan" value={form.misi_sop} onChange={e => setForm(f => ({ ...f, misi_sop: e.target.value }))} fullWidth size="small" />

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <MenuItem value="Proses">Proses</MenuItem>
                <MenuItem value="Selesai">Selesai</MenuItem>
              </Select>
            </FormControl>

            {/* Tanggal Kegiatan */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Tanggal Kegiatan</Typography>
              {form.tanggal_kegiatan.map((t, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField type="date" value={t} onChange={e => updateArrayItem("tanggal_kegiatan", idx, e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
                  <IconButton size="small" onClick={() => removeFromArray("tanggal_kegiatan", idx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={() => pushToArray("tanggal_kegiatan", "")} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Tanggal</Button>
            </Box>

            {/* Hambatan */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Hambatan</Typography>
              {form.hambatan.map((h, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField value={h} onChange={e => updateArrayItem("hambatan", idx, e.target.value)} fullWidth size="small" />
                  <IconButton size="small" onClick={() => removeFromArray("hambatan", idx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={() => pushToArray("hambatan", "")} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Hambatan</Button>
            </Box>

            {/* Solusi */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Solusi</Typography>
              {form.solusi.map((s, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField value={s} onChange={e => updateArrayItem("solusi", idx, e.target.value)} fullWidth size="small" />
                  <IconButton size="small" onClick={() => removeFromArray("solusi", idx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={() => pushToArray("solusi", "")} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Solusi</Button>
            </Box>

            {/* Rekap Kegiatan */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Rekap Kegiatan</Typography>
              {form.rekap_kegiatan.map((group, gIdx) => (
                <Box key={gIdx} sx={{ border: `1px solid ${C.border}`, borderRadius: 2, p: 1.5, mb: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                    <TextField label="Tanggal" type="date" value={group.tanggal || ""} onChange={e => updateRekapKegiatan(gIdx, "tanggal", e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => setForm(f => ({ ...f, rekap_kegiatan: f.rekap_kegiatan.filter((_, i) => i !== gIdx) }))} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                  </Box>
                  {group.kegiatan?.map((k, kIdx) => (
                    <Box key={kIdx} sx={{ display: "flex", gap: 1, mb: 0.5, alignItems: "center" }}>
                      <TextField label="Kegiatan" value={k.label || ""} onChange={e => {
                        const arr = [...form.rekap_kegiatan];
                        arr[gIdx].kegiatan[kIdx].label = e.target.value;
                        setForm(f => ({ ...f, rekap_kegiatan: arr }));
                      }} size="small" sx={{ flex: 2 }} />
                      <TextField label="Jumlah" value={k.jumlah || ""} onChange={e => {
                        const arr = [...form.rekap_kegiatan];
                        arr[gIdx].kegiatan[kIdx].jumlah = e.target.value;
                        setForm(f => ({ ...f, rekap_kegiatan: arr }));
                      }} size="small" sx={{ flex: 1 }} />
                      <IconButton size="small" onClick={() => removeKegiatanItem(gIdx, kIdx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                    </Box>
                  ))}
                  <Button onClick={() => {
                    const arr = [...form.rekap_kegiatan];
                    if (!arr[gIdx]) arr[gIdx] = { tanggal: "", kegiatan: [] };
                    arr[gIdx].kegiatan.push({ label: "", jumlah: "" });
                    setForm(f => ({ ...f, rekap_kegiatan: arr }));
                  }} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal, mt: 0.5 }}>Tambah Item Kegiatan</Button>
                </Box>
              ))}
              <Button onClick={() => setForm(f => ({ ...f, rekap_kegiatan: [...f.rekap_kegiatan, { tanggal: "", kegiatan: [] }] }))} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Grup Tanggal</Button>
            </Box>

            {/* Daftar Petugas */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Daftar Petugas</Typography>
              {form.daftar_petugas.map((p, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <TextField value={p.nama || ""} onChange={e => updatePetugas(idx, e.target.value)} fullWidth size="small" label="Nama Petugas" />
                  <IconButton size="small" onClick={() => removeFromArray("daftar_petugas", idx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={() => pushToArray("daftar_petugas", "")} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Petugas</Button>
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

      {/* Dialog Detail */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Detail Laporan Bulanan</DialogTitle>
        <DialogContent dividers>
          {detailData && <DetailBulanan data={detailData} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDetail} sx={{ color: C.textDim, textTransform: "none" }}>Tutup</Button>
          <Button onClick={() => downloadSinglePDF(detailData?.id)} variant="outlined" startIcon={<FiDownload size={14} />} sx={outlineBtnSx}>Download PDF</Button>
          <Button onClick={() => { closeDetail(); openEdit(detailData); }} variant="contained" startIcon={<FiEdit2 size={14} />} sx={primaryBtnSx}>Edit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(t => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// ============================================================================
//  KOMPONEN DETAIL – Non‑P3K
// ============================================================================
function DetailNonP3K({ data }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography sx={{ fontSize: 17, fontWeight: 700, color: C.text }}>{data.perihal}</Typography>
        <Typography sx={{ fontSize: 12.5, color: C.textFaint, fontFamily: "monospace", mb: 0.6 }}>
          {data.kode_laporan} {data.nomor_surat ? `· ${data.nomor_surat}` : ""}
        </Typography>
        <Chip label={data.status} size="small" sx={{ bgcolor: data.status === "Selesai" ? C.tealBg : C.amberBg, color: data.status === "Selesai" ? C.teal : C.amber, fontWeight: 600, fontSize: 11.5 }} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <DetailItem icon={<FiMail size={14} />} label="Kepada" value={data.kepada || "-"} />
        <DetailItem icon={<FiMail size={14} />} label="Dari" value={data.dari || "-"} />
        <DetailItem icon={<FiCalendar size={14} />} label="Tanggal" value={formatTanggal(data.tanggal)} />
        <DetailItem icon={<FiMapPin size={14} />} label="Kecamatan" value={data.kecamatan_nama || "-"} />
      </Box>
      <DetailItem icon={<FiFileText size={14} />} label="Dasar Surat" value={data.dasar_surat || "-"} fullWidth />
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Isi Laporan</Typography>
        {(data.isi_laporan || []).map((poin, idx) => (
          <Typography key={idx} sx={{ fontSize: 13.5, color: C.text, mb: 0.5 }}>{idx + 1}. {poin}</Typography>
        ))}
      </Box>
      <DetailItem icon={<FiUser size={14} />} label="Pelapor" value={`${data.nama_pelapor || "-"} (${data.jabatan_pelapor || "-"})`} fullWidth />
      {data.foto_list?.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Foto ({data.foto_list.length})</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {data.foto_list.map(f => (
              <Box key={f.id} component="img" src={`${FILE_BASE_URL}${f.foto_url}`} sx={{ width: 110, height: 110, objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
//  KOMPONEN DETAIL – Bulanan
// ============================================================================
function DetailBulanan({ data }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography sx={{ fontSize: 17, fontWeight: 700, color: C.text }}>
          {data.jenis_operasi}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: C.textFaint, fontFamily: "monospace", mb: 0.6 }}>
          {data.kode_laporan} · {BULAN_NAMA[data.bulan]} {data.tahun}
        </Typography>
        <Chip label={data.status} size="small" sx={{ bgcolor: data.status === "Selesai" ? C.tealBg : C.amberBg, color: data.status === "Selesai" ? C.teal : C.amber, fontWeight: 600, fontSize: 11.5 }} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <DetailItem icon={<FiMapPin size={14} />} label="Kecamatan" value={data.kecamatan_nama || "-"} />
        <DetailItem icon={<FiCalendar size={14} />} label="Bulan/Tahun" value={`${BULAN_NAMA[data.bulan]} ${data.tahun}`} />
        <DetailItem icon={<FiFileText size={14} />} label="Dasar Surat" value={data.dasar_surat_nomor || "-"} />
        <DetailItem icon={<FiFileText size={14} />} label="Perihal Dasar" value={data.dasar_surat_perihal || "-"} />
      </Box>
      <DetailItem icon={<FiFileText size={14} />} label="Sasaran Operasi" value={data.sasaran_operasi || "-"} fullWidth />
      <DetailItem icon={<FiFileText size={14} />} label="Metode Operasi" value={data.misi_metode_operasi || "-"} fullWidth />
      <DetailItem icon={<FiFileText size={14} />} label="SOP" value={data.misi_sop || "-"} fullWidth />

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Tanggal Kegiatan</Typography>
        <Typography sx={{ fontSize: 13.5, color: C.text }}>
          {(data.tanggal_kegiatan || []).map(t => formatTanggal(t)).join(", ")}
        </Typography>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Hambatan</Typography>
        {(data.hambatan || []).map((h, i) => <Typography key={i} sx={{ fontSize: 13.5, color: C.text }}>• {h}</Typography>)}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Solusi</Typography>
        {(data.solusi || []).map((s, i) => <Typography key={i} sx={{ fontSize: 13.5, color: C.text }}>• {s}</Typography>)}
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Rekap Kegiatan</Typography>
        {(data.rekap_kegiatan || []).map((g, gi) => (
          <Box key={gi} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.textDim }}>{formatTanggal(g.tanggal)}</Typography>
            {g.kegiatan?.map((k, ki) => (
              <Typography key={ki} sx={{ fontSize: 13.5, color: C.text, ml: 2 }}>• {k.label}: {k.jumlah}</Typography>
            ))}
          </Box>
        ))}
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Daftar Petugas</Typography>
        {(data.daftar_petugas || []).map((p, i) => <Typography key={i} sx={{ fontSize: 13.5, color: C.text }}>{i+1}. {p.nama}</Typography>)}
      </Box>
    </Box>
  );
}

// ============================================================================
//  KOMPONEN DetailItem (label-value)
// ============================================================================
function DetailItem({ icon, label, value, fullWidth }) {
  return (
    <Box sx={{ gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.4 }}>
        <Box sx={{ color: C.amber, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: C.text, whiteSpace: "pre-wrap" }}>{value}</Typography>
    </Box>
  );
}

// ============================================================================
//  HELPERS
// ============================================================================
function formatTanggal(iso) {
  if (!iso) return "-";
  return format(parseISO(iso), "dd MMM yyyy", { locale: idLocale });
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

const outlineBtnSx = {
  textTransform: "none",
  fontWeight: 600,
  fontSize: 13.5,
  borderRadius: "10px",
  borderColor: C.teal,
  color: C.teal,
  boxShadow: "none",
  "&:hover": { borderColor: C.teal, bgcolor: C.tealBg, boxShadow: "none" },
};