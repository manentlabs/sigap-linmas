import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Grid,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiEye,
} from "react-icons/fi";
import api from "../services/api";

// Warna tema light (sama seperti sebelumnya)
const C = {
  panel: "#FFFFFF",
  panel2: "#F8FAFC",
  border: "#E2E8F0",
  borderSoft: "#E5E7EB",
  text: "#1E293B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F59E0B",
  teal: "#10B981",
  red: "#EF4444",
  indigo: "#6366F1",
  blue: "#3B82F6",
};

const STATUS_OPTIONS = ["Semua", "Baru", "Diproses", "Selesai"]; // sesuaikan dengan nilai di database

export default function AduanPage() {
  const [aduans, setAduans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [kategoriFilter, setKategoriFilter] = useState("");

  // Data dropdown
  const [kategoriList, setKategoriList] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);

  // Modal form
  const [openModal, setOpenModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedAduan, setSelectedAduan] = useState(null);
  const [formData, setFormData] = useState({
    kode_aduan: "",
    anggota_id: "",
    kategori_id: "",
    isi: "",
    tanggal: new Date().toISOString().split("T")[0], // default hari ini
    status: "Baru",
    ditindak_oleh: "",
    tanggal_selesai: "",
    catatan_tindak_lanjut: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal detail
  const [openDetail, setOpenDetail] = useState(false);
  const [detailAduan, setDetailAduan] = useState(null);

  // Fetch data aduan
  const fetchAduans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        q: search || undefined,
        status: statusFilter !== "Semua" ? statusFilter : undefined,
        kategori_id: kategoriFilter || undefined,
      };
      const { data } = await api.get("/aduan", { params });
      if (data.success) {
        setAduans(data.data);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Gagal memuat aduan:", err);
      setError("Gagal memuat data aduan");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, kategoriFilter]);

  // Fetch kategori & anggota (untuk dropdown)
  const fetchDropdowns = async () => {
    try {
      const [resKat, resAng] = await Promise.all([
        api.get("/kategori-aduan"),
        api.get("/anggota"),
      ]);
      if (resKat.data?.data) setKategoriList(resKat.data.data);
      if (resAng.data?.data) setAnggotaList(resAng.data.data);
    } catch (err) {
      console.warn("Gagal fetch dropdown, mungkin endpoint belum tersedia.");
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchAduans();
  }, [fetchAduans]);

  // Reset form
  const resetForm = () => {
    setFormData({
      kode_aduan: "",
      anggota_id: "",
      kategori_id: "",
      isi: "",
      tanggal: new Date().toISOString().split("T")[0],
      status: "Baru",
      ditindak_oleh: "",
      tanggal_selesai: "",
      catatan_tindak_lanjut: "",
    });
    setFormError("");
  };

  // Buka modal create
  const handleOpenCreate = () => {
    setFormMode("create");
    setSelectedAduan(null);
    resetForm();
    setOpenModal(true);
  };

  // Buka modal edit
  const handleOpenEdit = (aduan) => {
    setFormMode("edit");
    setSelectedAduan(aduan);
    setFormData({
      kode_aduan: aduan.kode_aduan || "",
      anggota_id: aduan.anggota_id || "",
      kategori_id: aduan.kategori_id || "",
      isi: aduan.isi || "",
      tanggal: aduan.tanggal ? aduan.tanggal.split("T")[0] : "",
      status: aduan.status || "Baru",
      ditindak_oleh: aduan.ditindak_oleh || "",
      tanggal_selesai: aduan.tanggal_selesai ? aduan.tanggal_selesai.split("T")[0] : "",
      catatan_tindak_lanjut: aduan.catatan_tindak_lanjut || "",
    });
    setOpenModal(true);
  };

  // Buka detail
  const handleOpenDetail = (aduan) => {
    setDetailAduan(aduan);
    setOpenDetail(true);
  };

  // Submit form (create / update)
  const handleSubmit = async () => {
    if (!formData.kode_aduan || !formData.anggota_id || !formData.kategori_id || !formData.isi || !formData.tanggal) {
      setFormError("Kode, Anggota, Kategori, Isi, dan Tanggal wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kode_aduan: formData.kode_aduan,
        anggota_id: formData.anggota_id,
        kategori_id: formData.kategori_id,
        isi: formData.isi,
        tanggal: formData.tanggal,
        status: formData.status,
        ditindak_oleh: formData.ditindak_oleh || null,
        tanggal_selesai: formData.tanggal_selesai || null,
        catatan_tindak_lanjut: formData.catatan_tindak_lanjut || null,
      };

      if (formMode === "create") {
        await api.post("/aduan", payload);
      } else {
        await api.put(`/aduan/${selectedAduan.id}`, payload);
      }

      setOpenModal(false);
      fetchAduans();
    } catch (err) {
      console.error("Gagal menyimpan aduan:", err);
      setFormError("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  // Hapus aduan
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus aduan ini?")) return;
    try {
      await api.delete(`/aduan/${id}`);
      fetchAduans();
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  };

  // Helper untuk mendapatkan nama kategori/anggota dari ID
  const getKategoriName = (id) => {
    const kat = kategoriList.find((k) => k.id === id);
    return kat?.nama || id;
  };
  const getAnggotaName = (id) => {
    const ang = anggotaList.find((a) => a.id === id);
    return ang?.nama || id;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Baru": return C.amber;
      case "Diproses": return C.indigo;
      case "Selesai": return C.teal;
      default: return C.textFaint;
    }
  };

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              color: C.amber,
              textTransform: "uppercase",
              mb: 0.5,
            }}
          >
            Pengaduan
          </Typography>
          <Typography variant="h4" sx={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
            Daftar Aduan
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FiPlus />}
          onClick={handleOpenCreate}
          sx={{
            bgcolor: C.amber,
            color: "#fff",
            "&:hover": { bgcolor: "#D97706" },
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Buat Aduan
        </Button>
      </Box>

      {/* Filter & Pencarian */}
      <Card
        sx={{
          bgcolor: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: "14px",
          p: 2.5,
          mb: 2.5,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
        elevation={0}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            size="small"
            placeholder="Cari kode aduan atau isi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch color={C.textDim} />
                </InputAdornment>
              ),
            }}
            sx={{
              ...textFieldStyle,
              flex: 2,          // lebih lebar
              minWidth: 300,
            }}
          />

          <FormControl
            size="small"
            sx={{
              flex: 1,
              minWidth: 180,
            }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={selectStyle}
            >
              {STATUS_OPTIONS.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>

    <FormControl
      size="small"
      sx={{
        flex: 1.5,
        minWidth: 220,
      }}
    >
      <InputLabel>Kategori</InputLabel>
      <Select
        value={kategoriFilter}
        label="Kategori"
        onChange={(e) => {
          setKategoriFilter(e.target.value);
          setPage(0);
        }}
        sx={selectStyle}
      >
        <MenuItem value="">Semua</MenuItem>
        {kategoriList.map((kat) => (
          <MenuItem key={kat.id} value={kat.id}>
            {kat.nama}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
</Card>

      {/* Tabel */}
      <Card sx={{ bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }} elevation={0}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: C.amber }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : aduans.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center", color: C.textDim }}>Belum ada data aduan</Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: C.panel2 }}>
                  <TableRow>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Kode</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Isi Aduan</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Kategori</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Status</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Tanggal</TableCell>
                    <TableCell align="center" sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aduans.map((aduan) => (
                    <TableRow key={aduan.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell sx={{ color: C.text, fontSize: 14 }}>{aduan.kode_aduan}</TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>
                        {aduan.isi?.length > 60 ? aduan.isi.substring(0, 60) + "…" : aduan.isi}
                      </TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>
                        {getKategoriName(aduan.kategori_id)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={aduan.status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(aduan.status)}20`,
                            color: getStatusColor(aduan.status),
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>
                        {aduan.tanggal ? new Date(aduan.tanggal).toLocaleDateString("id-ID") : "-"}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title="Lihat detail">
                            <IconButton size="small" onClick={() => handleOpenDetail(aduan)}>
                              <FiEye size={16} color={C.indigo} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(aduan)}>
                              <FiEdit2 size={16} color={C.amber} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <IconButton size="small" onClick={() => handleDelete(aduan.id)}>
                              <FiTrash2 size={16} color={C.red} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="Baris per halaman:"
              sx={{ color: C.textDim }}
            />
          </>
        )}
      </Card>

      {/* Modal Tambah/Edit */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: C.panel, borderRadius: "14px", color: C.text } }}>
        <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
          {formMode === "create" ? "Buat Aduan Baru" : "Edit Aduan"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Kode Aduan" value={formData.kode_aduan} onChange={(e) => setFormData({ ...formData, kode_aduan: e.target.value })} fullWidth required sx={textFieldStyle} />
            <FormControl fullWidth required>
              <InputLabel>Anggota</InputLabel>
              <Select
                value={formData.anggota_id}
                label="Anggota"
                onChange={(e) => setFormData({ ...formData, anggota_id: e.target.value })}
                sx={selectStyle}
              >
                {anggotaList.map((ang) => (
                  <MenuItem key={ang.id} value={ang.id}>{ang.nama} ({ang.kode_anggota})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={formData.kategori_id}
                label="Kategori"
                onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                sx={selectStyle}
              >
                {kategoriList.map((kat) => (
                  <MenuItem key={kat.id} value={kat.id}>{kat.nama}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Isi Aduan" value={formData.isi} onChange={(e) => setFormData({ ...formData, isi: e.target.value })} multiline minRows={3} fullWidth required sx={textFieldStyle} />
            <TextField label="Tanggal" type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth required sx={textFieldStyle} />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                sx={selectStyle}
              >
                {["Baru", "Diproses", "Selesai"].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Ditindak Oleh" value={formData.ditindak_oleh} onChange={(e) => setFormData({ ...formData, ditindak_oleh: e.target.value })} fullWidth sx={textFieldStyle} />
            <TextField label="Tanggal Selesai" type="date" value={formData.tanggal_selesai} onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={textFieldStyle} />
            <TextField label="Catatan Tindak Lanjut" value={formData.catatan_tindak_lanjut} onChange={(e) => setFormData({ ...formData, catatan_tindak_lanjut: e.target.value })} multiline minRows={2} fullWidth sx={textFieldStyle} />
            {formError && <Alert severity="error" sx={{ mt: 1 }}>{formError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: C.textDim }}>Batal</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ bgcolor: C.amber, "&:hover": { bgcolor: "#D97706" }, fontWeight: 600, textTransform: "none" }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detail */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: C.panel, borderRadius: "14px", color: C.text } }}>
        {detailAduan && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>{detailAduan.kode_aduan}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color={C.textDim}>
                Anggota: {getAnggotaName(detailAduan.anggota_id)}<br />
                Kategori: {getKategoriName(detailAduan.kategori_id)}<br />
                Status: {detailAduan.status} &nbsp; | &nbsp; Tanggal: {detailAduan.tanggal ? new Date(detailAduan.tanggal).toLocaleDateString("id-ID") : "-"}
                {detailAduan.tanggal_selesai && <> | Tanggal Selesai: {new Date(detailAduan.tanggal_selesai).toLocaleDateString("id-ID")}</>}
                {detailAduan.ditindak_oleh && <> | Ditindak Oleh: {detailAduan.ditindak_oleh}</>}
              </Typography>
              <Typography sx={{ mt: 2, whiteSpace: "pre-wrap", color: C.text }}>{detailAduan.isi}</Typography>
              {detailAduan.catatan_tindak_lanjut && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: C.panel2, borderRadius: "8px", border: `1px solid ${C.border}` }}>
                  <Typography variant="caption" color={C.textDim}>Catatan:</Typography>
                  <Typography variant="body2" color={C.text}>{detailAduan.catatan_tindak_lanjut}</Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// Gaya konsisten untuk TextField & Select
const textFieldStyle = {
  "& .MuiOutlinedInput-root": {
    bgcolor: C.panel2,
    borderRadius: "10px",
    "& fieldset": { borderColor: C.border },
    "&:hover fieldset": { borderColor: C.textFaint },
  },
  "& .MuiInputLabel-root": { color: C.textDim },
  "& .MuiInputBase-input": { color: C.text, fontSize: 14 },
};

const selectStyle = {
  "& .MuiOutlinedInput-root": {
    bgcolor: C.panel2,
    borderRadius: "10px",
    "& fieldset": { borderColor: C.border },
  },
  "& .MuiInputLabel-root": { color: C.textDim },
  "& .MuiSelect-select": { color: C.text, fontSize: 14 },
};