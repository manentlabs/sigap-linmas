const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database"); // instance Sequelize yang sudah ada di project

// GET /api/kategori-berita
async function getAllKategori(req, res) {
  try {
    const rows = await sequelize.query(
      "SELECT id, nama FROM kategori_berita ORDER BY nama ASC",
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data kategori berita" });
  }
}

// POST /api/kategori-berita  body: { nama }
async function createKategori(req, res) {
  try {
    const { nama } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: "Nama kategori wajib diisi" });
    }

    const existing = await sequelize.query(
      "SELECT id FROM kategori_berita WHERE nama = :nama",
      { replacements: { nama: nama.trim() }, type: QueryTypes.SELECT }
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Kategori dengan nama tersebut sudah ada" });
    }

    const [insertId] = await sequelize.query(
      "INSERT INTO kategori_berita (nama) VALUES (:nama)",
      { replacements: { nama: nama.trim() }, type: QueryTypes.INSERT }
    );

    res.status(201).json({ success: true, data: { id: insertId, nama: nama.trim() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menambah kategori berita" });
  }
}

// DELETE /api/kategori-berita/:id
// Ditolak jika kategori masih dipakai oleh berita (FK RESTRICT).
async function deleteKategori(req, res) {
  try {
    const { id } = req.params;
    const dipakai = await sequelize.query(
      "SELECT COUNT(*) AS total FROM berita WHERE kategori_id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (dipakai[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: "Kategori tidak bisa dihapus karena masih dipakai oleh berita",
      });
    }
    await sequelize.query("DELETE FROM kategori_berita WHERE id = :id", {
      replacements: { id },
      type: QueryTypes.DELETE,
    });
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus kategori berita" });
  }
}

module.exports = { getAllKategori, createKategori, deleteKategori };