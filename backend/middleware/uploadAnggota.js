const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "anggota");

// Buat folder jika belum ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `anggota-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowed.includes(ext)) {
    return cb(new Error("Format file harus jpg, jpeg, png, atau webp"));
  }

  cb(null, true);
}

const uploadAnggota = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

function hapusFileFoto(fotoUrl) {
  if (!fotoUrl) return;

  const filePath = path.join(
    __dirname,
    "..",
    "public",
    fotoUrl.replace(/^\/uploads/, "uploads")
  );

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Gagal menghapus file:", err.message);
    }
  });
}

module.exports = {
  uploadAnggota,
  hapusFileFoto,
};