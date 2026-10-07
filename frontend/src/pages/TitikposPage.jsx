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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiMapPin } from "react-icons/fi";
import api from "../services/api";

// Leaflet & ikon (ES module)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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
  pink: "#EC4899",
};

const JENIS_OPTIONS = ["Posyandu", "Poskamling"];
const KONDISI_OPTIONS = ["Baik", "Cukup", "Perlu Perbaikan"];
const STATUS_OPTIONS = ["Aktif", "Tidak Aktif"];
const MAP_CENTER = [-7.08, 107.65]; // Sesuaikan dengan wilayah Anda

const EMPTY_FORM = {
  nama_lokasi: "",
  jenis: "Posyandu",
  kecamatan_id: "",
  alamat: "",
  latitude: "",
  longitude: "",
  peta_pos_x: "",
  peta_pos_y: "",
  jumlah_petugas: 0,
  kondisi: "Baik",
  status: "Aktif",
  terakhir_diperiksa: "",
  catatan: "",
};

// Label jumlah menyesuaikan jenis
const labelJumlah = (jenis) =>
  jenis === "Poskamling" ? "Jumlah Anggota Siskamling" : "Jumlah Kader";

const getJenisColor = (jenis) => {
  switch (jenis) {
    case "Posyandu": return C.pink;
    case "Poskamling": return C.indigo;
    default: return C.textFaint;
  }
};

const getKondisiColor = (kondisi) => {
  switch (kondisi) {
    case "Baik": return C.teal;
    case "Cukup": return C.amber;
    case "Perlu Perbaikan": return C.red;
    default: return C.textFaint;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Aktif": return C.teal;
    case "Tidak Aktif": return C.textFaint;
    default: return C.textFaint;
  }
};

