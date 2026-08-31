import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye } from "react-icons/fi";
import api from "../services/api";

// Tema light
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
};

const STATUS_OPTIONS = ["Semua", "Terjadwal", "Berlangsung", "Selesai", "Dibatalkan"];

export default function AgendaPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterTanggal, setFilterTanggal] = useState(new Date().toISOString().split("T")[0]); // default hari ini
  const [tampilkanSemua, setTampilkanSemua] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Form
  const [openModal, setOpenModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: "",
    tanggal: new Date().toISOString().split("T")[0],
    waktu_mulai: "",
    waktu_selesai: "",
    lokasi: "",
    status: "Terjadwal",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        q: search || undefined,
        status: filterStatus !== "Semua" ? filterStatus : undefined,
        // Jika tampilkanSemua, tidak kirim filter tanggal
        tanggal: tampilkanSemua ? undefined : filterTanggal || undefined,
      };
      const { data } = await api.get("/agenda", { params });
      if (data.success) {
        setData(data.data);
        setTotal(data.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat agenda");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, filterStatus, filterTanggal, tampilkanSemua]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      judul: "",
      deskripsi: "",
      tanggal: new Date().toISOString().split("T")[0],
      waktu_mulai: "",
      waktu_selesai: "",
      lokasi: "",
      status: "Terjadwal",
    });
    setFormError("");
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setSelectedItem(null);
    resetForm();
    setOpenModal(true);
  };

  const handleOpenEdit = (item) => {
    setFormMode("edit");
    setSelectedItem(item);
    setFormData({
      judul: item.judul,
      deskripsi: item.deskripsi || "",
      tanggal: item.tanggal,
      waktu_mulai: item.waktu_mulai || "",
      waktu_selesai: item.waktu_selesai || "",
      lokasi: item.lokasi || "",
      status: item.status,
    });
    setOpenModal(true);
  };

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setOpenDetail(true);
  };

  const handleSubmit = async () => {
    if (!formData.judul || !formData.tanggal) {
      setFormError("Judul dan tanggal wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (formMode === "create") {
        await api.post("/agenda", payload);
      } else {
        await api.put(`/agenda/${selectedItem.id}`, payload);
      }
      setOpenModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError("Gagal menyimpan agenda");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus agenda ini?")) return;
    try {
      await api.delete(`/agenda/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Terjadwal": return C.amber;
      case "Berlangsung": return C.indigo;
      case "Selesai": return C.teal;
      case "Dibatalkan": return C.red;
      default: return C.textFaint;
    }
  };

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 1.5, color: C.amber, textTransform: "uppercase", mb: 0.5 }}>
            Agenda Kegiatan
          </Typography>
          <Typography variant="h4" sx={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
            Agenda Linmas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FiPlus />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: C.amber, color: "#fff", "&:hover": { bgcolor: "#D97706" }, textTransform: "none", fontWeight: 600 }}
        >
          Tambah Agenda
        </Button>
      </Box>

      {/* Filter */}
      <Card sx={{ bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: "14px", p: 2.5, mb: 2.5, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }} elevation={0}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari judul, lokasi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FiSearch color={C.textDim} /></InputAdornment>,
              }}
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Tanggal"
              type="date"
              size="small"
              value={filterTanggal}
              onChange={(e) => { setFilterTanggal(e.target.value); setTampilkanSemua(false); setPage(0); }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={tampilkanSemua}
              sx={textFieldStyle}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant={tampilkanSemua ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setTampilkanSemua(!tampilkanSemua);
                setPage(0);
              }}
              sx={{
                textTransform: "none",
                bgcolor: tampilkanSemua ? C.amber : "transparent",
                color: tampilkanSemua ? "#fff" : C.textDim,
                borderColor: C.border,
                "&:hover": { borderColor: C.textFaint },
              }}
            >
              {tampilkanSemua ? "Lihat Hari Ini" : "Semua Agenda"}
            </Button>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                sx={selectStyle}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Tabel / Kartu */}
      <Card sx={{ bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }} elevation={0}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress sx={{ color: C.amber }} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : data.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center", color: C.textDim }}>
            {tampilkanSemua ? "Belum ada agenda" : "Tidak ada kegiatan hari ini"}
          </Box>
        ) : isMobile ? (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, p: 1.5 }}>
              {data.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    border: `1px solid ${C.border}`,
                    borderRadius: "12px",
                    p: 1.6,
                    bgcolor: C.panel2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                      {item.judul}
                    </Typography>
                    <Chip
                      label={item.status}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(item.status)}20`,
                        color: getStatusColor(item.status),
                        fontWeight: 500,
                        fontSize: 10.5,
                        height: 20,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  <Typography sx={{ fontSize: 12.5, color: C.textDim, mt: 0.6 }}>
                    {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    {item.waktu_mulai && (
                      <>
                        {" • "}
                        {item.waktu_mulai.substring(0, 5)}
                        {item.waktu_selesai ? ` - ${item.waktu_selesai.substring(0, 5)}` : ""}
                      </>
                    )}
                  </Typography>

                  {item.lokasi && (
                    <Typography sx={{ fontSize: 12.5, color: C.textFaint, mt: 0.3 }}>
                      {item.lokasi}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenDetail(item)}>
                      <FiEye size={16} color={C.indigo} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                      <FiEdit2 size={16} color={C.amber} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <FiTrash2 size={16} color={C.red} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="Baris:"
              sx={{ color: C.textDim }}
            />
          </>
        ) : (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 700 }}>
                <TableHead sx={{ bgcolor: C.panel2 }}>
                  <TableRow>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Judul</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Tanggal</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Waktu</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Lokasi</TableCell>
                    <TableCell sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Status</TableCell>
                    <TableCell align="center" sx={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ color: C.text, fontSize: 14 }}>{item.judul}</TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>
                        {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>
                        {item.waktu_mulai ? item.waktu_mulai.substring(0, 5) : "—"}
                        {item.waktu_selesai ? ` - ${item.waktu_selesai.substring(0, 5)}` : ""}
                      </TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>{item.lokasi || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(item.status)}20`,
                            color: getStatusColor(item.status),
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title="Detail">
                            <IconButton size="small" onClick={() => handleOpenDetail(item)}>
                              <FiEye size={16} color={C.indigo} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                              <FiEdit2 size={16} color={C.amber} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <IconButton size="small" onClick={() => handleDelete(item.id)}>
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

      {/* Modal Form */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: C.panel, borderRadius: "14px", color: C.text } }}>
        <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
          {formMode === "create" ? "Tambah Agenda" : "Edit Agenda"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Judul" value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} fullWidth required sx={textFieldStyle} />
            <TextField label="Tanggal" type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth required sx={textFieldStyle} />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Waktu Mulai" type="time" value={formData.waktu_mulai} onChange={(e) => setFormData({ ...formData, waktu_mulai: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={textFieldStyle} />
              <TextField label="Waktu Selesai" type="time" value={formData.waktu_selesai} onChange={(e) => setFormData({ ...formData, waktu_selesai: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={textFieldStyle} />
            </Box>
            <TextField label="Lokasi" value={formData.lokasi} onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })} fullWidth sx={textFieldStyle} />
            <TextField label="Deskripsi" value={formData.deskripsi} onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} multiline minRows={3} fullWidth sx={textFieldStyle} />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.status} label="Status" onChange={(e) => setFormData({ ...formData, status: e.target.value })} sx={selectStyle}>
                {STATUS_OPTIONS.filter(s => s !== "Semua").map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            {formError && <Alert severity="error">{formError}</Alert>}
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
        {detailItem && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>{detailItem.judul}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color={C.textDim}>
                Tanggal: {new Date(detailItem.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}<br />
                {detailItem.waktu_mulai && (<>Waktu: {detailItem.waktu_mulai.substring(0,5)}{detailItem.waktu_selesai ? ` - ${detailItem.waktu_selesai.substring(0,5)}` : ""}<br /></>)}
                Lokasi: {detailItem.lokasi || "—"}<br />
                Status: {detailItem.status}
              </Typography>
              {detailItem.deskripsi && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: C.panel2, borderRadius: "8px", border: `1px solid ${C.border}` }}>
                  <Typography variant="caption" color={C.textDim}>Deskripsi:</Typography>
                  <Typography variant="body2" color={C.text}>{detailItem.deskripsi}</Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

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