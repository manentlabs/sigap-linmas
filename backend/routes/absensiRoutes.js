// routes/absensiRoutes.js
const express = require("express");
const router = express.Router();
const absensiController = require("../controllers/absensiController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadAbsensi } = require("../middleware/uploadAbsensi");

// ── Non P3K & Operator Kecamatan (self-service) ──
// PENTING: route spesifik ini harus didaftarkan SEBELUM "/:id",
// kalau tidak Express akan mencocokkannya ke "/:id" duluan
// (mis. GET /today dianggap GET /:id dengan id="today") dan
// kena middleware authorizeRoles("admin","kepala_satgas") yang salah.
router.post(
  "/checkin",
  verifyToken,
  authorizeRoles("non_p3k", "operator_kecamatan"),
  uploadAbsensi.single("foto"),
  absensiController.checkinAnggota
);

router.post(
  "/checkout",
  verifyToken,
  authorizeRoles("non_p3k", "operator_kecamatan"),
  uploadAbsensi.single("foto"),
  absensiController.checkoutAnggota
);

router.get(
  "/today",
  verifyToken,
  authorizeRoles("non_p3k", "operator_kecamatan"),
  absensiController.getAbsensiToday
);

router.get(
  "/riwayat",
  verifyToken,
  authorizeRoles("non_p3k", "operator_kecamatan"),
  absensiController.getRiwayatAnggota
);

// ── Admin & Kepala Satgas ──
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "kepala_satgas"),
  absensiController.getAllAbsensi
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "kepala_satgas"),
  uploadAbsensi.fields([{ name: "foto_masuk" }, { name: "foto_keluar" }]),
  absensiController.createAbsensi
);

// "/:id" WAJIB paling bawah di antara GET, supaya tidak menelan
// path spesifik seperti /today dan /riwayat di atas
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "kepala_satgas"),
  absensiController.getAbsensiById
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "kepala_satgas"),
  uploadAbsensi.fields([{ name: "foto_masuk" }, { name: "foto_keluar" }]),
  absensiController.updateAbsensi
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "kepala_satgas"),
  absensiController.deleteAbsensi
);

module.exports = router;