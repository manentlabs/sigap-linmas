import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardContent,
} from "@mui/material";
import {
  FiMapPin,
  FiX,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "../services/api";

// Perbaiki default icon leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const C = {
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  amberBg: "rgba(242,169,59,0.14)",
  teal: "#0EA5A5",
  tealBg: "rgba(14,165,165,0.10)",
  red: "#E5484D",
  redBg: "rgba(229,72,77,0.10)",
  indigo: "#3B82F6",
  indigoBg: "rgba(59,130,246,0.10)",
  slate: "#64748B",
  slateBg: "rgba(100,116,139,0.10)",
  border: "#E4E9F2",
  panel: "#FFFFFF",
};

const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

// Helper
const formatJam = (time) => (time ? time.substring(0, 5) : "-");
const formatTanggal = (iso) => {
  if (!iso) return "-";
  return format(parseISO(iso), "dd MMM yyyy", { locale: idLocale });
};

// Parse koordinat
const parseKoordinat = (str) => {
  if (!str) return null;
  const parts = str.split(",");
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
};

// Ambil lokasi geolokasi
function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

// ====== Komponen Dialog ======
function MapDialog({ open, lat, lng, label, onClose }) {
  const mapRef = useRef(null);
  useEffect(() => {
    if (open && mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 200);
    }
  }, [open]);
  if (lat === null || lng === null) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
        <Button onClick={onClose} sx={{ minWidth: "auto", color: C.textDim }}>
          <FiX size={18} />
        </Button>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: 300, width: "100%", borderRadius: 2, overflow: "hidden" }}>
          <MapContainer
            center={[lat, lng]}
            zoom={16}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(map) => { mapRef.current = map; }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
              <Popup>{label}</Popup>
            </Marker>
          </MapContainer>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function PhotoDialog({ open, src, label, onClose }) {
  if (!src) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
        <Button onClick={onClose} sx={{ minWidth: "auto", color: C.textDim }}>
          <FiX size={18} />
        </Button>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", justifyContent: "center", pb: 3 }}>
        <Box
          component="img"
          src={src}
          alt={label}
          sx={{ maxWidth: "100%", maxHeight: 480, borderRadius: 2, border: `1px solid ${C.border}` }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CameraActionButton({ label, icon, loading, color, shadowColor, onCapture }) {
  return (
    <Button
      component="label"
      variant="contained"
      size="large"
      disabled={loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : icon}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        fontSize: 16,
        borderRadius: 3,
        py: 1.5,
        px: 5,
        bgcolor: color,
        color: "#fff",
        boxShadow: `0 4px 14px ${shadowColor}`,
        "&:hover": { bgcolor: color },
      }}
    >
      {loading ? "Memproses..." : label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onCapture(f);
        }}
      />
    </Button>
  );
}

