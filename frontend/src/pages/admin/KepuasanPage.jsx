// frontend/src/pages/admin/KepuasanPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Grid,
  Card,
  Typography,
  Rating,
  IconButton,
  CircularProgress,
  Alert,
  Pagination,
  Chip,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { FiTrash2, FiUsers, FiStar } from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import api from "../../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Warna tema light (sama persis dengan AduanPage)
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

export default function KepuasanPage() {
  const [ringkasan, setRingkasan] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [ringkasanRes, listRes] = await Promise.all([
        api.get("/kepuasan/stats/ringkasan"),
        api.get("/kepuasan", { params: { page, limit: 10 } }),
      ]);
      setRingkasan(ringkasanRes.data.data);
      setData(listRes.data.data || []);
      setTotalPages((listRes.data.pagination && listRes.data.pagination.totalPages) || 1);
    } catch (err) {
      setErrorMsg("Gagal memuat data. Pastikan Anda sudah login sebagai admin/kepala satgas.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus entri survei ini?",
      text: `Entri ${item.kode_survei} akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: C.red,
      background: C.panel,
      color: C.text,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/kepuasan/${item.id}`);
      setData((prev) => prev.filter((d) => d.id !== item.id));
      Swal.fire({ icon: "success", title: "Terhapus", timer: 1200, showConfirmButton: false, background: C.panel, color: C.text });
      loadAll(); // refresh ringkasan
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal menghapus", background: C.panel, color: C.text, confirmButtonColor: C.amber });
    }
  }

  const distribusi = (ringkasan && ringkasan.distribusi_rating) || [];
  const chartData = {
    labels: [1, 2, 3, 4, 5].map((r) => `${r} ★`),
    datasets: [
      {
        label: "Jumlah Responden",
        data: [1, 2, 3, 4, 5].map((r) => {
          const found = distribusi.find((d) => Number(d.rating) === r);
          return found ? found.jumlah : 0;
        }),
        backgroundColor: C.amber,
        borderRadius: 6,
        maxBarThickness: 46,
      },
    ],
  };

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      {/* Header – gaya sama seperti AduanPage */}
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
          Layanan Publik
        </Typography>
        <Typography variant="h4" sx={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
          Kepuasan Masyarakat
        </Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {errorMsg}
        </Alert>
      )}

      {loading && !ringkasan ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: C.amber }} />
        </Box>
      ) : (
        ringkasan && (
          <>
            {/* Kartu ringkasan – gunakan StatCard dengan warna light */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <StatCard icon={FiUsers} label="Total Responden" value={ringkasan.total_responden} tone={C.indigo} />
              <StatCard icon={FiStar} label="Rata-rata Keseluruhan" value={fmt(ringkasan.rata_rating_keseluruhan)} tone={C.amber} suffix="/5" />
              <StatCard icon={FiStar} label="Rata-rata Kecepatan" value={fmt(ringkasan.rata_kecepatan_pelayanan)} tone={C.teal} suffix="/5" />
              <StatCard icon={FiStar} label="Rata-rata Keramahan" value={fmt(ringkasan.rata_keramahan_petugas)} tone={C.teal} suffix="/5" />
            </Grid>

            {/* Grafik distribusi rating */}
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
              <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: C.text, mb: 2 }}>
                Distribusi Rating Keseluruhan
              </Typography>
              <Box sx={{ height: 220 }}>
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: C.textDim, font: { size: 12 } } },
                      y: { beginAtZero: true, grid: { color: C.borderSoft }, ticks: { color: C.textDim, font: { size: 12 }, precision: 0 } },
                    },
                  }}
                />
              </Box>
            </Card>
          </>
        )
      )}

      {/* Daftar entri survei */}
      <Typography sx={{ fontWeight: 600, fontSize: 14.5, color: C.text, mb: 1.5 }}>
        Entri Survei Terbaru
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: C.amber }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {data.map((item) => (
            <Card
              key={item.id}
              sx={{
                bgcolor: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: "14px",
                p: 2,
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              elevation={0}
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4, flexWrap: "wrap" }}>
                  <Typography sx={{ fontFamily: "monospace", fontSize: 11, color: C.textFaint }}>
                    {item.kode_survei}
                  </Typography>
                  {item.jenis_layanan && (
                    <Chip
                      label={item.jenis_layanan}
                      size="small"
                      sx={{
                        bgcolor: C.panel2,
                        color: C.indigo,
                        border: `1px solid ${C.border}`,
                        fontSize: 10.5,
                        height: 20,
                      }}
                    />
                  )}
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: 14, color: C.text }}>
                  {item.nama_responden || "Anonim"}
                </Typography>
                {item.saran && (
                  <Typography sx={{ fontSize: 12.5, color: C.textDim, mt: 0.4, maxWidth: 480 }}>
                    "{item.saran}"
                  </Typography>
                )}
              </Box>

              <Rating
                value={item.rating_keseluruhan}
                readOnly
                size="small"
                icon={<StarIcon fontSize="inherit" sx={{ color: C.amber }} />}
                emptyIcon={<StarIcon fontSize="inherit" sx={{ color: C.border }} />}
              />

              <IconButton
                size="small"
                onClick={() => handleDelete(item)}
                sx={{ color: C.red, border: `1px solid ${C.border}`, borderRadius: "8px" }}
              >
                <FiTrash2 size={14} />
              </IconButton>
            </Card>
          ))}
          {data.length === 0 && (
            <Box sx={{ py: 6, textAlign: "center", color: C.textFaint, fontSize: 13.5 }}>
              Belum ada entri survei kepuasan masyarakat.
            </Box>
          )}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            page={page}
            count={totalPages}
            onChange={(e, val) => setPage(val)}
            sx={{
              "& .MuiPaginationItem-root": { color: C.textDim },
              "& .Mui-selected": {
                bgcolor: `${C.amber}33 !important`,
                color: C.amber,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// Komponen kartu statistik – disesuaikan dengan gaya light
function StatCard({ icon: Icon, label, value, tone, suffix }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card
        sx={{
          bgcolor: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: "14px",
          p: 2.2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
        elevation={0}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography sx={{ fontSize: 12.5, color: C.textDim }}>{label}</Typography>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "8px",
              bgcolor: `${tone}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} color={tone} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 26, fontWeight: 700, color: C.text }}>
          {value}
          {suffix && (
            <Typography component="span" sx={{ fontSize: 14, color: C.textFaint }}>
              {suffix}
            </Typography>
          )}
        </Typography>
      </Card>
    </Grid>
  );
}

function fmt(val) {
  if (val === null || val === undefined) return "-";
  return val;
}