// frontend/src/components/LayananSection.jsx
import React, { useState } from "react";
import { Box, Container, Typography, Card, CardActionArea } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import LAYANAN_LIST from "../data/layananConfig";
import LayananModal from "./LayananModal";

const C = {
  panel: "#FFFFFF",
  border: "#E4E9F2",
  text: "#131C2B",
  textDim: "#64748B",
  amber: "#F2A93B",
};

export default function LayananSection() {
  const [selected, setSelected] = useState(null); // item dari LAYANAN_LIST yang sedang dibuka

  return (
    <Box sx={{ bgcolor: C.panel, py: { xs: 6, md: 7 } }}>
      <Container maxWidth="lg">
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
            Layanan Publik
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: C.text }}>
            Layanan Linmas
          </Typography>
          <Typography sx={{ fontSize: 14, color: C.textDim, mt: 1 }}>
            Sampaikan laporan atau pengaduan Anda langsung kepada Satgas Linmas — cepat dan tanpa perlu masuk akun.
          </Typography>
        </Box>

        <div className="row g-4">
          {LAYANAN_LIST.map((item) => (
            <div className="col-12 col-sm-6 col-md-3" key={item.key}>
              <LayananCard item={item} onClick={() => setSelected(item)} />
            </div>
          ))}
        </div>
      </Container>

      <LayananModal open={!!selected} item={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}

function LayananCard({ item, onClick }) {
  const Icon = item.icon;
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        height: "100%",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: "0 10px 24px rgba(19,28,43,0.10)" },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: "100%", p: 3, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "14px",
            bgcolor: item.bg,
            color: item.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Icon />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15.5, color: C.text, mb: 0.8 }}>
          {item.title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: C.textDim, lineHeight: 1.55, mb: 2, flexGrow: 1 }}>
          {item.desc}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: item.color, fontSize: 12.5, fontWeight: 600 }}>
          Ajukan Laporan <ArrowForwardIcon sx={{ fontSize: 14 }} />
        </Box>
      </CardActionArea>
    </Card>
  );
}