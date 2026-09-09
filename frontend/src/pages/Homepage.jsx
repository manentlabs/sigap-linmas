import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  CircularProgress,
  AppBar,
  Toolbar,
  Pagination,
  IconButton,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import YouTubeIcon from "@mui/icons-material/YouTube";
import LanguageIcon from "@mui/icons-material/Language";

// Hapus baris ini kalau bootstrap.min.css sudah di-import secara global di main.jsx
import "bootstrap/dist/css/bootstrap.min.css";

import api from "../services/api";
// Section "Layanan Linmas" — 4 kartu layanan publik (laporan bencana,
// pengaduan tantribumlinmas, posyandu, pengaduan sampah) + modal formnya.
import LayananSection from "../components/LayananSection";
// Section "Kontak Darurat" — daftar nomor telepon penting, tap-to-call.
import KontakDaruratSection from "../components/KontakDaruratSection";
// Section "Kepuasan Masyarakat" — form rating bintang untuk warga.
import KepuasanSection from "../components/KepuasanSection";

// Palet disamakan dengan Sidebar.jsx / BeritaPage.jsx supaya konsisten
const C = {
  bg: "#F7F9FC",
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  amberBg: "rgba(242,169,59,0.14)",
  teal: "#0EA5A5",
  tealBg: "rgba(14,165,165,0.10)",
  // Hijau khas seragam Linmas, dipakai untuk hero & tombol utama
  greenDark: "#0B3D1E",
  greenMain: "#1B5E20",
  greenLight: "#2E7D32",
};

// Otomatis memuat SEMUA file gambar (jpg/jpeg/png/webp) di folder src/assets/hero/
// Tidak perlu menulis nama file satu-satu — tinggal taruh file baru di folder itu.
const heroModules = import.meta.glob("../assets/hero/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", {
  eager: true,
  import: "default",
});
const HERO_IMAGES = Object.values(heroModules);

