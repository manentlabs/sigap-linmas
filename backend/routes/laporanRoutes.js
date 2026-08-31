const express = require("express");
const router = express.Router();
const laporanController = require("../controllers/laporanController");
const { verifyToken } = require("../middleware/authMiddleware");
const { uploadFotoLaporan } = require("../middleware/uploadLaporan");

// ===========================================================================
// Laporan Bulanan Kecamatan (dulu "Linmas Desa")
// Rute spesifik ini HARUS didaftarkan sebelum "/:id" milik Non P3K di bawah,
// supaya "/bulanan" tidak ikut ketangkep sebagai parameter :id.
// ===========================================================================
router.get("/bulanan", verifyToken, laporanController.getAllLaporanBulanan);
router.get("/bulanan/:id", verifyToken, laporanController.getLaporanBulananById);
router.get("/bulanan/:id/pdf", verifyToken, laporanController.downloadLaporanBulananPDF);
router.post("/bulanan", verifyToken, laporanController.createLaporanBulanan);
router.put("/bulanan/:id", verifyToken, laporanController.updateLaporanBulanan);
router.delete("/bulanan/:id", verifyToken, laporanController.deleteLaporanBulanan);

// ===========================================================================
// Statistik gabungan
// ===========================================================================
router.get("/stats/per-kecamatan", verifyToken, laporanController.getStatsPerKecamatan);

// ===========================================================================
// Laporan Non P3K Paruh Waktu
// Rute spesifik HARUS didaftarkan sebelum rute dengan parameter (:id)
// ===========================================================================
router.get("/pdf", verifyToken, laporanController.downloadFilteredPDF);

router.get("/", verifyToken, laporanController.getAllLaporan);
router.get("/:id", verifyToken, laporanController.getLaporanById);
router.get("/:id/pdf", verifyToken, laporanController.downloadSinglePDF);
router.post("/", verifyToken, uploadFotoLaporan, laporanController.createLaporan);
router.put("/:id", verifyToken, uploadFotoLaporan, laporanController.updateLaporan);
router.delete("/:id", verifyToken, laporanController.deleteLaporan);

module.exports = router;