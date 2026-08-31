const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "monev");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (ok) return cb(null, true);
  cb(new Error("Hanya file gambar (jpg, jpeg, png, webp) yang diizinkan"));
}

const uploadMonev = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per foto
});

// Hapus file fisik berdasarkan foto_url (mis. "/uploads/monev/xxx.jpg")
function hapusFileFotoMonev(foto_url) {
  if (!foto_url) return;
  const fullPath = path.join(__dirname, "..", "public", foto_url);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== "ENOENT") console.error("Gagal menghapus foto monev:", err.message);
  });
}

module.exports = { uploadMonev, hapusFileFotoMonev };