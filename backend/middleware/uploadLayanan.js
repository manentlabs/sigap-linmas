// backend/middleware/uploadLayanan.js
// Konfigurasi multer untuk upload foto bukti pada laporan/pengaduan publik
// (Laporan Bencana, Pengaduan Tantribumlinmas, Posyandu, Pengaduan Sampah).
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "layanan");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Format file harus JPG, PNG, atau WEBP."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // maksimal 3MB, foto bukti biasanya dari kamera HP
});

module.exports = { upload, UPLOAD_DIR };