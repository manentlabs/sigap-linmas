const express = require("express");
const router = express.Router();
const { getAllKategori, createKategori, deleteKategori } = require("../controllers/kategoriBeritaController");

router.get("/", getAllKategori);
router.post("/", createKategori);
router.delete("/:id", deleteKategori);

module.exports = router;