const FILE_BASE_URL =
  import.meta.env.VITE_FILE_URL || (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

export default function HomePage() {
  const navigate = useNavigate();

  const [beritaList, setBeritaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (HERO_IMAGES.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBeritaTerbaru = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/berita", {
        params: {
          page,
          limit: 6,
          status: "published",
        },
      });

      setBeritaList(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setBeritaList([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBeritaTerbaru();
  }, [fetchBeritaTerbaru]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: C.bg, overflowX: "hidden" }}>
      {/* CSS untuk navbar kaca, hero slideshow + efek kaca */}
      <style>{`
        .navbar-glass {
          background: rgba(255, 255, 255, 0.55) !important;
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 24px rgba(11, 61, 30, 0.08);
        }

        .hero-section {
          position: relative;
          overflow: hidden;
          min-height: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 96px 16px 64px;
        }

        @media (max-width: 600px) {
          .hero-section {
            min-height: 420px;
            padding: 88px 12px 48px;
          }
        }

        .hero-slider {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.4s ease-in-out;
          animation: heroPan 16s ease-in-out infinite alternate;
        }

        .hero-slide.active {
          opacity: 1;
        }

        /* Efek pan perlahan bergeser ke kanan sambil zoom halus (Ken Burns) */
        @keyframes heroPan {
          0%   { transform: scale(1.06) translateX(0%); }
          100% { transform: scale(1.16) translateX(4%); }
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(11,61,30,0.62) 0%, rgba(27,94,32,0.58) 100%);
          z-index: 1;
        }

        .hero-glass {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 12px 40px rgba(8, 20, 45, 0.25);
        }

        @media (max-width: 600px) {
          .hero-glass {
            padding: 28px 20px;
            border-radius: 18px;
          }
        }

        .berita-card-bs {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          border-radius: 1rem !important;
          overflow: hidden;
        }
        .berita-card-bs:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(19,28,43,0.10);
        }
      `}</style>

      {/* Navbar dengan efek kaca (glassmorphism) */}
      <AppBar
        position="sticky"
        elevation={0}
        className="navbar-glass"
        sx={{ color: C.text, borderBottom: "none" }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 2, sm: 3 },
            gap: 1,
          }}
        >
          <img
            src="/linmas.png"
            alt="Linmas"
            style={{
              width: 40,
              height: 40,
              marginRight: 8,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: 15, sm: 18 },
              flexGrow: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Sigap Linmas
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => navigate("/login")}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: "rgba(27,94,32,0.35)",
              color: C.greenMain,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.4)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "&:hover": { borderColor: C.greenMain, bgcolor: "rgba(27,94,32,0.10)" },
            }}
          >
            Login Anggota
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero section: slideshow gambar kegiatan + efek kaca */}
      <Box className="hero-section" sx={{ color: "#fff" }}>
        <div className="hero-slider">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`hero-slide${i === heroIndex ? " active" : ""}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
        <div className="hero-overlay" />

        <Container maxWidth="md">
          <div className="hero-glass">
            <Typography
              variant="h3"
              fontWeight={700}
              gutterBottom
              sx={{ fontSize: { xs: 28, sm: 36, md: 44 } }}
            >
              Sigap Linmas
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 1, opacity: 0.95, fontWeight: 600, fontSize: { xs: 14, sm: 16 } }}
            >
              Sinergi Gerak Aktif Perlindungan Masyarakat
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.85, fontSize: { xs: 13, sm: 14 } }}
            >
              Sistem Informasi Pelayanan Anggota Perlindungan Masyarakat
              Kabupaten Bandung
            </Typography>
          </div>
        </Container>
      </Box>

      {/* Section Layanan Linmas — 4 kartu: Laporan Bencana, Pengaduan
          Tantribumlinmas, Posyandu, Pengaduan Sampah. Klik kartu membuka
          modal form yang mengirim laporan ke POST /api/layanan-publik
          tanpa perlu login (lihat components/LayananSection.jsx). */}
      <LayananSection />

      {/* Section Kontak Darurat — daftar nomor telepon penting (Damkar,
          Ambulans, Polisi, Komando Linmas, BPBD) dengan tombol tap-to-call.
          Data diambil dari GET /api/kontak-darurat (publik, tanpa login). */}
      <KontakDaruratSection />

      {/* Section berita — pakai Container + Grid dari MUI supaya lebar
          kontennya konsisten dengan section lain (sebelumnya memakai
          class "container" Bootstrap yang breakpoint-nya berbeda dari
          MUI Container, sehingga lebar konten "melompat" antar section). */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: C.amber,
              fontWeight: 700,
              textTransform: "uppercase",
              mb: 0.5,
            }}
          >
            Publikasi
          </Typography>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: C.text }}>
            Berita &amp; Kegiatan Terbaru
          </Typography>
          <Typography sx={{ fontSize: 14, color: C.textDim, mt: 1 }}>
            Informasi dan dokumentasi kegiatan anggota Perlindungan Masyarakat
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} sx={{ color: C.amber }} />
          </Box>
        ) : beritaList.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              borderRadius: 3,
              color: C.textFaint,
              fontSize: 14,
              bgcolor: C.panel,
              border: `1px solid ${C.border}`,
            }}
          >
            Belum ada berita yang dipublikasikan.
          </Box>
        ) : (
          <Grid container spacing={3}>
            {beritaList.map((b) => (
              <Grid item xs={12} sm={6} md={4} key={b.id}>
                <BeritaCard berita={b} />
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ mt: 5, display: "flex", justifyContent: "center" }}>
          <Pagination
            page={page}
            count={totalPages}
            color="primary"
            shape="rounded"
            onChange={(e, value) => {
              setPage(value);
              window.scrollTo({ top: 600, behavior: "smooth" });
            }}
          />
        </Box>
      </Container>

      {/* Section Kepuasan Masyarakat — form rating bintang, submit ke
          POST /api/kepuasan (publik, tanpa login). */}
      <KepuasanSection />

      {/* Footer */}
      <Box
        sx={{
          borderTop: `1px solid ${C.border}`,
          bgcolor: "#fff",
          py: 5,
          px: 3,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 5,
            }}
          >
            {/* Kiri */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: C.greenMain,
                  fontSize: 18,
                  mb: 2,
                }}
              >
                Pemerintah Daerah Kabupaten Bandung
              </Typography>

              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.5 }}>
                <LocationOnIcon sx={{ color: C.greenMain, mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Jl. Raya Soreang KM.17, Pamekaran, Kecamatan Soreang,
                  Kabupaten Bandung, Jawa Barat 40912
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                <PhoneIcon sx={{ color: C.greenMain, mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  (022) 5892124
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center" }}>
                <EmailIcon sx={{ color: C.greenMain, mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  linmas@bandungkab.go.id
                </Typography>
              </Box>
            </Box>

            {/* Kanan */}
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: C.greenMain,
                  fontSize: 18,
                  mb: 2,
                }}
              >
                Ikuti Kami
              </Typography>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <IconButton
                  component="a"
                  href="https://facebook.com"
                  target="_blank"
                  sx={{ bgcolor: "#f5f5f5" }}
                >
                  <FacebookIcon />
                </IconButton>

                <IconButton
                  component="a"
                  href="https://instagram.com"
                  target="_blank"
                  sx={{ bgcolor: "#f5f5f5" }}
                >
                  <InstagramIcon />
                </IconButton>

                <IconButton
                  component="a"
                  href="https://x.com"
                  target="_blank"
                  sx={{ bgcolor: "#f5f5f5" }}
                >
                  <XIcon />
                </IconButton>

                <IconButton
                  component="a"
                  href="https://youtube.com"
                  target="_blank"
                  sx={{ bgcolor: "#f5f5f5" }}
                >
                  <YouTubeIcon />
                </IconButton>

                <IconButton
                  component="a"
                  href="https://bandungkab.go.id"
                  target="_blank"
                  sx={{ bgcolor: "#f5f5f5" }}
                >
                  <LanguageIcon />
                </IconButton>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2 }}
              >
                Ikuti media sosial resmi SIGAP LINMAS untuk mendapatkan informasi
                kegiatan, pengumuman, dan berita terbaru.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              borderTop: `1px solid ${C.border}`,
              mt: 4,
              pt: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 12, color: C.textFaint }}>
              © {new Date().getFullYear()} SIGAP LINMAS. Seluruh hak dilindungi.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

function BeritaCard({ berita }) {
  return (
    <Card elevation={0} className="berita-card-bs border" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {berita.gambar_url ? (
        <CardMedia
          component="img"
          image={`${FILE_BASE_URL}${berita.gambar_url}`}
          alt={berita.judul}
          sx={{ height: 170, objectFit: "cover" }}
        />
      ) : (
        <Box
          sx={{
            height: 170,
            bgcolor: C.amberBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ImageOutlinedIcon sx={{ fontSize: 36, color: C.amber }} />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {berita.kategori_nama && (
            <Chip
              label={berita.kategori_nama}
              size="small"
              sx={{
                bgcolor: C.tealBg,
                color: C.teal,
                fontWeight: 600,
                fontSize: 11,
                height: 22,
              }}
            />
          )}
          <Typography sx={{ fontSize: 11.5, color: C.textFaint, fontFamily: "monospace" }}>
            {formatTanggal(berita.tanggal_publish)}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 15.5,
            color: C.text,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {berita.judul}
        </Typography>

        <Typography
          sx={{
            fontSize: 13,
            color: C.textDim,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flexGrow: 1,
          }}
        >
          {berita.ringkasan}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: C.amber,
            fontSize: 12.5,
            fontWeight: 600,
            mt: 0.5,
          }}
        >
          Baca selengkapnya <ArrowForwardIcon sx={{ fontSize: 14 }} />
        </Box>
      </CardContent>
    </Card>
  );
}

function formatTanggal(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}