// backend/routes/layananRoutes.js
const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();

const {
  createLayanan,
  getAllLayanan,
  getLayananById,
  updateStatusLayanan,
} = require("../controllers/layananController");

const { upload } = require("../middleware/uploadLayanan");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const JENIS_VALID = [
  "Laporan Bencana",
  "Pengaduan Tantribumlinmas",
  "Posyandu",
  "Pengaduan Sampah",
];

function cekValidasi(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Data yang dikirim tidak valid.",
      errors: errors.array(),
    });
  }
  next();
}

// -----------------------------------------------------------------------
// POST /api/layanan-publik  — PUBLIK, tanpa login (dipakai warga di HomePage)
// multipart/form-data, field foto opsional: "foto"
// -----------------------------------------------------------------------
router.post(
  "/",
  upload.single("foto"),
  [
    body("jenis").isIn(JENIS_VALID).withMessage("Jenis layanan tidak valid."),
    body("nama_pelapor").trim().notEmpty().withMessage("Nama wajib diisi."),
    body("no_hp").trim().isLength({ min: 8, max: 20 }).withMessage("Nomor HP tidak valid."),
    body("lokasi").trim().notEmpty().withMessage("Lokasi wajib diisi."),
    body("deskripsi").trim().isLength({ min: 10 }).withMessage("Deskripsi minimal 10 karakter."),
  ],
  cekValidasi,
  createLayanan
);

// -----------------------------------------------------------------------
// Endpoint di bawah ini khusus untuk admin/petugas — wajib login
// -----------------------------------------------------------------------
router.use(verifyToken);

router.get(
  "/",
  authorizeRoles("admin", "kepala_satgas", "operator_kecamatan"),
  [
    query("jenis").optional().isIn(JENIS_VALID),
    query("status").optional().isIn(["Baru", "Diproses", "Selesai"]),
  ],
  cekValidasi,
  getAllLayanan
);

router.get(
  "/:id",
  authorizeRoles("admin", "kepala_satgas", "operator_kecamatan"),
  [param("id").isInt().withMessage("id harus berupa angka.")],
  cekValidasi,
  getLayananById
);

router.patch(
  "/:id/status",
  authorizeRoles("admin", "kepala_satgas"),
  [
    param("id").isInt().withMessage("id harus berupa angka."),
    body("status").isIn(["Baru", "Diproses", "Selesai"]).withMessage("status tidak valid."),
  ],
  cekValidasi,
  updateStatusLayanan
);

module.exports = router;