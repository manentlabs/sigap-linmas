// backend/controllers/kepuasanController.js
const sequelize = require("../config/database");

async function generateKodeSurvei() {
  const [rows] = await sequelize.query(
    "SELECT kode_survei FROM kepuasan_masyarakat ORDER BY id DESC LIMIT 1"
  );
  if (rows.length === 0) return "SVY-000001";
  const last = rows[0].kode_survei;
  const num = parseInt(last.split("-")[1], 10) || 0;
  return `SVY-${String(num + 1).padStart(6, "0")}`;
}

// POST /api/kepuasan  (PUBLIK — tanpa login)
async function createKepuasan(req, res) {
  try {
    const {
      nama_responden,
      no_hp,
      jenis_layanan,
      rating_keseluruhan,
      kecepatan_pelayanan,
      keramahan_petugas,
      kejelasan_informasi,
      saran,
    } = req.body;

    const rating = parseInt(rating_keseluruhan, 10);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating keseluruhan wajib diisi, skala 1–5.",
      });
    }

    const kodeSurvei = await generateKodeSurvei();

    await sequelize.query(
      `INSERT INTO kepuasan_masyarakat
        (kode_survei, nama_responden, no_hp, jenis_layanan, rating_keseluruhan,
         kecepatan_pelayanan, keramahan_petugas, kejelasan_informasi, saran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          kodeSurvei,
          nama_responden || null,
          no_hp || null,
          jenis_layanan || null,
          rating,
          kecepatan_pelayanan || null,
          keramahan_petugas || null,
          kejelasan_informasi || null,
          saran || null,
        ],
      }
    );

    res.status(201).json({
      success: true,
      message: "Terima kasih atas penilaian Anda.",
      data: { kode_survei: kodeSurvei },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengirim penilaian. Coba lagi beberapa saat." });
  }
}

// GET /api/kepuasan?page=&limit=&rating_min=&jenis_layanan=  (ADMIN)
async function getAllKepuasan(req, res) {
  try {
    const { rating_min, jenis_layanan, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (rating_min) {
      where.push("rating_keseluruhan >= ?");
      replacements.push(parseInt(rating_min, 10));
    }
    if (jenis_layanan) {
      where.push("jenis_layanan = ?");
      replacements.push(jenis_layanan);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM kepuasan_masyarakat ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    const [rows] = await sequelize.query(
      `SELECT * FROM kepuasan_masyarakat ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      { replacements }
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data kepuasan masyarakat." });
  }
}

// GET /api/kepuasan/stats/ringkasan  (ADMIN) — rata-rata tiap unsur penilaian
async function getRingkasanKepuasan(req, res) {
  try {
    const [[stats]] = await sequelize.query(
      `SELECT
         COUNT(*) AS total_responden,
         ROUND(AVG(rating_keseluruhan), 2) AS rata_rating_keseluruhan,
         ROUND(AVG(kecepatan_pelayanan), 2) AS rata_kecepatan_pelayanan,
         ROUND(AVG(keramahan_petugas), 2) AS rata_keramahan_petugas,
         ROUND(AVG(kejelasan_informasi), 2) AS rata_kejelasan_informasi
       FROM kepuasan_masyarakat`
    );

    const [distribusi] = await sequelize.query(
      `SELECT rating_keseluruhan AS rating, COUNT(*) AS jumlah
       FROM kepuasan_masyarakat
       GROUP BY rating_keseluruhan
       ORDER BY rating_keseluruhan ASC`
    );

    res.json({
      success: true,
      data: {
        ...stats,
        distribusi_rating: distribusi,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil ringkasan kepuasan masyarakat." });
  }
}

// GET /api/kepuasan/:id  (ADMIN)
async function getKepuasanById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query("SELECT * FROM kepuasan_masyarakat WHERE id = ?", {
      replacements: [id],
    });
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Data survei tidak ditemukan." });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail survei." });
  }
}

// DELETE /api/kepuasan/:id  (ADMIN) — moderasi entri spam/tidak relevan
async function deleteKepuasan(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await sequelize.query("SELECT id FROM kepuasan_masyarakat WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Data survei tidak ditemukan." });
    }
    await sequelize.query("DELETE FROM kepuasan_masyarakat WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Data survei berhasil dihapus." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus data survei." });
  }
}

module.exports = {
  createKepuasan,
  getAllKepuasan,
  getRingkasanKepuasan,
  getKepuasanById,
  deleteKepuasan,
};