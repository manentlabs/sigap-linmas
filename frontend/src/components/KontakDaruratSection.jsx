// frontend/src/components/KontakDaruratSection.jsx
import React, { useEffect, useState } from "react";
import { Box, Container, Typography, Card, Chip, CircularProgress } from "@mui/material";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import LocalPoliceOutlinedIcon from "@mui/icons-material/LocalPoliceOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";

import api from "../services/api";

const C = {
  bg: "#F7F9FC",
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  textFaint: "#94A3B8",
  amber: "#F2A93B",
  greenMain: "#1B5E20",
};

// Ikon & warna per kategori — samakan dengan ENUM kolom `kategori`
// pada tabel kontak_darurat di database.
const KATEGORI_META = {
  "Pemadam Kebakaran": { icon: LocalFireDepartmentOutlinedIcon, color: "#EF5B5B", bg: "rgba(239,91,91,0.10)" },
  "Ambulans/Kesehatan": { icon: LocalHospitalOutlinedIcon, color: "#0EA5A5", bg: "rgba(14,165,165,0.10)" },
  Kepolisian: { icon: LocalPoliceOutlinedIcon, color: "#1B5E20", bg: "rgba(27,94,32,0.10)" },
  "Komando Linmas": { icon: ShieldOutlinedIcon, color: "#F2A93B", bg: "rgba(242,169,59,0.12)" },
  BPBD: { icon: WarningAmberOutlinedIcon, color: "#F2A93B", bg: "rgba(242,169,59,0.12)" },
  Lainnya: { icon: PhoneOutlinedIcon, color: "#64748B", bg: "rgba(100,116,139,0.10)" },
};

// Data contoh — dipakai selagi endpoint GET /api/kontak-darurat belum
// tersedia atau server belum aktif.
const KONTAK_FALLBACK = [
  { id: 1, kategori: "Komando Linmas", nama_kontak: "Komando Linmas Kabupaten", nomor_telepon: "(022) 5892124", keterangan: "Siaga 24 jam" },
  { id: 2, kategori: "Pemadam Kebakaran", nama_kontak: "Damkar Kabupaten Bandung", nomor_telepon: "113", keterangan: "Siaga 24 jam" },
  { id: 3, kategori: "Ambulans/Kesehatan", nama_kontak: "Ambulans Gawat Darurat (PSC 119)", nomor_telepon: "119", keterangan: "Siaga 24 jam" },
  { id: 4, kategori: "Kepolisian", nama_kontak: "Polres Bandung", nomor_telepon: "110", keterangan: "Siaga 24 jam" },
  { id: 5, kategori: "BPBD", nama_kontak: "BPBD Kabupaten Bandung", nomor_telepon: "(022) 5940255", keterangan: "Jam kerja 08.00–16.00" },
];

export default function KontakDaruratSection() {
  const [kontak, setKontak] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadKontak() {
      try {
        const { data } = await api.get("/kontak-darurat");
        const list = data && data.data ? data.data : data;
        if (mounted && Array.isArray(list) && list.length > 0) {
          setKontak(list);
        } else if (mounted) {
          setKontak(KONTAK_FALLBACK);
        }
      } catch (err) {
        if (mounted) setKontak(KONTAK_FALLBACK);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadKontak();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box sx={{ bgcolor: C.bg, py: { xs: 6, md: 7 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, color: C.amber, fontWeight: 700, textTransform: "uppercase", mb: 0.5 }}>
            Darurat
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: C.text }}>
            Kontak Darurat
          </Typography>
          <Typography sx={{ fontSize: 14, color: C.textDim, mt: 1 }}>
            Simpan dan hubungi nomor-nomor ini bila terjadi keadaan darurat di sekitar Anda.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={26} sx={{ color: C.amber }} />
          </Box>
        ) : (
          <div className="row g-3">
            {kontak.map((k) => (
              <div className="col-12 col-sm-6 col-lg-4" key={k.id}>
                <KontakCard kontak={k} />
              </div>
            ))}
          </div>
        )}
      </Container>
    </Box>
  );
}

function KontakCard({ kontak }) {
  const meta = KATEGORI_META[kontak.kategori] || KATEGORI_META.Lainnya;
  const Icon = meta.icon;
  const teleponHref = `tel:${kontak.nomor_telepon.replace(/[^\d+]/g, "")}`;

  return (
    <Card
      elevation={0}
      component="a"
      href={teleponHref}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2.2,
        textDecoration: "none",
        border: `1px solid ${C.border}`,
        borderRadius: "14px",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 24px rgba(19,28,43,0.10)" },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: "12px",
          bgcolor: meta.bg,
          color: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        {kontak.keterangan && (
          <Chip
            label={kontak.keterangan}
            size="small"
            sx={{ bgcolor: "rgba(27,94,32,0.08)", color: C.greenMain, fontSize: 10.5, height: 19, mb: 0.5 }}
          />
        )}
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {kontak.nama_kontak}
        </Typography>
        <Typography sx={{ fontSize: 15, color: meta.color, fontWeight: 700, mt: 0.3 }}>
          {kontak.nomor_telepon}
        </Typography>
      </Box>

      <CallOutlinedIcon sx={{ color: C.textFaint, fontSize: 20, flexShrink: 0 }} />
    </Card>
  );
}