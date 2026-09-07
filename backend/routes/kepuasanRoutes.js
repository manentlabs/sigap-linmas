// backend/routes/kepuasanRoutes.js
const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router();

const {
  createKepuasan,
  getAllKepuasan,
  getRingkasanKepuasan,
  getKepuasanById,
  deleteKepuasan,
} = require("../controllers/kepuasanController");

const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

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
// POST /api/kepuasan  — PUBLIK, tanpa login (warga mengisi survei singkat)
// -----------------------------------------------------------------------
router.post(
  "/",
  [
    body("rating_keseluruhan").isInt({ min: 1, max: 5 }).withMessage("Rating keseluruhan wajib 1–5."),
    body("kecepatan_pelayanan").optional().isInt({ min: 1, max: 5 }),
    body("keramahan_petugas").optional().isInt({ min: 1, max: 5 }),
    body("kejelasan_informasi").optional().isInt({ min: 1, max: 5 }),
    body("no_hp").optional().isLength({ max: 20 }),
    body("nama_responden").optional().isLength({ max: 150 }),
  ],
  cekValidasi,
  createKepuasan
);

// -----------------------------------------------------------------------
// Endpoint di bawah ini khusus admin/petugas — wajib login.
// "/stats/ringkasan" diletakkan SEBELUM "/:id" supaya tidak salah tertangkap.
// -----------------------------------------------------------------------
router.use(verifyToken);

router.get(
  "/stats/ringkasan",
  authorizeRoles("admin", "kepala_satgas"),
  getRingkasanKepuasan
);

router.get(
  "/",
  authorizeRoles("admin", "kepala_satgas"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 200 }),
    query("rating_min").optional().isInt({ min: 1, max: 5 }),
  ],
  cekValidasi,
  getAllKepuasan
);

router.get(
  "/:id",
  authorizeRoles("admin", "kepala_satgas"),
  [param("id").isInt().withMessage("id harus berupa angka.")],
  cekValidasi,
  getKepuasanById
);

router.delete(
  "/:id",
  authorizeRoles("admin", "kepala_satgas"),
  [param("id").isInt().withMessage("id harus berupa angka.")],
  cekValidasi,
  deleteKepuasan
);

module.exports = router;