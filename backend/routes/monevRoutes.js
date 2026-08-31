const express = require("express");
const router = express.Router();

// Sesuaikan nama middleware auth ini dengan yang dipakai laporanRoutes.js di project Anda
const { verifyToken } = require("../middleware/authMiddleware");
const { uploadMonev } = require("../middleware/uploadMonev");

const {
  getAllMonev,
  getMonevById,
  createMonev,
  updateMonev,
  deleteMonev,
  downloadFilteredMonevPDF,
  downloadSingleMonevPDF,
} = require("../controllers/monevController");

// Semua route monev butuh login
router.use(verifyToken);

// PDF (taruh sebelum /:id agar "pdf" tidak ketangkep sebagai id)
router.get("/pdf", downloadFilteredMonevPDF);
router.get("/:id/pdf", downloadSingleMonevPDF);

// CRUD
router.get("/", getAllMonev);
router.get("/:id", getMonevById);
router.post("/", uploadMonev.array("foto", 10), createMonev);
router.put("/:id", uploadMonev.array("foto", 10), updateMonev);
router.delete("/:id", deleteMonev);

module.exports = router;