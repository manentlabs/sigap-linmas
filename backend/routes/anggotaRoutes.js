const express = require("express");
const router = express.Router();
const anggotaController = require("../controllers/anggotaController");
const { uploadAnggota } = require("../middleware/uploadAnggota");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/stats/ringkasan", anggotaController.getRingkasanAnggota);
router.get("/", anggotaController.getAllAnggota);
router.get("/:id", anggotaController.getAnggotaById);

router.post("/", verifyToken, uploadAnggota.single("foto"), anggotaController.createAnggota);
router.put("/:id", verifyToken, uploadAnggota.single("foto"), anggotaController.updateAnggota);
router.patch("/:id/status", verifyToken, anggotaController.updateStatusAnggota);
router.delete("/:id", verifyToken, anggotaController.deleteAnggota);

module.exports = router;