// ====== KOMPONEN UTAMA ======
export default function AbsensiHistory() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isKepalaSatgas = role === "kepala_satgas";
  const isOperator = role === "operator_kecamatan";
  const isNonP3K = role === "non_p3k";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // canAccessPersonal -> menentukan endpoint riwayat mana yang dipakai
  // ("riwayat pribadi" vs "semua data"). Admin TIDAK termasuk di sini
  // supaya admin tetap melihat data absensi semua anggota di tabel bawah.
  const canAccessPersonal = isNonP3K || isOperator;

  // canDoAbsensi -> menentukan siapa yang boleh melakukan absen (checkin/checkout).
  // Admin ditambahkan di sini supaya bisa mengecek/test fitur absen,
  // tapi tabel riwayat tetap menampilkan "Semua Data Absensi".
  const canDoAbsensi = isNonP3K || isOperator || isAdmin;

  // State untuk riwayat (digunakan untuk semua role)
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterBulan, setFilterBulan] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // State untuk absensi hari ini (untuk non_p3k, operator, & admin)
  const [absensiHariIni, setAbsensiHariIni] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast & dialog
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });
  const [mapDialog, setMapDialog] = useState({ open: false, lat: null, lng: null, label: "" });
  const [photoDialog, setPhotoDialog] = useState({ open: false, src: null, label: "" });

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // ====== Fetch status hari ini (untuk yang punya akses absen) ======
  const fetchStatusHariIni = useCallback(async () => {
    try {
      const res = await api.get("/absensi/today");
      const data = res.data.data;
      if (data) {
        setAbsensiHariIni({
          id: data.id,
          jam_masuk: data.jam_masuk,
          jam_keluar: data.jam_keluar || null,
          lokasi_checkin: data.lokasi_checkin || null,
          lokasi_checkout: data.lokasi_checkout || null,
          foto_masuk: data.foto_masuk || null,
          foto_keluar: data.foto_keluar || null,
          status: data.status,
        });
      } else {
        setAbsensiHariIni(null);
      }
    } catch (err) {
      console.error("Gagal cek status:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // ====== Fetch riwayat (semua role) ======
  const fetchRiwayat = useCallback(async () => {
    setLoading(true);
    try {
      // Jika non_p3k atau operator, gunakan endpoint /riwayat
      // Jika admin atau kepala_satgas, gunakan endpoint /absensi (semua data)
      let endpoint = "/absensi/riwayat";
      let params = {
        page: page + 1,
        limit: rowsPerPage,
        sort: "terbaru",
      };
      if (filterStatus !== "Semua") params.status = filterStatus;
      if (filterBulan) params.bulan = filterBulan;

      if (!canAccessPersonal) {
        // Admin / kepala_satgas: gunakan endpoint /absensi dengan filter tambahan
        endpoint = "/absensi";
        // Untuk admin, kita tambahkan filter tanggal (bulan) jika ada
        if (filterBulan) {
          const [year, month] = filterBulan.split("-");
          if (year && month) {
            // backend menerima parameter tanggal atau bulan? Kita pakai tanggal range atau bulan
            // Karena di controller getAllAbsensi menerima tanggal (full date), kita ubah ke awal bulan
            // Lebih mudah: kita kirim bulan sebagai string YYYY-MM, backend bisa diubah untuk menerima bulan
            // Atau kita kirim tanggal awal dan akhir. Karena backend belum mendukung bulan, kita lewati dulu.
            // Kita bisa kirim parameter 'bulan' dan modifikasi controller, atau kita filter manual.
            // Untuk simpel, kita lewati dulu.
          }
        }
        if (filterStatus !== "Semua") params.status = filterStatus;
        // tambahan filter q untuk nama jika diperlukan
      }

      const res = await api.get(endpoint, { params });
      // Jika endpoint /absensi, data di res.data.data sudah berupa array absensi dengan informasi anggota
      // Jika /riwayat, data juga array.
      setRiwayat(res.data.data || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch (err) {
      showToast("Gagal memuat riwayat", "error");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterStatus, filterBulan, canAccessPersonal]);

  // ====== Efek: load data ======
  useEffect(() => {
    if (canDoAbsensi) {
      fetchStatusHariIni();
    } else {
      setLoadingStatus(false);
    }
  }, [canDoAbsensi, fetchStatusHariIni]);

  useEffect(() => {
    fetchRiwayat();
  }, [fetchRiwayat]);

  useEffect(() => {
    setPage(0);
  }, [filterStatus, filterBulan]);

  // ====== Handler Absen (untuk yang punya akses absen) ======
  const handleMasuk = async (file) => {
    setActionLoading(true);
    try {
      const location = await getCurrentLocation();
      const fd = new FormData();
      if (location) fd.append("lokasi", `${location.lat}, ${location.lng}`);
      if (file) fd.append("foto", file);
      const res = await api.post("/absensi/checkin", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAbsensiHariIni({
        id: res.data.data.id,
        jam_masuk: res.data.data.jam_masuk,
        jam_keluar: null,
        lokasi_checkin: res.data.data.lokasi,
        lokasi_checkout: null,
        foto_masuk: res.data.data.foto_masuk || null,
        foto_keluar: null,
        status: "Hadir",
      });
      showToast("Absen masuk berhasil!", "success");
      fetchRiwayat();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal absen masuk", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePulang = async (file) => {
    setActionLoading(true);
    try {
      const location = await getCurrentLocation();
      const fd = new FormData();
      if (location) fd.append("lokasi", `${location.lat}, ${location.lng}`);
      if (file) fd.append("foto", file);
      const res = await api.post("/absensi/checkout", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAbsensiHariIni((prev) => ({
        ...prev,
        jam_keluar: res.data.data.jam_keluar,
        lokasi_checkout: res.data.data.lokasi_checkout,
        foto_keluar: res.data.data.foto_keluar || null,
      }));
      showToast("Absen pulang berhasil!", "success");
      fetchRiwayat();
    } catch (err) {
      showToast(err.response?.data?.message || "Gagal absen pulang", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ====== Data tabel ekspansi (untuk semua role) ======
  const expandedData = useMemo(() => {
    const result = [];
    riwayat.forEach((item) => {
      // Jika item memiliki anggota_nama (dari endpoint /absensi) atau tidak, kita tetap tampilkan
      const namaAnggota = item.anggota_nama || item.nama || "-";
      result.push({
        ...item,
        jenis: "Masuk",
        waktu: item.jam_masuk,
        lokasi: item.lokasi_checkin,
        foto: item.foto_masuk,
        key: `${item.id}-masuk`,
        anggota: namaAnggota,
      });
      if (item.jam_keluar) {
        result.push({
          ...item,
          jenis: "Pulang",
          waktu: item.jam_keluar,
          lokasi: item.lokasi_checkout,
          foto: item.foto_keluar,
          key: `${item.id}-pulang`,
          anggota: namaAnggota,
        });
      }
    });
    return result;
  }, [riwayat]);

  const statusColor = (status) => {
    switch (status) {
      case "Hadir": return { bg: C.tealBg, color: C.teal };
      case "Izin": return { bg: C.indigoBg, color: C.indigo };
      case "Sakit": return { bg: C.amberBg, color: C.amber };
      case "Alpha": return { bg: C.redBg, color: C.red };
      default: return { bg: C.slateBg, color: C.slate };
    }
  };

  const openMap = (lokasiStr, label) => {
    const coords = parseKoordinat(lokasiStr);
    if (coords) {
      setMapDialog({ open: true, lat: coords.lat, lng: coords.lng, label });
    } else {
      showToast("Lokasi tidak valid", "error");
    }
  };
  const closeMap = () => setMapDialog({ open: false, lat: null, lng: null, label: "" });

  const openPhoto = (fotoUrl, label) => {
    setPhotoDialog({ open: true, src: `${FILE_BASE_URL}${fotoUrl}`, label });
  };
  const closePhoto = () => setPhotoDialog({ open: false, src: null, label: "" });

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ====== RENDER ======
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
      {/* CARD STATUS HARI INI (untuk non_p3k, operator, & admin) */}
      <Card sx={{ mb: 4, borderRadius: 1, boxShadow: "0 8px 30px rgba(0,0,0,0.04)", border: `1px solid ${C.border}` }}>
        <CardContent sx={{ textAlign: "center", py: 4, px: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: C.text, mb: 1 }}>
            Absensi Hari Ini
          </Typography>
          <Typography sx={{ color: C.textDim, mb: 3 }}>{todayStr}</Typography>

          {!canDoAbsensi ? (
            <Box sx={{ py: 2 }}>
              <Typography sx={{ color: C.textDim, fontSize: 15 }}>
                Anda tidak memiliki akses untuk melakukan absensi.
                {isKepalaSatgas
                  ? " Sebagai kepala satgas, Anda dapat melihat semua data absensi di bawah."
                  : ""}
              </Typography>
            </Box>
          ) : loadingStatus ? (
            <CircularProgress size={28} sx={{ color: C.amber }} />
          ) : !absensiHariIni ? (
            <Box>
              <Typography sx={{ mb: 3, color: C.textDim }}>Anda belum absen hari ini.</Typography>
              <CameraActionButton
                label="Absen Masuk"
                icon={<FiLogIn size={20} />}
                loading={actionLoading}
                color={C.teal}
                shadowColor="rgba(14,165,165,0.4)"
                onCapture={handleMasuk}
              />
            </Box>
          ) : !absensiHariIni.jam_keluar ? (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                <FiCheckCircle size={28} color={C.amber} />
                <Typography sx={{ fontSize: 18, fontWeight: 600, color: C.amber }}>
                  Sudah Absen Masuk
                </Typography>
              </Box>
              <Box sx={{ bgcolor: C.amberBg, p: 2, borderRadius: 2, mb: 3, textAlign: "left" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FiClock size={16} color={C.amber} />
                  <Typography sx={{ fontSize: 13, color: C.text }}>
                    Jam Masuk: <strong>{formatJam(absensiHariIni.jam_masuk)}</strong>
                  </Typography>
                </Box>
                {absensiHariIni.lokasi_checkin && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <FiMapPin size={16} color={C.amber} />
                    <Typography sx={{ fontSize: 13, color: C.text }}>
                      Lokasi Masuk: <strong>{absensiHariIni.lokasi_checkin}</strong>
                    </Typography>
                  </Box>
                )}
                {absensiHariIni.foto_masuk && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <FiImage size={16} color={C.amber} />
                    <Button
                      size="small"
                      onClick={() => openPhoto(absensiHariIni.foto_masuk, "Foto Absen Masuk")}
                      sx={{ textTransform: "none", fontSize: 13, color: C.amber, p: 0, minWidth: "auto" }}
                    >
                      Lihat Foto Masuk
                    </Button>
                  </Box>
                )}
              </Box>
              <CameraActionButton
                label="Absen Pulang"
                icon={<FiLogOut size={20} />}
                loading={actionLoading}
                color={C.red}
                shadowColor="rgba(229,72,77,0.4)"
                onCapture={handlePulang}
              />
            </Box>
          ) : (
            <Box>
              <FiCheckCircle size={48} color={C.teal} style={{ marginBottom: 16 }} />
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: C.teal, mb: 1 }}>
                Absensi Hari Ini Lengkap
              </Typography>
              <Box sx={{ bgcolor: C.tealBg, p: 2, borderRadius: 2, textAlign: "left" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FiClock size={16} color={C.teal} />
                  <Typography sx={{ fontSize: 13, color: C.text }}>
                    Masuk: <strong>{formatJam(absensiHariIni.jam_masuk)}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <FiClock size={16} color={C.teal} />
                  <Typography sx={{ fontSize: 13, color: C.text }}>
                    Pulang: <strong>{formatJam(absensiHariIni.jam_keluar)}</strong>
                  </Typography>
                </Box>
                {absensiHariIni.lokasi_checkin && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <FiMapPin size={16} color={C.teal} />
                    <Typography sx={{ fontSize: 13, color: C.text }}>
                      Lokasi Masuk: <strong>{absensiHariIni.lokasi_checkin}</strong>
                    </Typography>
                  </Box>
                )}
                {absensiHariIni.lokasi_checkout && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <FiMapPin size={16} color={C.teal} />
                    <Typography sx={{ fontSize: 13, color: C.text }}>
                      Lokasi Pulang: <strong>{absensiHariIni.lokasi_checkout}</strong>
                    </Typography>
                  </Box>
                )}
                {(absensiHariIni.foto_masuk || absensiHariIni.foto_keluar) && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
                    <FiImage size={16} color={C.teal} />
                    {absensiHariIni.foto_masuk && (
                      <Button
                        size="small"
                        onClick={() => openPhoto(absensiHariIni.foto_masuk, "Foto Absen Masuk")}
                        sx={{ textTransform: "none", fontSize: 13, color: C.teal, p: 0, minWidth: "auto" }}
                      >
                        Foto Masuk
                      </Button>
                    )}
                    {absensiHariIni.foto_keluar && (
                      <Button
                        size="small"
                        onClick={() => openPhoto(absensiHariIni.foto_keluar, "Foto Absen Pulang")}
                        sx={{ textTransform: "none", fontSize: 13, color: C.teal, p: 0, minWidth: "auto" }}
                      >
                        Foto Pulang
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* RIWAYAT - tampil untuk semua role */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: C.text }}>
        {canAccessPersonal ? "Riwayat Absensi Saya" : "Semua Data Absensi"}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="Bulan (YYYY-MM)"
          size="small"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="Semua">Semua</MenuItem>
            <MenuItem value="Hadir">Hadir</MenuItem>
            <MenuItem value="Izin">Izin</MenuItem>
            <MenuItem value="Sakit">Sakit</MenuItem>
            <MenuItem value="Alpha">Alpha</MenuItem>
          </Select>
        </FormControl>
        <Typography sx={{ ml: "auto", fontSize: 13, color: C.textDim }}>
          {total} catatan
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: C.amber }} />
        </Box>
      ) : isMobile ? (
        <>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
            {expandedData.length > 0 ? (
              expandedData.map((row) => (
                <Box
                  key={row.key}
                  sx={{
                    bgcolor: "white",
                    border: `1px solid ${C.border}`,
                    borderRadius: "12px",
                    p: 1.6,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
                        {row.anggota}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace" }}>
                        {formatTanggal(row.tanggal)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.6, flexShrink: 0 }}>
                      <Chip
                        label={row.jenis}
                        size="small"
                        sx={{
                          bgcolor: row.jenis === "Masuk" ? C.tealBg : C.amberBg,
                          color: row.jenis === "Masuk" ? C.teal : C.amber,
                          fontWeight: 600,
                          fontSize: 10.5,
                          height: 20,
                        }}
                      />
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          bgcolor: statusColor(row.status).bg,
                          color: statusColor(row.status).color,
                          fontWeight: 600,
                          fontSize: 10.5,
                          height: 20,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.2, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <FiClock size={13} color={C.textDim} />
                      <Typography sx={{ fontSize: 12.5, color: C.textDim, fontFamily: "monospace" }}>
                        {formatJam(row.waktu)}
                      </Typography>
                    </Box>

                    {parseKoordinat(row.lokasi) && (
                      <Button
                        size="small"
                        startIcon={<FiMapPin size={13} />}
                        onClick={() => openMap(row.lokasi, `${row.jenis} - ${formatTanggal(row.tanggal)}`)}
                        sx={{ textTransform: "none", fontSize: 12, color: C.indigo, p: 0, minWidth: "auto" }}
                      >
                        Peta
                      </Button>
                    )}

                    {row.foto && (
                      <Box
                        component="img"
                        src={`${FILE_BASE_URL}${row.foto}`}
                        onClick={() => openPhoto(row.foto, `Foto ${row.jenis} - ${formatTanggal(row.tanggal)}`)}
                        sx={{
                          width: 32,
                          height: 32,
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: `1px solid ${C.border}`,
                          cursor: "pointer",
                          ml: "auto",
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ bgcolor: "white", border: `1px solid ${C.border}`, borderRadius: "14px", textAlign: "center", py: 4, color: C.textFaint, fontSize: 13.5 }}>
                Belum ada data absensi.
              </Box>
            )}
          </Box>
          <Box sx={{ bgcolor: "white", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", mt: 1.2 }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Baris"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            />
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ bgcolor: "white", border: `1px solid ${C.border}`, borderRadius: "14px 14px 0 0", overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 850 }}>
              <TableHead>
                <TableRow>
                  {["Tanggal", "Anggota", "Jenis", "Waktu", "Lokasi", "Foto", "Status"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: C.textFaint, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {expandedData.length > 0 ? (
                  expandedData.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "monospace" }}>
                        {formatTanggal(row.tanggal)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                        {row.anggota}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                        <Chip
                          label={row.jenis}
                          size="small"
                          sx={{
                            bgcolor: row.jenis === "Masuk" ? C.tealBg : C.amberBg,
                            color: row.jenis === "Masuk" ? C.teal : C.amber,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}`, fontFamily: "monospace", fontSize: 13 }}>
                        {formatJam(row.waktu)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                        {parseKoordinat(row.lokasi) ? (
                          <Button
                            size="small"
                            startIcon={<FiMapPin size={14} />}
                            onClick={() => openMap(row.lokasi, `${row.jenis} - ${formatTanggal(row.tanggal)}`)}
                            sx={{ textTransform: "none", fontSize: 12, color: C.indigo }}
                          >
                            Lihat Peta
                          </Button>
                        ) : (
                          <Typography variant="body2" sx={{ color: C.textFaint }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                        {row.foto ? (
                          <Box
                            component="img"
                            src={`${FILE_BASE_URL}${row.foto}`}
                            onClick={() => openPhoto(row.foto, `Foto ${row.jenis} - ${formatTanggal(row.tanggal)}`)}
                            sx={{
                              width: 36,
                              height: 36,
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: `1px solid ${C.border}`,
                              cursor: "pointer",
                            }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: C.textFaint }}>-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${C.border}` }}>
                        <Chip
                          label={row.status}
                          size="small"
                          sx={{
                            bgcolor: statusColor(row.status).bg,
                            color: statusColor(row.status).color,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: C.textFaint }}>
                      Belum ada data absensi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ bgcolor: "white", border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Baris per halaman"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            />
          </Box>
        </>
      )}

      {/* Dialog */}
      <MapDialog
        open={mapDialog.open}
        lat={mapDialog.lat}
        lng={mapDialog.lng}
        label={mapDialog.label}
        onClose={closeMap}
      />
      <PhotoDialog
        open={photoDialog.open}
        src={photoDialog.src}
        label={photoDialog.label}
        onClose={closePhoto}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}