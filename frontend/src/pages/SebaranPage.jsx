import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Fade,
} from "@mui/material";
import { FiUsers, FiMapPin, FiLayers, FiFileText, FiClock, FiRadio } from "react-icons/fi";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import api from "../services/api";

// ===== Leaflet & ikon (ES module) =====
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
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

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* =========================================================================
   TEMA WARNA LIGHT
   ========================================================================= */
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
  rose: "#EC4899",
  slate: "#CBD5E1",
  violet: "#8B5CF6",
};

// ===== Konfigurasi =====
const MAP_CENTER = [-7.08, 107.65]; // Sesuaikan dengan wilayah Anda
const GEOJSON_PATH = "/geojson/kecamatan.geojson"; // file hasil dissolve

// Interval rotasi hero agenda (ms) & interval refresh data agenda (ms)
const HERO_ROTATE_MS = 5000;
const HERO_REFRESH_MS = 60000;

const KELOMPOK_UMUR = [
  { label: "< 25 th", min: 0, max: 24, color: C.teal },
  { label: "25–34 th", min: 25, max: 34, color: C.indigo },
  { label: "35–44 th", min: 35, max: 44, color: C.amber },
  { label: "45–54 th", min: 45, max: 54, color: "#F97316" },
  { label: "55+ th", min: 55, max: 999, color: C.red },
];

// ===== Mode tampilan peta =====
// Catatan: mode "jumlah", "umur", "jenis_kelamin" dipecah menjadi masing-masing
// 2 varian: Non P3K Paruh Waktu & Linmas Desa. Mode "status" & "laporan" tetap gabungan.
const MAP_MODES = [
  { value: "jumlah_non_p3k", label: "Jumlah Aktif — Non P3K Paruh Waktu" },
  { value: "jumlah_linmas_desa", label: "Jumlah Aktif — Linmas Desa" },
  { value: "umur_non_p3k", label: "Kelompok Usia — Non P3K Paruh Waktu" },
  { value: "umur_linmas_desa", label: "Kelompok Usia — Linmas Desa" },
  { value: "jenis_kelamin_non_p3k", label: "Jenis Kelamin — Non P3K Paruh Waktu" },
  { value: "jenis_kelamin_linmas_desa", label: "Jenis Kelamin — Linmas Desa" },
  { value: "status", label: "Status Keanggotaan" },
  { value: "laporan", label: "Sebaran Hasil Laporan" },
];

// Palet warna untuk kategori laporan (dinamis, bertambah sesuai jumlah kategori)
const KATEGORI_LAPORAN_PALETTE = [
  "#8B5CF6", "#6366F1", "#F59E0B", "#EC4899", "#10B981",
  "#EF4444", "#F97316", "#0EA5E9", "#14B8A6", "#A855F7",
];
function warnaKategoriLaporan(index) {
  return KATEGORI_LAPORAN_PALETTE[index % KATEGORI_LAPORAN_PALETTE.length];
}

