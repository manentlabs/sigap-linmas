// frontend/src/components/KepuasanSection.jsx
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import Swal from "sweetalert2";
import {
  Box,
  Container,
  Typography,
  Card,
  Rating,
  TextField,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";

import api from "../services/api";

const C = {
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  amber: "#F2A93B",
  greenMain: "#1B5E20",
};

// Pilihan jenis layanan — samakan dengan `jenis` di layananConfig.js,
// ditambah opsi umum di luar 4 layanan pengaduan tersebut.
const JENIS_LAYANAN_OPTIONS = [
  "Pelayanan Umum",
  "Laporan Bencana",
  "Pengaduan Tantribumlinmas",
  "Posyandu",
  "Pengaduan Sampah",
];

export default function KepuasanSection() {
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      rating_keseluruhan: 0,
      kecepatan_pelayanan: 0,
      keramahan_petugas: 0,
      kejelasan_informasi: 0,
      jenis_layanan: "Pelayanan Umum",
      nama_responden: "",
      no_hp: "",
      saran: "",
    },
  });

  const onSubmit = async (values) => {
    if (!values.rating_keseluruhan || values.rating_keseluruhan < 1) {
      Swal.fire({
        icon: "warning",
        title: "Rating belum diisi",
        text: "Mohon beri penilaian keseluruhan minimal 1 bintang.",
        confirmButtonColor: C.greenMain,
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        kecepatan_pelayanan: values.kecepatan_pelayanan || undefined,
        keramahan_petugas: values.keramahan_petugas || undefined,
        kejelasan_informasi: values.kejelasan_informasi || undefined,
        nama_responden: values.nama_responden || undefined,
        no_hp: values.no_hp || undefined,
        saran: values.saran || undefined,
      };

      const { data } = await api.post("/kepuasan", payload);

      Swal.fire({
        icon: "success",
        title: "Terima kasih!",
        html: `Penilaian Anda sangat berarti bagi kami.<br/>Kode survei: <b>${data.data.kode_survei}</b>`,
        confirmButtonColor: C.greenMain,
      });

      reset();
    } catch (err) {
      const message =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "Tidak dapat mengirim penilaian. Periksa koneksi Anda dan coba lagi.";
      Swal.fire({ icon: "error", title: "Gagal mengirim", text: message, confirmButtonColor: C.greenMain });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "#F7F9FC", py: { xs: 6, md: 7 } }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.5 }}>
            Suara Anda
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: C.text }}>
            Kepuasan Masyarakat
          </Typography>
          <Typography sx={{ fontSize: 14, color: C.textDim, mt: 1 }}>
            Bantu kami meningkatkan pelayanan dengan memberi penilaian singkat.
          </Typography>
        </Box>

        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: "16px", p: { xs: 2.5, sm: 4 } }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Rating keseluruhan — besar, jadi fokus utama form */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography sx={{ fontSize: 13.5, color: C.textDim, mb: 1 }}>
                Bagaimana penilaian Anda secara keseluruhan?
              </Typography>
              <Controller
                name="rating_keseluruhan"
                control={control}
                render={({ field }) => (
                  <Rating
                    {...field}
                    size="large"
                    icon={<StarIcon fontSize="inherit" sx={{ color: C.amber }} />}
                    emptyIcon={<StarIcon fontSize="inherit" sx={{ color: C.border }} />}
                    onChange={(e, val) => field.onChange(val)}
                    sx={{ fontSize: 42 }}
                  />
                )}
              />
            </Box>

            {/* 3 unsur penilaian tambahan — opsional, ukuran lebih kecil */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <UnsurRating name="kecepatan_pelayanan" label="Kecepatan Pelayanan" control={control} />
              <UnsurRating name="keramahan_petugas" label="Keramahan Petugas" control={control} />
              <UnsurRating name="kejelasan_informasi" label="Kejelasan Informasi" control={control} />
            </Grid>

            <TextField
              select
              fullWidth
              label="Layanan yang Dinilai"
              margin="normal"
              defaultValue="Pelayanan Umum"
              {...register("jenis_layanan")}
            >
              {JENIS_LAYANAN_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nama (opsional)"
                  margin="normal"
                  placeholder="Kosongkan bila ingin anonim"
                  {...register("nama_responden")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="No. HP (opsional)"
                  margin="normal"
                  {...register("no_hp")}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Saran / Masukan (opsional)"
              margin="normal"
              multiline
              minRows={2}
              {...register("saran")}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting}
              sx={{
                mt: 2,
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: C.greenMain,
                "&:hover": { bgcolor: "#154D19" },
              }}
            >
              {submitting ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Kirim Penilaian"}
            </Button>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}

function UnsurRating({ name, label, control }) {
  return (
    <Grid item xs={12} sm={4}>
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ fontSize: 11.5, color: C.textDim, mb: 0.5 }}>{label}</Typography>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Rating
              {...field}
              size="small"
              icon={<StarIcon fontSize="inherit" sx={{ color: C.amber }} />}
              emptyIcon={<StarIcon fontSize="inherit" sx={{ color: C.border }} />}
              onChange={(e, val) => field.onChange(val)}
            />
          )}
        />
      </Box>
    </Grid>
  );
}