export default function TitikPosPage() {
  // Data untuk peta & tabel
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client-side pagination untuk tabel
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter
  const [search, setSearch] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterKondisi, setFilterKondisi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Dropdown kecamatan
  const [kecamatanList, setKecamatanList] = useState([]);

  // Modal form (tambah/edit)
  const [openModal, setOpenModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Modal detail
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Fetch semua data (tanpa limit) untuk peta & tabel
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: -1,
        q: search || undefined,
        kecamatan_id: filterKecamatan || undefined,
        jenis: filterJenis || undefined,
        kondisi: filterKondisi || undefined,
        status: filterStatus || undefined,
      };
      const { data } = await api.get("/titikpos", { params });
      if (data.success) {
        setAllData(data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data titik Posyandu dan Poskamling");
    } finally {
      setLoading(false);
    }
  }, [search, filterKecamatan, filterJenis, filterKondisi, filterStatus]);

  // Fetch daftar kecamatan
  const fetchKecamatan = async () => {
    try {
      const { data } = await api.get("/kecamatan");
      if (data.data) setKecamatanList(data.data);
    } catch (e) {
      console.warn("Gagal fetch kecamatan");
    }
  };

  useEffect(() => {
    fetchKecamatan();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const resetPage = () => setPage(0);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
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
    setFormError("");
    setFormData({
      nama_lokasi: item.nama_lokasi,
      jenis: item.jenis || "Posyandu",
      kecamatan_id: item.kecamatan_id,
      alamat: item.alamat || "",
      latitude: item.latitude || "",
      longitude: item.longitude || "",
      peta_pos_x: item.peta_pos_x || "",
      peta_pos_y: item.peta_pos_y || "",
      jumlah_petugas: item.jumlah_petugas || 0,
      kondisi: item.kondisi || "Baik",
      status: item.status || "Aktif",
      terakhir_diperiksa: item.terakhir_diperiksa
        ? item.terakhir_diperiksa.split("T")[0]
        : "",
      catatan: item.catatan || "",
    });
    setOpenModal(true);
  };

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setOpenDetail(true);
  };

  // ========== AMBIL LOKASI SAAT INI ==========
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Geolokasi tidak didukung oleh browser ini.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
        setFormError("");
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        let msg = "Gagal mendapatkan lokasi.";
        if (err.code === 1) msg = "Izin lokasi ditolak. Silakan aktifkan GPS.";
        else if (err.code === 2) msg = "Lokasi tidak tersedia.";
        else if (err.code === 3) msg = "Waktu permintaan habis.";
        setFormError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (
      !formData.nama_lokasi ||
      !formData.jenis ||
      !formData.kecamatan_id ||
      formData.jumlah_petugas === ""
    ) {
      setFormError("Nama lokasi, jenis, kecamatan, dan jumlah petugas wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        alamat: formData.alamat || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        peta_pos_x: formData.peta_pos_x || null,
        peta_pos_y: formData.peta_pos_y || null,
        jumlah_petugas: parseInt(formData.jumlah_petugas, 10),
        terakhir_diperiksa: formData.terakhir_diperiksa || null,
      };
      if (formMode === "create") {
        await api.post("/titikpos", payload);
      } else {
        await api.put(`/titikpos/${selectedItem.id}`, payload);
      }
      setOpenModal(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
      setFormError("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus titik ini?")) return;
    try {
      await api.delete(`/titikpos/${id}`);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Data untuk tabel dengan client-side pagination
  const paginatedData = allData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const cardSx = {
    bgcolor: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };

  const headCellSx = { color: C.text, fontWeight: 600, fontSize: 14 };

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
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
            Operasi Linmas
          </Typography>
          <Typography variant="h4" sx={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
            Titik Posyandu & Poskamling
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
          Tambah Titik
        </Button>
      </Box>

      {/* Filter */}
      <Card sx={{ ...cardSx, p: 2.5, mb: 2.5 }} elevation={0}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Cari lokasi, alamat, atau catatan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch color={C.textDim} />
                </InputAdornment>
              ),
            }}
            sx={{ ...textFieldStyle, flex: 2.5, minWidth: 280 }}
          />

          <FormControl size="small" sx={{ flex: 1.5, minWidth: 200 }}>
            <InputLabel>Kecamatan</InputLabel>
            <Select
              value={filterKecamatan}
              label="Kecamatan"
              onChange={(e) => {
                setFilterKecamatan(e.target.value);
                resetPage();
              }}
              sx={selectStyle}
            >
              <MenuItem value="">Semua</MenuItem>
              {kecamatanList.map((k) => (
                <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1.2, minWidth: 160 }}>
            <InputLabel>Jenis</InputLabel>
            <Select
              value={filterJenis}
              label="Jenis"
              onChange={(e) => {
                setFilterJenis(e.target.value);
                resetPage();
              }}
              sx={selectStyle}
            >
              <MenuItem value="">Semua</MenuItem>
              {JENIS_OPTIONS.map((j) => (
                <MenuItem key={j} value={j}>{j}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1.2, minWidth: 170 }}>
            <InputLabel>Kondisi</InputLabel>
            <Select
              value={filterKondisi}
              label="Kondisi"
              onChange={(e) => {
                setFilterKondisi(e.target.value);
                resetPage();
              }}
              sx={selectStyle}
            >
              <MenuItem value="">Semua</MenuItem>
              {KONDISI_OPTIONS.map((k) => (
                <MenuItem key={k} value={k}>{k}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1.2, minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => {
                setFilterStatus(e.target.value);
                resetPage();
              }}
              sx={selectStyle}
            >
              <MenuItem value="">Semua</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* PETA */}
      <Card sx={{ ...cardSx, p: 2.5, mb: 2.5 }} elevation={0}>
        <Typography sx={{ fontWeight: 600, fontSize: 15, color: C.text, mb: 2 }}>
          Peta Sebaran Posyandu & Poskamling
        </Typography>
        <Box
          sx={{
            height: 450,
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${C.borderSoft}`,
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress sx={{ color: C.amber }} />
            </Box>
          ) : (
            <MapContainer
              center={MAP_CENTER}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {allData
                .filter((item) => item.latitude && item.longitude)
                .map((item) => {
                  // Posyandu = lingkaran, Poskamling = persegi
                  const radius = item.jenis === "Poskamling" ? "3px" : "50%";
                  return (
                    <Marker
                      key={item.id}
                      position={[parseFloat(item.latitude), parseFloat(item.longitude)]}
                      icon={L.divIcon({
                        className: "",
                        html: `<div style="background:${getJenisColor(item.jenis)}; width:16px; height:16px; border-radius:${radius}; border:2px solid white; box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                      })}
                    >
                      <Popup>
                        <strong>{item.nama_lokasi}</strong><br />
                        {item.jenis}<br />
                        Kec. {item.kecamatan_nama}<br />
                        {labelJumlah(item.jenis)}: {item.jumlah_petugas}<br />
                        Kondisi: {item.kondisi}<br />
                        Status: {item.status}
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2, mt: 1.5, fontSize: 12, color: C.textDim }}>
          <LegendDot color={C.pink} label="Posyandu" shape="circle" />
          <LegendDot color={C.indigo} label="Poskamling" shape="square" />
        </Box>
      </Card>

      {/* TABEL */}
      <Card sx={{ ...cardSx, overflow: "hidden" }} elevation={0}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: C.amber }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : allData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center", color: C.textDim }}>
            Belum ada data titik Posyandu atau Poskamling
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: C.panel2 }}>
                  <TableRow>
                    <TableCell sx={headCellSx}>Nama Lokasi</TableCell>
                    <TableCell sx={headCellSx}>Jenis</TableCell>
                    <TableCell sx={headCellSx}>Kecamatan</TableCell>
                    <TableCell sx={headCellSx}>Petugas</TableCell>
                    <TableCell sx={headCellSx}>Kondisi</TableCell>
                    <TableCell sx={headCellSx}>Status</TableCell>
                    <TableCell align="center" sx={headCellSx}>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ color: C.text, fontSize: 14 }}>{item.nama_lokasi}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.jenis}
                          size="small"
                          sx={{
                            bgcolor: `${getJenisColor(item.jenis)}20`,
                            color: getJenisColor(item.jenis),
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>{item.kecamatan_nama}</TableCell>
                      <TableCell sx={{ color: C.textDim, fontSize: 13 }}>{item.jumlah_petugas}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.kondisi}
                          size="small"
                          sx={{
                            bgcolor: `${getKondisiColor(item.kondisi)}20`,
                            color: getKondisiColor(item.kondisi),
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>
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
              count={allData.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Baris per halaman:"
              sx={{ color: C.textDim }}
            />
          </>
        )}
      </Card>

      {/* Modal Form (Tambah/Edit) */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { bgcolor: C.panel, borderRadius: "14px", color: C.text } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 18 }}>
          {formMode === "create" ? "Tambah Titik" : "Edit Titik"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth required size="small">
              <InputLabel>Jenis</InputLabel>
              <Select
                value={formData.jenis}
                label="Jenis"
                onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                sx={selectStyle}
              >
                {JENIS_OPTIONS.map((j) => (
                  <MenuItem key={j} value={j}>{j}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={`Nama ${formData.jenis}`}
              value={formData.nama_lokasi}
              onChange={(e) => setFormData({ ...formData, nama_lokasi: e.target.value })}
              fullWidth
              required
              sx={textFieldStyle}
            />
            <FormControl fullWidth required>
              <InputLabel>Kecamatan</InputLabel>
              <Select
                value={formData.kecamatan_id}
                label="Kecamatan"
                onChange={(e) => setFormData({ ...formData, kecamatan_id: e.target.value })}
                sx={selectStyle}
              >
                {kecamatanList.map((k) => (
                  <MenuItem key={k.id} value={k.id}>{k.nama}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Alamat"
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              fullWidth
              sx={textFieldStyle}
            />
            <TextField
              label={labelJumlah(formData.jenis)}
              type="number"
              value={formData.jumlah_petugas}
              onChange={(e) => setFormData({ ...formData, jumlah_petugas: e.target.value })}
              fullWidth
              required
              sx={textFieldStyle}
            />

            {/* Baris Latitude & Longitude + Tombol GPS */}
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                fullWidth
                sx={textFieldStyle}
              />
              <TextField
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                fullWidth
                sx={textFieldStyle}
              />
              <Button
                variant="outlined"
                onClick={handleGetCurrentLocation}
                disabled={gpsLoading}
                startIcon={gpsLoading ? <CircularProgress size={16} /> : <FiMapPin />}
                sx={{
                  minWidth: "auto",
                  whiteSpace: "nowrap",
                  borderColor: C.border,
                  color: C.textDim,
                  borderRadius: "8px",
                  textTransform: "none",
                  "&:hover": { borderColor: C.textFaint },
                }}
              >
                {gpsLoading ? "..." : "GPS"}
              </Button>
            </Box>

            <TextField
              label="Peta Pos X (%)"
              value={formData.peta_pos_x}
              onChange={(e) => setFormData({ ...formData, peta_pos_x: e.target.value })}
              fullWidth
              sx={textFieldStyle}
            />
            <TextField
              label="Peta Pos Y (%)"
              value={formData.peta_pos_y}
              onChange={(e) => setFormData({ ...formData, peta_pos_y: e.target.value })}
              fullWidth
              sx={textFieldStyle}
            />
            <FormControl fullWidth>
              <InputLabel>Kondisi</InputLabel>
              <Select
                value={formData.kondisi}
                label="Kondisi"
                onChange={(e) => setFormData({ ...formData, kondisi: e.target.value })}
                sx={selectStyle}
              >
                {KONDISI_OPTIONS.map((k) => (
                  <MenuItem key={k} value={k}>{k}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                sx={selectStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Terakhir Diperiksa"
              type="date"
              value={formData.terakhir_diperiksa}
              onChange={(e) => setFormData({ ...formData, terakhir_diperiksa: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={textFieldStyle}
            />
            <TextField
              label="Catatan"
              value={formData.catatan}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              multiline
              minRows={2}
              fullWidth
              sx={textFieldStyle}
            />
            {formError && <Alert severity="error">{formError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: C.textDim }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            sx={{
              bgcolor: C.amber,
              "&:hover": { bgcolor: "#D97706" },
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detail */}
      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { bgcolor: C.panel, borderRadius: "14px", color: C.text } }}
      >
        {detailItem && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>{detailItem.nama_lokasi}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color={C.textDim}>
                Jenis: {detailItem.jenis}<br />
                Kecamatan: {detailItem.kecamatan_nama}<br />
                {detailItem.alamat && (
                  <>
                    Alamat: {detailItem.alamat}
                    <br />
                  </>
                )}
                {labelJumlah(detailItem.jenis)}: {detailItem.jumlah_petugas}<br />
                Kondisi: {detailItem.kondisi}<br />
                Status: {detailItem.status}<br />
                {detailItem.latitude && (
                  <>
                    Lat: {detailItem.latitude} &nbsp; Lng: {detailItem.longitude}
                    <br />
                  </>
                )}
                {detailItem.peta_pos_x && (
                  <>
                    Peta X: {detailItem.peta_pos_x}% &nbsp; Y: {detailItem.peta_pos_y}%
                    <br />
                  </>
                )}
                Terakhir diperiksa:{" "}
                {detailItem.terakhir_diperiksa
                  ? new Date(detailItem.terakhir_diperiksa).toLocaleDateString("id-ID")
                  : "-"}
              </Typography>
              {detailItem.catatan && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: C.panel2,
                    borderRadius: "8px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <Typography variant="caption" color={C.textDim}>
                    Catatan:
                  </Typography>
                  <Typography variant="body2" color={C.text}>
                    {detailItem.catatan}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function LegendDot({ color, label, shape = "circle" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: shape === "circle" ? "50%" : "2px",
          bgcolor: color,
        }}
      />
      <Typography sx={{ fontSize: 12, color: C.textDim }}>{label}</Typography>
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

// Diterapkan langsung ke <Select>, jadi root-nya sudah OutlinedInput
const selectStyle = {
  bgcolor: C.panel2,
  borderRadius: "10px",
  "& fieldset": { borderColor: C.border },
  "&:hover fieldset": { borderColor: C.textFaint },
  "& .MuiSelect-select": { color: C.text, fontSize: 14 },
};