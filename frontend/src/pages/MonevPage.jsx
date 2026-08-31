// frontend/src/pages/monev/MonevPage.jsx
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
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
  FiDownload,
  FiCamera,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiFileText,
  FiX,
  FiMail,
  FiUsers,
} from "react-icons/fi";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "../services/api";
import Swal from "sweetalert2";

// Palet warna (konsisten dengan LaporanPage.jsx)
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

const FORM_KOSONG = {
  id: null,
  tanggal: new Date().toISOString().split("T")[0],
  kecamatan_id: "",
  status: "Proses",
  kepada: "Yth. Kepala Bidang Linmas",
  dari: "Bidang Linmas",
  nomor_surat: "",
  perihal: "",
  dasar_surat: "",
  isi_laporan: [""],
  anggota_tim: [""],
  nama_pelapor: "",
  jabatan_pelapor: "KABID LINMAS",
  nip_pelapor: "",
};

// ============================================================================
//  KOMPONEN UTAMA — LAPORAN MONEV
// ============================================================================
export default function MonevPage() {
  // State data
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

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
  const [form, setForm] = useState(FORM_KOSONG);
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
  //  Ambil daftar laporan monev
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

      const res = await api.get("/monev", { params });
      setList(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      showToast("Gagal memuat laporan monev", "error");
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
    setForm(FORM_KOSONG);
    resetFotoState();
    setFormOpen(true);
  };

  const openEdit = async (item) => {
    try {
      const res = await api.get(`/monev/${item.id}`);
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
        anggota_tim: data.anggota_tim?.length ? data.anggota_tim : [""],
        nama_pelapor: data.nama_pelapor || "",
        jabatan_pelapor: data.jabatan_pelapor || "KABID LINMAS",
        nip_pelapor: data.nip_pelapor || "",
      });
      setFotoExisting(data.foto_list || []);
      setFotoFilesBaru([]);
      setFotoHapusIds([]);
      setFormOpen(true);
    } catch {
      showToast("Gagal mengambil detail laporan monev", "error");
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
  //  Manajemen isi_laporan (poin hasil monev)
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
  //  Manajemen anggota_tim
  // -------------------------------------------------------------------------
  const updateAnggota = (idx, value) => {
    setForm(f => {
      const arr = [...f.anggota_tim];
      arr[idx] = value;
      return { ...f, anggota_tim: arr };
    });
  };
  const tambahAnggota = () => {
    setForm(f => ({ ...f, anggota_tim: [...f.anggota_tim, ""] }));
  };
  const hapusAnggota = (idx) => {
    setForm(f => {
      const arr = f.anggota_tim.filter((_, i) => i !== idx);
      return { ...f, anggota_tim: arr.length ? arr : [""] };
    });
  };

  // -------------------------------------------------------------------------
  //  Submit form
  // -------------------------------------------------------------------------
  const handleSubmit = async () => {
    const poinValid = form.isi_laporan.filter(p => p.trim());
    if (!form.tanggal || !form.kecamatan_id || !form.perihal.trim() || !form.dasar_surat.trim() || !form.nama_pelapor.trim() || poinValid.length === 0) {
      showToast("Tanggal, kecamatan, perihal, dasar surat, nama pelapor, dan minimal 1 poin hasil monev wajib diisi", "error");
      return;
    }

    const anggotaValid = form.anggota_tim.filter(a => a.trim());

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
    fd.append("nip_pelapor", form.nip_pelapor);
    fd.append("isi_laporan", JSON.stringify(poinValid));
    fd.append("anggota_tim", JSON.stringify(anggotaValid));

    fotoFilesBaru.forEach(file => fd.append("foto", file));
    if (form.id && fotoHapusIds.length) {
      fd.append("hapus_foto_ids", JSON.stringify(fotoHapusIds));
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/monev/${form.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Laporan monev berhasil diperbarui");
      } else {
        await api.post("/monev", fd, { headers: { "Content-Type": "multipart/form-data" } });
        showToast("Laporan monev berhasil dibuat");
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal menyimpan laporan monev", "error");
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
      await api.delete(`/monev/${item.id}`);
      showToast("Laporan monev berhasil dihapus");
      if (list.length === 1 && page > 0) setPage(p => p - 1);
      else fetchData();
    } catch {
      showToast("Gagal menghapus laporan monev", "error");
    }
  };

  // -------------------------------------------------------------------------
  //  Detail
  // -------------------------------------------------------------------------
  const openDetail = async (item) => {
    try {
      const res = await api.get(`/monev/${item.id}`);
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

      const res = await api.get("/monev/pdf", { params, responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "laporan-monev.pdf");
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
      const res = await api.get(`/monev/${id}/pdf`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `monev-${id}.pdf`);
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
  //  RENDER
  // =========================================================================
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.3 }}>
            Kegiatan
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Laporan Monitoring &amp; Evaluasi
          </Typography>
        </Box>
      </Box>

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
            Tambah Laporan Monev
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
          <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", overflow: "hidden" }}>
            <Table>
              <TableHead>
                <TableRow>
                  {["Kode", "Tanggal", "Kecamatan", "Petugas", "Perihal", "Status", "Aksi"].map(h => (
                    <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>
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
                Belum ada laporan monev.
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

      {/* Dialog Form */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>
          {form.id ? "Edit Laporan Monev" : "Tambah Laporan Monev"}
          <Chip label="Monitoring & Evaluasi" size="small" sx={{ ml: 1.2, bgcolor: C.purpleBg, color: C.purple, fontWeight: 600, fontSize: 11.5 }} />
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
            <TextField label="Nomor Surat" placeholder="/ / /Bid.Linmas/2026" value={form.nomor_surat} onChange={e => setForm(f => ({ ...f, nomor_surat: e.target.value }))} fullWidth size="small" />
            <TextField label="Perihal" placeholder="Melaksanakan Monitoring Dan Evaluasi Anggota Satgas Linmas Dalam Pelaporan Aplikasi Simlinmas" value={form.perihal} onChange={e => setForm(f => ({ ...f, perihal: e.target.value }))} fullWidth size="small" multiline minRows={2} />
            <TextField label="Dasar Surat" placeholder="Surat Perintah Kepala Bidang Linmas Satpol PP Kabupaten Bandung No .../BID.LINMAS/2026 tanggal ..." value={form.dasar_surat} onChange={e => setForm(f => ({ ...f, dasar_surat: e.target.value }))} fullWidth size="small" multiline minRows={2} />

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Hasil Monitoring & Evaluasi (poin bernomor)</Typography>
              {form.isi_laporan.map((poin, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "flex-start" }}>
                  <Typography sx={{ fontSize: 13, color: C.textFaint, mt: 1, minWidth: 18 }}>{idx + 1}.</Typography>
                  <TextField value={poin} onChange={e => updatePoin(idx, e.target.value)} fullWidth size="small" multiline minRows={1} />
                  <IconButton size="small" onClick={() => hapusPoin(idx)} sx={{ color: C.red, mt: 0.3 }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={tambahPoin} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Poin</Button>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Anggota Tim yang Turun</Typography>
              {form.anggota_tim.map((nama, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                  <Typography sx={{ fontSize: 13, color: C.textFaint, minWidth: 18 }}>{idx + 1}.</Typography>
                  <TextField value={nama} onChange={e => updateAnggota(idx, e.target.value)} fullWidth size="small" placeholder="Nama, gelar" />
                  <IconButton size="small" onClick={() => hapusAnggota(idx)} sx={{ color: C.red }}><FiX size={14} /></IconButton>
                </Box>
              ))}
              <Button onClick={tambahAnggota} size="small" startIcon={<FiPlus size={13} />} sx={{ textTransform: "none", color: C.teal }}>Tambah Anggota</Button>
            </Box>

            <TextField label="Nama Pelapor" value={form.nama_pelapor} onChange={e => setForm(f => ({ ...f, nama_pelapor: e.target.value }))} fullWidth size="small" />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Jabatan Pelapor" value={form.jabatan_pelapor} onChange={e => setForm(f => ({ ...f, jabatan_pelapor: e.target.value }))} fullWidth size="small" sx={{ flex: 1 }} />
              <TextField label="NIP Pelapor" value={form.nip_pelapor} onChange={e => setForm(f => ({ ...f, nip_pelapor: e.target.value }))} fullWidth size="small" sx={{ flex: 1 }} />
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <MenuItem value="Proses">Proses</MenuItem>
                <MenuItem value="Selesai">Selesai</MenuItem>
              </Select>
            </FormControl>

            {/* Foto */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.textDim, mb: 1 }}>Foto Dokumentasi (bisa lebih dari satu)</Typography>
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
        <DialogTitle sx={{ fontWeight: 700, color: C.text }}>Detail Laporan Monev</DialogTitle>
        <DialogContent dividers>
          {detailData && <DetailMonev data={detailData} />}
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
//  KOMPONEN DETAIL — Monev
// ============================================================================
function DetailMonev({ data }) {
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
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6 }}>Hasil Monitoring & Evaluasi</Typography>
        {(data.isi_laporan || []).map((poin, idx) => (
          <Typography key={idx} sx={{ fontSize: 13.5, color: C.text, mb: 0.5 }}>{idx + 1}. {poin}</Typography>
        ))}
      </Box>

      {data.anggota_tim?.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.6, display: "flex", alignItems: "center", gap: 0.6 }}>
            <FiUsers size={13} /> Anggota Tim
          </Typography>
          {data.anggota_tim.map((nama, idx) => (
            <Typography key={idx} sx={{ fontSize: 13.5, color: C.text }}>{idx + 1}. {nama}</Typography>
          ))}
        </Box>
      )}

      <DetailItem icon={<FiUser size={14} />} label="Pelapor" value={`${data.nama_pelapor || "-"} (${data.jabatan_pelapor || "-"})${data.nip_pelapor ? ` · NIP. ${data.nip_pelapor}` : ""}`} fullWidth />

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