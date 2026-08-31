const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/laporan";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Format file tidak diizinkan"), false);
};

const uploadLaporan = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Field "foto" dipakai khusus untuk laporan Non P3K Paruh Waktu
// (bisa lebih dari 1 file sekaligus, semua masuk tabel laporan_foto).
// Laporan Bulanan Kecamatan tidak punya field foto sama sekali, jadi
// middleware ini TIDAK dipasang di route laporan bulanan.
const uploadFotoLaporan = uploadLaporan.array("foto", 10);

const hapusFileFoto = (filePath) => {
  if (!filePath) return;
  // foto_url disimpan sebagai "/uploads/laporan/xxx.jpg"
  // file fisik ada di "public/uploads/laporan/xxx.jpg" (bukan langsung di root)
  const fullPath = path.join(__dirname, "..", "public", filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

module.exports = { uploadLaporan, uploadFotoLaporan, hapusFileFoto };