const express = require("express");
const router = express.Router();
const {
  getAllBerita,
  getTahunList,
  getBeritaById,
  createBerita,
  updateBerita,
  deleteBerita,
} = require("../controllers/beritaController");
const { uploadBerita } = require("../middleware/uploadBerita");

router.get("/tahun-list", getTahunList);
router.get("/", getAllBerita);
router.get("/:id", getBeritaById);
router.post("/", uploadBerita.single("gambar"), createBerita);
router.put("/:id", uploadBerita.single("gambar"), updateBerita);
router.delete("/:id", deleteBerita);

module.exports = router;