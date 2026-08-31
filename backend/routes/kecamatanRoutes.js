const express = require("express");
const router = express.Router();
const kecamatanController = require("../controllers/kecamatanController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/stats/jumlah-desa", kecamatanController.getJumlahDesaPerKecamatan); // <-- BARU, sebelum /:id
router.get("/", kecamatanController.getAllKecamatan);
router.get("/:id", kecamatanController.getKecamatanById);

router.post("/", verifyToken, kecamatanController.createKecamatan);
router.put("/:id", verifyToken, kecamatanController.updateKecamatan);
router.delete("/:id", verifyToken, kecamatanController.deleteKecamatan);

module.exports = router;