const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Folder penyimpanan
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "berita");

// Pastikan folder ada
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format gambar harus JPG, PNG, atau WEBP"));
  }
}

const uploadBerita = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

// Hapus gambar lama
function hapusFileGambar(gambarUrl) {
  if (!gambarUrl) return;

  const filename = path.basename(gambarUrl);
  const filePath = path.join(UPLOAD_DIR, filename);

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Gagal menghapus file gambar:", err.message);
    }
  });
}

module.exports = {
  uploadBerita,
  hapusFileGambar,
  UPLOAD_DIR,
};