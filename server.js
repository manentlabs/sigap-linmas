require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// === SEMUA IMPORT DARI FOLDER BACKEND ===
const sequelize = require("./backend/config/database");
const authRoutes = require("./backend/routes/authRoutes");
const agendaRoutes = require("./backend/routes/agendaRoutes");
const beritaRoutes = require("./backend/routes/beritaRoutes");
const kategoriBeritaRoutes = require("./backend/routes/kategoriBeritaRoutes");
const anggotaRoutes = require("./backend/routes/anggotaRoutes");
const kecamatanRoutes = require("./backend/routes/kecamatanRoutes");
const absensiRoutes = require("./backend/routes/absensiRoutes");
const laporanRoutes = require("./backend/routes/laporanRoutes");
const sebaranRoutes = require("./backend/routes/sebaranRoutes");
const aduanRoutes = require("./backend/routes/aduanRoutes");
const titikpklRoutes = require("./backend/routes/titikpklRoutes");
const monevRoutes = require("./backend/routes/monevRoutes");
const userRoutes = require("./backend/routes/userRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Sajikan file upload dari folder backend/public/uploads
app.use("/uploads", express.static(path.join(__dirname, "backend", "public", "uploads")));

// 2. Sajikan file statis frontend dari hasil build (frontend/dist)
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// 3. Daftarkan semua route API
app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/berita", beritaRoutes);
app.use("/api/kategori-berita", kategoriBeritaRoutes);
app.use("/api/anggota", anggotaRoutes);
app.use("/api/kecamatan", kecamatanRoutes);
app.use("/api/absensi", absensiRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/sebaran", sebaranRoutes);
app.use("/api/aduan", aduanRoutes);
app.use("/api/titikpkl", titikpklRoutes);
app.use("/api/monev", monevRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "SIGAP Linmas API aktif." });
});

// 4. Catch-all: arahkan ke index.html di folder dist
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✔ Koneksi database berhasil.");
    app.listen(PORT, () => {
      console.log(`✔ Server berjalan di http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("✘ Gagal konek ke database:", err.message);
    process.exit(1);
  }
}

start();