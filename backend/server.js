require("dotenv").config();
const express = require("express");
const cors = require("cors");

const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const agendaRoutes = require("./routes/agendaRoutes");
const beritaRoutes = require("./routes/beritaRoutes");
const kategoriBeritaRoutes = require("./routes/kategoriBeritaRoutes");
const anggotaRoutes = require("./routes/anggotaRoutes");
const kecamatanRoutes = require("./routes/kecamatanRoutes");
const absensiRoutes = require("./routes/absensiRoutes");
const laporanRoutes = require("./routes/laporanRoutes");
const sebaranRoutes = require("./routes/sebaranRoutes");
const aduanRoutes = require("./routes/aduanRoutes");
const titikpklRoutes = require("./routes/titikpklRoutes");
const monevRoutes = require("./routes/monevRoutes");
const userRoutes = require("./routes/userRoutes");
const path = require("path");
const app = express();

app.use(cors({
  origin: "http://localhost:5173", // sesuaikan dengan origin frontend Anda
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "public", "uploads"))
);
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

// Contoh health check sederhana
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "SIGAP Linmas API aktif." });
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