function hitungUmur(tanggalLahir) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  const now = new Date();
  let umur = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    now.getMonth() < lahir.getMonth() ||
    (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

// ===== Helper untuk deteksi agenda yang sedang berlangsung =====
function waktuKeMenit(waktuStr) {
  if (!waktuStr) return null;
  const parts = String(waktuStr).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function filterAgendaBerlangsung(list) {
  const now = new Date();
  const menitSekarang = now.getHours() * 60 + now.getMinutes();
  return (list || [])
    .filter((a) => {
      const st = (a.status || "").toLowerCase();
      if (st === "selesai" || st === "dibatalkan" || st === "batal") return false;
      const mulai = waktuKeMenit(a.waktu_mulai);
      if (mulai === null) return false;
      const selesai = waktuKeMenit(a.waktu_selesai);
      if (selesai === null) return menitSekarang >= mulai;
      return menitSekarang >= mulai && menitSekarang <= selesai;
    })
    .sort((a, b) => (waktuKeMenit(a.waktu_mulai) || 0) - (waktuKeMenit(b.waktu_mulai) || 0));
}

function formatJam(waktuStr) {
  if (!waktuStr) return "-";
  const parts = String(waktuStr).split(":");
  if (parts.length < 2) return waktuStr;
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

export default function PetaSebaran() {
  const [anggota, setAnggota] = useState([]);
  const [laporanPerKecamatan, setLaporanPerKecamatan] = useState({}); // { NAMA_KEC: { total, kategori: {}, dominan } }
  const [kategoriLaporanList, setKategoriLaporanList] = useState([]); // daftar semua kategori jenis_kegiatan
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedKec, setSelectedKec] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [mapMode, setMapMode] = useState("jumlah_non_p3k");

  // ===== Hero agenda berlangsung =====
  const [agendaBerlangsung, setAgendaBerlangsung] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  // Ambil data anggota, laporan, & geojson kecamatan
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        // Data anggota dari API /sebaran
        const { data } = await api.get("/sebaran");
        const list = data?.data || [];
        if (mounted) {
          if (Array.isArray(list) && list.length > 0) {
            const normalized = list.map((a) => ({
              ...a,
              umur: hitungUmur(a.tanggal_lahir),
            }));
            setAnggota(normalized);
            setUsingFallback(false);
          } else {
            setAnggota([]);
            setUsingFallback(true);
          }
        }

        // Data sebaran laporan per kecamatan berdasarkan kategori (jenis_kegiatan)
        try {
          const { data: laporanRes } = await api.get("/laporan/stats/per-kecamatan");
          const laporanList = laporanRes?.data || [];
          if (mounted) {
            const map = {};
            const kategoriSet = new Set();
            laporanList.forEach((r) => {
              const key = (r.kecamatan_nama || "").trim().toUpperCase();
              const kategori = r.jenis_kegiatan_nama || "Lainnya";
              const jumlah = Number(r.jumlah) || 0;
              if (!key) return;
              kategoriSet.add(kategori);
              if (!map[key]) map[key] = { total: 0, kategori: {} };
              map[key].kategori[kategori] = (map[key].kategori[kategori] || 0) + jumlah;
              map[key].total += jumlah;
            });
            // Tentukan kategori dominan per kecamatan (dipakai mode peta "laporan")
            Object.keys(map).forEach((key) => {
              let dominan = { nama: null, jumlah: 0 };
              Object.entries(map[key].kategori).forEach(([nama, jumlah]) => {
                if (jumlah > dominan.jumlah) dominan = { nama, jumlah };
              });
              map[key].dominan = dominan;
            });
            setLaporanPerKecamatan(map);
            setKategoriLaporanList(Array.from(kategoriSet).sort());
          }
        } catch (errLaporan) {
          console.warn("Sebaran laporan tidak tersedia:", errLaporan);
          if (mounted) {
            setLaporanPerKecamatan({});
            setKategoriLaporanList([]);
          }
        }

        // GeoJSON kecamatan
        const res = await fetch(GEOJSON_PATH);
        if (!res.ok) throw new Error("GeoJSON tidak ditemukan");
        const geojson = await res.json();
        if (mounted) {
          setGeoData(geojson);
          setMapError(false);
        }
      } catch (err) {
        console.error("Gagal memuat data:", err);
        if (mounted) {
          setMapError(true);
          setUsingFallback(true);
          setAnggota([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Ambil agenda hari ini & tentukan mana yang sedang berlangsung, refresh berkala
  useEffect(() => {
    let mounted = true;
    async function loadAgenda() {
      try {
        const { data } = await api.get("/agenda", { params: { hari_ini: "true" } });
        const list = data?.data || [];
        if (mounted) {
          setAgendaBerlangsung(filterAgendaBerlangsung(list));
        }
      } catch (err) {
        console.warn("Gagal memuat agenda:", err);
        if (mounted) setAgendaBerlangsung([]);
      }
    }
    loadAgenda();
    const refreshInterval = setInterval(loadAgenda, HERO_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  // Reset index kartu hero jika daftar berubah
  useEffect(() => {
    setHeroIndex(0);
  }, [agendaBerlangsung.length]);

  // Rotasi otomatis antar kartu agenda (fade out -> ganti -> fade in)
  useEffect(() => {
    if (agendaBerlangsung.length <= 1) return undefined;
    const rotateInterval = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % agendaBerlangsung.length);
        setHeroVisible(true);
      }, 250);
    }, HERO_ROTATE_MS);
    return () => clearInterval(rotateInterval);
  }, [agendaBerlangsung.length]);

  // Hitung jumlah anggota aktif per kecamatan (UPPERCASE) — dipakai untuk skala umum
  const jumlahPerKecamatan = useMemo(() => {
    const map = {};
    anggota.forEach((a) => {
      if (a.status === "Aktif") {
        const key = (a.kecamatan || "").trim().toUpperCase();
        if (key) map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [anggota]);

  // Statistik lengkap per kecamatan (usia, gender, status, keterangan, laporan)
  // + breakdown khusus per kategori (Non P3K Paruh Waktu & Linmas Desa) — dipakai peta & grafik terpisah
  const statistikPerKecamatan = useMemo(() => {
    const map = {};
    anggota.forEach((a) => {
      const key = (a.kecamatan || "").trim().toUpperCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          total: 0,
          aktif: 0,
          nonaktif: 0,
          gender: { L: 0, P: 0 },
          keterangan: {
            "Non P3K Paruh Waktu": 0,
            "P3K Paruh Waktu": 0,
            "Linmas Desa": 0,
          },
          umurGroups: KELOMPOK_UMUR.map(() => 0),
          byKategori: {
            "Non P3K Paruh Waktu": {
              aktif: 0,
              gender: { L: 0, P: 0 },
              umurGroups: KELOMPOK_UMUR.map(() => 0),
            },
            "Linmas Desa": {
              aktif: 0,
              gender: { L: 0, P: 0 },
              umurGroups: KELOMPOK_UMUR.map(() => 0),
            },
          },
        };
      }
      const s = map[key];
      s.total += 1;
      if (a.status === "Aktif") s.aktif += 1;
      if (a.status === "Nonaktif") s.nonaktif += 1;
      if (s.gender[a.jenis_kelamin] !== undefined) s.gender[a.jenis_kelamin] += 1;

      let ket = a.keterangan;
      if (s.keterangan[ket] !== undefined) {
        s.keterangan[ket] += 1;
      } else {
        // Data lama tanpa field keterangan dianggap P3K Paruh Waktu (default)
        ket = "P3K Paruh Waktu";
        s.keterangan[ket] += 1;
      }

      let umurIdx = -1;
      if (typeof a.umur === "number") {
        umurIdx = KELOMPOK_UMUR.findIndex(
          (g) => a.umur >= g.min && a.umur <= g.max
        );
        if (umurIdx !== -1) s.umurGroups[umurIdx] += 1;
      }

      // Breakdown khusus per kategori (hanya Non P3K Paruh Waktu & Linmas Desa)
      const bk = s.byKategori[ket];
      if (bk) {
        if (a.status === "Aktif") bk.aktif += 1;
        if (bk.gender[a.jenis_kelamin] !== undefined) bk.gender[a.jenis_kelamin] += 1;
        if (umurIdx !== -1) bk.umurGroups[umurIdx] += 1;
      }
    });
    // Sisipkan jumlah laporan & kategori dominan per kecamatan (tetap gabungan)
    Object.keys(map).forEach((key) => {
      const laporanInfo = laporanPerKecamatan[key];
      map[key].laporan = laporanInfo?.total || 0;
      map[key].laporanDominan = laporanInfo?.dominan || { nama: null, jumlah: 0 };
    });
    return map;
  }, [anggota, laporanPerKecamatan]);

  // Nilai maksimum untuk skala warna peta (kepadatan)
  const maxAktif = Math.max(1, ...Object.values(jumlahPerKecamatan));

  const maxAktifNonP3K = useMemo(
    () =>
      Math.max(
        1,
        ...Object.values(statistikPerKecamatan).map(
          (s) => s.byKategori["Non P3K Paruh Waktu"].aktif
        )
      ),
    [statistikPerKecamatan]
  );

  const maxAktifLinmasDesa = useMemo(
    () =>
      Math.max(
        1,
        ...Object.values(statistikPerKecamatan).map(
          (s) => s.byKategori["Linmas Desa"].aktif
        )
      ),
    [statistikPerKecamatan]
  );

  // Filter data berdasarkan kecamatan yang dipilih
  const dataTerfilter = useMemo(() => {
    if (!selectedKec) return anggota;
    return anggota.filter(
      (a) => (a.kecamatan || "").trim().toUpperCase() === selectedKec
    );
  }, [anggota, selectedKec]);

  // Breakdown statistik (untuk kartu ringkasan & grafik)
  // + byKategori: breakdown gender/umur/aktif khusus Non P3K Paruh Waktu & Linmas Desa
  const breakdown = useMemo(() => {
    const gender = { L: 0, P: 0 };
    const status = { Aktif: 0, Nonaktif: 0 };
    const keterangan = {
      "Non P3K Paruh Waktu": 0,
      "P3K Paruh Waktu": 0,
      "Linmas Desa": 0,
    };
    const umurGroup = KELOMPOK_UMUR.map(() => 0);

    const byKategori = {
      "Non P3K Paruh Waktu": {
        aktif: 0,
        gender: { L: 0, P: 0 },
        umurGroup: KELOMPOK_UMUR.map(() => 0),
      },
      "Linmas Desa": {
        aktif: 0,
        gender: { L: 0, P: 0 },
        umurGroup: KELOMPOK_UMUR.map(() => 0),
      },
    };

    dataTerfilter.forEach((a) => {
      if (gender[a.jenis_kelamin] !== undefined) gender[a.jenis_kelamin] += 1;
      if (status[a.status] !== undefined) status[a.status] += 1;

      let ket = a.keterangan;
      if (keterangan[ket] !== undefined) {
        keterangan[ket] += 1;
      } else {
        ket = "P3K Paruh Waktu";
        keterangan[ket] += 1;
      }

      let idx = -1;
      if (typeof a.umur === "number") {
        idx = KELOMPOK_UMUR.findIndex((g) => a.umur >= g.min && a.umur <= g.max);
        if (idx !== -1) umurGroup[idx] += 1;
      }

      const bk = byKategori[ket];
      if (bk) {
        if (a.status === "Aktif") bk.aktif += 1;
        if (bk.gender[a.jenis_kelamin] !== undefined) bk.gender[a.jenis_kelamin] += 1;
        if (idx !== -1) bk.umurGroup[idx] += 1;
      }
    });

    // Jumlah laporan mengikuti kecamatan terpilih (atau total semua) — tetap gabungan
    let jumlahLaporan = 0;
    if (selectedKec) {
      jumlahLaporan = laporanPerKecamatan[selectedKec]?.total || 0;
    } else {
      jumlahLaporan = Object.values(laporanPerKecamatan).reduce(
        (a, v) => a + (v.total || 0),
        0
      );
    }

    return {
      gender,
      status,
      keterangan,
      umurGroup,
      linmasDesa: keterangan["Linmas Desa"],
      jumlahLaporan,
      byKategori,
    };
  }, [dataTerfilter, selectedKec, laporanPerKecamatan]);

  // Data grafik "Sebaran Laporan per Kecamatan" — stacked bar, satu dataset per kategori kegiatan (gabungan, tidak dipisah)
  const grafikLaporanPerKecamatan = useMemo(() => {
    const labels = Object.keys(laporanPerKecamatan);

    const datasets = kategoriLaporanList.map((kategori, idx) => ({
      label: kategori,
      data: labels.map((k) => laporanPerKecamatan[k]?.kategori?.[kategori] || 0),
      backgroundColor: warnaKategoriLaporan(idx),
      stack: "laporan",
      borderRadius: 3,
      maxBarThickness: 40,
      // Highlight kecamatan yang sedang difilter dengan border tebal
      borderWidth: labels.map((k) => (selectedKec && k === selectedKec ? 2 : 0)),
      borderColor: labels.map(() => C.text),
    }));

    return { labels, datasets };
  }, [laporanPerKecamatan, kategoriLaporanList, selectedKec]);

  // Breakdown jumlah laporan per KATEGORI (jenis_kegiatan), mengikuti kecamatan terpilih atau seluruh wilayah (gabungan)
  const laporanKategoriBreakdown = useMemo(() => {
    const result = {};
    kategoriLaporanList.forEach((k) => (result[k] = 0));

    if (selectedKec) {
      const info = laporanPerKecamatan[selectedKec];
      if (info) {
        Object.entries(info.kategori).forEach(([k, v]) => {
          result[k] = (result[k] || 0) + v;
        });
      }
    } else {
      Object.values(laporanPerKecamatan).forEach((info) => {
        Object.entries(info.kategori).forEach(([k, v]) => {
          result[k] = (result[k] || 0) + v;
        });
      });
    }
    return result;
  }, [laporanPerKecamatan, kategoriLaporanList, selectedKec]);

  // Warna poligon berdasarkan rasio kepadatan (dipakai mode jumlah_non_p3k & jumlah_linmas_desa)
  const getColorDensity = (jumlah, max) => {
    if (!jumlah) return C.slate;
    const ratio = jumlah / max;
    if (ratio > 0.66) return C.amber;
    if (ratio > 0.33) return C.indigo;
    return C.teal;
  };

  // Menentukan warna + teks tooltip berdasarkan mode peta yang aktif
  const getTampilanKecamatan = (namaKec) => {
    const stat = statistikPerKecamatan[namaKec];

    if (!stat) {
      return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
    }

    if (mapMode === "jumlah_non_p3k") {
      const jumlah = stat.byKategori["Non P3K Paruh Waktu"].aktif;
      if (!jumlah) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      return {
        color: getColorDensity(jumlah, maxAktifNonP3K),
        tooltip: `${namaKec}: ${jumlah} anggota aktif Non P3K Paruh Waktu`,
      };
    }

    if (mapMode === "jumlah_linmas_desa") {
      const jumlah = stat.byKategori["Linmas Desa"].aktif;
      if (!jumlah) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      return {
        color: getColorDensity(jumlah, maxAktifLinmasDesa),
        tooltip: `${namaKec}: ${jumlah} anggota aktif Linmas Desa`,
      };
    }

    if (mapMode === "jenis_kelamin_non_p3k") {
      const { L, P } = stat.byKategori["Non P3K Paruh Waktu"].gender;
      if (!L && !P) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      const color = L === P ? C.slate : L > P ? C.indigo : C.rose;
      return {
        color,
        tooltip: `${namaKec}: ${L} laki-laki, ${P} perempuan (Non P3K Paruh Waktu)`,
      };
    }

    if (mapMode === "jenis_kelamin_linmas_desa") {
      const { L, P } = stat.byKategori["Linmas Desa"].gender;
      if (!L && !P) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      const color = L === P ? C.slate : L > P ? C.indigo : C.rose;
      return {
        color,
        tooltip: `${namaKec}: ${L} laki-laki, ${P} perempuan (Linmas Desa)`,
      };
    }

    if (mapMode === "status") {
      if (!stat.total) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      const ratioAktif = stat.aktif / stat.total;
      const color =
        ratioAktif > 0.66 ? C.teal : ratioAktif > 0.33 ? C.amber : C.red;
      return {
        color,
        tooltip: `${namaKec}: ${stat.aktif} aktif, ${stat.nonaktif} nonaktif`,
      };
    }

    if (mapMode === "laporan") {
      const jumlahLaporan = stat.laporan || 0;
      const dominan = stat.laporanDominan;
      if (!jumlahLaporan || !dominan?.nama) {
        return { color: C.slate, tooltip: `${namaKec}: belum ada laporan` };
      }
      const idx = kategoriLaporanList.indexOf(dominan.nama);
      return {
        color: idx >= 0 ? warnaKategoriLaporan(idx) : C.slate,
        tooltip: `${namaKec}: ${jumlahLaporan} laporan, terbanyak kategori "${dominan.nama}" (${dominan.jumlah})`,
      };
    }

    if (mapMode === "umur_non_p3k") {
      const groups = stat.byKategori["Non P3K Paruh Waktu"].umurGroups;
      const totalUmur = groups.reduce((a, b) => a + b, 0);
      if (!totalUmur) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      let maxIdx = 0;
      groups.forEach((v, i) => {
        if (v > groups[maxIdx]) maxIdx = i;
      });
      return {
        color: KELOMPOK_UMUR[maxIdx].color,
        tooltip: `${namaKec}: mayoritas ${KELOMPOK_UMUR[maxIdx].label} (${groups[maxIdx]} anggota Non P3K Paruh Waktu)`,
      };
    }

    if (mapMode === "umur_linmas_desa") {
      const groups = stat.byKategori["Linmas Desa"].umurGroups;
      const totalUmur = groups.reduce((a, b) => a + b, 0);
      if (!totalUmur) return { color: C.slate, tooltip: `${namaKec}: tidak ada data` };
      let maxIdx = 0;
      groups.forEach((v, i) => {
        if (v > groups[maxIdx]) maxIdx = i;
      });
      return {
        color: KELOMPOK_UMUR[maxIdx].color,
        tooltip: `${namaKec}: mayoritas ${KELOMPOK_UMUR[maxIdx].label} (${groups[maxIdx]} anggota Linmas Desa)`,
      };
    }

    return { color: C.slate, tooltip: namaKec };
  };

  // Style poligon kecamatan
  const styleFeature = (feature) => {
    const namaKec = (feature.properties.KECAMATAN || "").trim().toUpperCase();
    const { color } = getTampilanKecamatan(namaKec);
    return {
      fillColor: color,
      weight: 2,
      opacity: 1,
      color: "#94A3B8",
      fillOpacity: 0.5,
    };
  };

  // Event pada setiap fitur kecamatan
  const onEachFeature = (feature, layer) => {
    const namaKec = (feature.properties.KECAMATAN || "").trim().toUpperCase();
    const { tooltip } = getTampilanKecamatan(namaKec);

    layer.bindTooltip(tooltip, {
      sticky: true,
    });

    layer.on({
      click: () => {
        setSelectedKec((prev) => (prev === namaKec ? null : namaKec));
      },
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.7, weight: 2.5 });
      },
      mouseout: (e) => {
        e.target.setStyle({ fillOpacity: 0.5, weight: 2 });
      },
    });
  };

  // Legenda dinamis sesuai mode peta
  const renderLegenda = () => {
    switch (mapMode) {
      case "jenis_kelamin_non_p3k":
      case "jenis_kelamin_linmas_desa":
        return (
          <>
            <LegendDot color={C.indigo} label="Mayoritas laki-laki" />
            <LegendDot color={C.rose} label="Mayoritas perempuan" />
            <LegendDot color={C.slate} label="Tidak ada data" />
          </>
        );
      case "status":
        return (
          <>
            <LegendDot color={C.teal} label="Mayoritas aktif" />
            <LegendDot color={C.amber} label="Campuran" />
            <LegendDot color={C.red} label="Mayoritas nonaktif" />
            <LegendDot color={C.slate} label="Tidak ada data" />
          </>
        );
      case "laporan":
        return (
          <>
            {kategoriLaporanList.map((kat, idx) => (
              <LegendDot key={kat} color={warnaKategoriLaporan(idx)} label={kat} />
            ))}
            <LegendDot color={C.slate} label="Belum ada laporan" />
          </>
        );
      case "umur_non_p3k":
      case "umur_linmas_desa":
        return (
          <>
            {KELOMPOK_UMUR.map((g) => (
              <LegendDot key={g.label} color={g.color} label={g.label} />
            ))}
          </>
        );
      case "jumlah_non_p3k":
      case "jumlah_linmas_desa":
      default:
        return (
          <>
            <LegendDot color={C.amber} label="Kepadatan tinggi" />
            <LegendDot color={C.indigo} label="Sedang" />
            <LegendDot color={C.teal} label="Rendah" />
            <LegendDot color={C.slate} label="Tidak ada data" />
          </>
        );
    }
  };

  // ===== TAMPILAN =====
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress sx={{ color: C.amber }} />
      </Box>
    );
  }

  const agendaAktif = agendaBerlangsung[heroIndex] || null;

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      {/* ====== HERO AGENDA SEDANG BERLANGSUNG (auto-rotate, paling atas) ====== */}
      {agendaAktif && (
        <Card
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "16px",
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            background: "linear-gradient(120deg, #111827 0%, #1E293B 55%, #0F172A 100%)",
            border: "1px solid #1F2937",
            boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
          }}
          elevation={0}
        >
          {/* aksen gradient kanan atas */}
          <Box
            sx={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${C.amber}33 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          <Fade in={heroVisible} timeout={300}>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  flexShrink: 0,
                  bgcolor: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderRadius: "999px",
                  px: 1.4,
                  py: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: C.red,
                    animation: "heroPulse 1.4s ease-in-out infinite",
                    "@keyframes heroPulse": {
                      "0%": { boxShadow: `0 0 0 0 ${C.red}66` },
                      "70%": { boxShadow: `0 0 0 7px ${C.red}00` },
                      "100%": { boxShadow: `0 0 0 0 ${C.red}00` },
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: "#FCA5A5",
                    textTransform: "uppercase",
                  }}
                >
                  Berlangsung
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: "#F8FAFC",
                    fontWeight: 700,
                    fontSize: { xs: 16, sm: 18 },
                    lineHeight: 1.3,
                    mb: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: { xs: "normal", sm: "nowrap" },
                  }}
                >
                  {agendaAktif.judul}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <FiClock size={13} color={C.amber} />
                    <Typography sx={{ fontSize: 12.5, color: "#CBD5E1" }}>
                      {formatJam(agendaAktif.waktu_mulai)}
                      {agendaAktif.waktu_selesai ? ` – ${formatJam(agendaAktif.waktu_selesai)}` : ""}
                    </Typography>
                  </Box>
                  {agendaAktif.lokasi && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <FiMapPin size={13} color={C.teal} />
                      <Typography sx={{ fontSize: 12.5, color: "#CBD5E1" }}>
                        {agendaAktif.lokasi}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {agendaBerlangsung.length > 1 && (
                <Chip
                  icon={<FiRadio size={12} color={C.amber} />}
                  label={`${heroIndex + 1} / ${agendaBerlangsung.length}`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    color: "#E2E8F0",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          </Fade>

          {agendaBerlangsung.length > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", gap: 0.7, mt: 2, position: "relative" }}>
              {agendaBerlangsung.map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === heroIndex ? 18 : 7,
                    height: 7,
                    borderRadius: 4,
                    bgcolor: i === heroIndex ? C.amber : "rgba(255,255,255,0.2)",
                    transition: "all .3s ease",
                  }}
                />
              ))}
            </Box>
          )}
        </Card>
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
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
          Geospasial & Demografi
        </Typography>
        <Typography variant="h4" sx={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
          Peta Sebaran Anggota Linmas
        </Typography>
      </Box>

      {usingFallback && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            bgcolor: "#EFF6FF",
            color: C.text,
            border: "1px solid #BFDBFE",
            "& .MuiAlert-icon": { color: C.indigo },
          }}
        >
          Menampilkan data terbatas — server tidak tersedia atau data kosong.
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2.5 }}>
        {/* ====== DROPDOWN MODE PETA ====== */}
        <Card
          sx={{
            bgcolor: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            p: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
          elevation={0}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FiLayers size={16} color={C.amber} />
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                Tampilkan sebaran:
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <Select
                value={mapMode}
                onChange={(e) => setMapMode(e.target.value)}
                sx={{
                  bgcolor: C.panel2,
                  borderRadius: "10px",
                  fontSize: 13.5,
                  color: C.text,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.borderSoft,
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.amber,
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.amber,
                  },
                }}
              >
                {MAP_MODES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13.5 }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Card>

        {/* ====== PETA (full width) ====== */}
        <Card
          sx={{
            bgcolor: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            p: 2.5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
          elevation={0}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <FiMapPin size={16} color={C.amber} />
            <Typography sx={{ fontWeight: 600, fontSize: 15, color: C.text }}>
              Sebaran per Kecamatan —{" "}
              {MAP_MODES.find((m) => m.value === mapMode)?.label}
            </Typography>
            {selectedKec && (
              <Chip
                label={`Filter: ${selectedKec}`}
                size="small"
                onDelete={() => setSelectedKec(null)}
                sx={{
                  ml: "auto",
                  bgcolor: "#FEF3C7",
                  color: C.amber,
                  border: "1px solid #FDE68A",
                  fontWeight: 500,
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              height: 450,
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            {!mapError && geoData ? (
              <MapContainer
                key={mapMode}
                center={MAP_CENTER}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <GeoJSON
                  data={geoData}
                  style={styleFeature}
                  onEachFeature={onEachFeature}
                />
              </MapContainer>
            ) : (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: C.panel2,
                  color: C.textDim,
                }}
              >
                Gagal memuat peta
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2, fontSize: 12, color: C.textDim }}>
            {renderLegenda()}
          </Box>
        </Card>

        {/* ====== RINGKASAN (full width) ====== */}
        <Card
          sx={{
            bgcolor: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            p: 2.5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
          elevation={0}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <FiUsers size={16} color={C.teal} />
            <Typography sx={{ fontWeight: 600, fontSize: 15, color: C.text }}>
              {selectedKec
                ? `Ringkasan Kec. ${selectedKec}`
                : "Ringkasan Seluruh Wilayah"}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: C.textDim, mb: 2 }}>
            Klik salah satu kecamatan pada peta untuk memfilter statistik.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 1.5,
            }}
          >
            <StatMini label="Total Anggota" value={dataTerfilter.length} color={C.indigo} />
            <StatMini
              label="Aktif — Non P3K Paruh Waktu"
              value={breakdown.byKategori["Non P3K Paruh Waktu"].aktif}
              color={C.amber}
            />
            <StatMini
              label="Aktif — Linmas Desa"
              value={breakdown.byKategori["Linmas Desa"].aktif}
              color={C.rose}
            />
            <StatMini
              label="Non P3K Paruh Waktu"
              value={breakdown.keterangan["Non P3K Paruh Waktu"]}
              color={C.indigo}
            />
            <StatMini
              label="Linmas Desa"
              value={breakdown.linmasDesa}
              color={C.rose}
            />
            <StatMini
              label="Jumlah Laporan"
              value={breakdown.jumlahLaporan}
              color={C.violet}
            />
          </Box>
        </Card>

        {/* ====== GRAFIK JENIS KELAMIN (dipisah per kategori) ====== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <ChartCard title="Jenis Kelamin — Non P3K Paruh Waktu">
            <Doughnut
              data={{
                labels: ["Laki-laki", "Perempuan"],
                datasets: [
                  {
                    data: [
                      breakdown.byKategori["Non P3K Paruh Waktu"].gender.L,
                      breakdown.byKategori["Non P3K Paruh Waktu"].gender.P,
                    ],
                    backgroundColor: [C.indigo, C.teal],
                    borderWidth: 0,
                  },
                ],
              }}
              options={chartOptions()}
            />
          </ChartCard>

          <ChartCard title="Jenis Kelamin — Linmas Desa">
            <Doughnut
              data={{
                labels: ["Laki-laki", "Perempuan"],
                datasets: [
                  {
                    data: [
                      breakdown.byKategori["Linmas Desa"].gender.L,
                      breakdown.byKategori["Linmas Desa"].gender.P,
                    ],
                    backgroundColor: [C.indigo, C.teal],
                    borderWidth: 0,
                  },
                ],
              }}
              options={chartOptions()}
            />
          </ChartCard>
        </Box>

        {/* ====== GRAFIK KELOMPOK UMUR (dipisah per kategori) ====== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <ChartCard title="Kelompok Umur — Non P3K Paruh Waktu" height={220}>
            <Bar
              data={{
                labels: KELOMPOK_UMUR.map((g) => g.label),
                datasets: [
                  {
                    label: "Jumlah Anggota",
                    data: breakdown.byKategori["Non P3K Paruh Waktu"].umurGroup,
                    backgroundColor: C.amber,
                    borderRadius: 6,
                    maxBarThickness: 46,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: C.textDim, font: { size: 12 } },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: "#E2E8F0" },
                    ticks: { color: C.textDim, font: { size: 12 }, precision: 0 },
                  },
                },
              }}
            />
          </ChartCard>

          <ChartCard title="Kelompok Umur — Linmas Desa" height={220}>
            <Bar
              data={{
                labels: KELOMPOK_UMUR.map((g) => g.label),
                datasets: [
                  {
                    label: "Jumlah Anggota",
                    data: breakdown.byKategori["Linmas Desa"].umurGroup,
                    backgroundColor: C.rose,
                    borderRadius: 6,
                    maxBarThickness: 46,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: C.textDim, font: { size: 12 } },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: "#E2E8F0" },
                    ticks: { color: C.textDim, font: { size: 12 }, precision: 0 },
                  },
                },
              }}
            />
          </ChartCard>
        </Box>

        {/* ====== GRAFIK SEBARAN LAPORAN (full width, gabungan — tidak dipisah kategori) ====== */}
        <Card
          sx={{
            bgcolor: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            p: 2.5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
          elevation={0}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <FiFileText size={16} color={C.violet} />
            <Typography sx={{ fontWeight: 600, fontSize: 15, color: C.text }}>
              Sebaran Hasil Laporan
              {selectedKec ? ` — Kec. ${selectedKec}` : ""}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
              gap: 2.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12.5, color: C.textDim, mb: 1 }}>
                Jumlah laporan per kecamatan
              </Typography>
              <Box sx={{ height: 320 }}>
                <Bar
                  data={{
                    labels: grafikLaporanPerKecamatan.labels,
                    datasets: grafikLaporanPerKecamatan.datasets,
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "bottom",
                        labels: {
                          color: C.textDim,
                          boxWidth: 10,
                          padding: 10,
                          font: { size: 10 },
                        },
                      },
                    },
                    scales: {
                      x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { color: C.textDim, font: { size: 10 } },
                      },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: "#E2E8F0" },
                        ticks: { color: C.textDim, font: { size: 12 }, precision: 0 },
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12.5, color: C.textDim, mb: 1 }}>
                Berdasarkan kategori kegiatan
              </Typography>
              <Box sx={{ height: 320 }}>
                <Doughnut
                  data={{
                    labels: kategoriLaporanList,
                    datasets: [
                      {
                        data: kategoriLaporanList.map(
                          (k) => laporanKategoriBreakdown[k] || 0
                        ),
                        backgroundColor: kategoriLaporanList.map((_, idx) =>
                          warnaKategoriLaporan(idx)
                        ),
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={chartOptions()}
                />
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

// ===== Komponen pembantu =====
function ChartCard({ title, children, height = 220 }) {
  return (
    <Card
      sx={{
        bgcolor: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: "14px",
        p: 2.5,
        height: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
      elevation={0}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: C.text, mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ height }}>{children}</Box>
    </Card>
  );
}

function StatMini({ label, value, color }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "10px",
        bgcolor: C.panel2,
        border: `1px solid ${C.borderSoft}`,
      }}
    >
      <Typography sx={{ fontSize: 11.5, color: C.textDim, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color }}>
        {value}
      </Typography>
    </Box>
  );
}

function LegendDot({ color, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
      <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} />
      <Typography sx={{ fontSize: 12, color: C.textDim }}>{label}</Typography>
    </Box>
  );
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: C.textDim,
          boxWidth: 10,
          padding: 14,
          font: { size: 10 },
        },
      },
    },
    cutout: "62%",
  };
}