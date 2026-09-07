// backend/routes/kontakDaruratRoutes.js
const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();

const {
  getKontakPublik,
  getAllKontakAdmin,
  getKontakById,
  createKontak,
  updateKontak,
  updateStatusKontak,
  deleteKontak,
} = require("../controllers/kontakDaruratController");

const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const KATEGORI_VALID = [
  "Pemadam Kebakaran",
  "Ambulans/Kesehatan",
  "Kepolisian",
  "Komando Linmas",
  "BPBD",
  "Lainnya",
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
// GET /api/kontak-darurat  — PUBLIK, tanpa login (dipakai halaman publik)
// Hanya kontak aktif yang ditampilkan.
// -----------------------------------------------------------------------
router.get(
  "/",
  [
    query("kategori").optional().isIn(KATEGORI_VALID),
    query("kecamatan_id").optional().isInt(),
  ],
  cekValidasi,
  getKontakPublik
);

// -----------------------------------------------------------------------
// Endpoint di bawah ini khusus admin/petugas — wajib login.
// "/all" diletakkan SEBELUM "/:id" supaya "all" tidak tertangkap sebagai id.
// -----------------------------------------------------------------------
router.use(verifyToken);

router.get(
  "/all",
  authorizeRoles("admin", "kepala_satgas"),
  getAllKontakAdmin
);

router.get(
  "/:id",
  authorizeRoles("admin", "kepala_satgas"),
  [param("id").isInt().withMessage("id harus berupa angka.")],
  cekValidasi,
  getKontakById
);

router.post(
  "/",
  authorizeRoles("admin", "kepala_satgas"),
  [
    body("kategori").isIn(KATEGORI_VALID).withMessage("Kategori tidak valid."),
    body("nama_kontak").trim().notEmpty().withMessage("Nama kontak wajib diisi."),
    body("nomor_telepon").trim().notEmpty().withMessage("Nomor telepon wajib diisi."),
    body("kecamatan_id").optional().isInt(),
  ],
  cekValidasi,
  createKontak
);

router.put(
  "/:id",
  authorizeRoles("admin", "kepala_satgas"),
  [
    param("id").isInt().withMessage("id harus berupa angka."),
    body("kategori").optional().isIn(KATEGORI_VALID),
    body("kecamatan_id").optional().isInt(),
  ],
  cekValidasi,
  updateKontak
);

router.patch(
  "/:id/status",
  authorizeRoles("admin", "kepala_satgas"),
  [
    param("id").isInt().withMessage("id harus berupa angka."),
    body("is_active").isBoolean().withMessage("is_active harus true/false."),
  ],
  cekValidasi,
  updateStatusKontak
);

router.delete(
  "/:id",
  authorizeRoles("admin", "kepala_satgas"),
  [param("id").isInt().withMessage("id harus berupa angka.")],
  cekValidasi,
  deleteKontak
);

module.exports = router;