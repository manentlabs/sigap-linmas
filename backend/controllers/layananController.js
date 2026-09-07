// backend/controllers/layananController.js
const sequelize = require("../config/database");

const JENIS_VALID = [
  "Laporan Bencana",
  "Pengaduan Tantribumlinmas",
  "Posyandu",
  "Pengaduan Sampah",
];

async function generateKodeLayanan() {
  const [rows] = await sequelize.query(
    "SELECT kode_layanan FROM layanan_publik ORDER BY id DESC LIMIT 1"
  );
  if (rows.length === 0) return "LYN-000001";
  const last = rows[0].kode_layanan;
  const num = parseInt(last.split("-")[1], 10) || 0;
  return `LYN-${String(num + 1).padStart(6, "0")}`;
}

// POST /api/layanan-publik  (PUBLIK — tanpa login, dipakai warga dari HomePage)
async function createLayanan(req, res) {
  try {
    const { jenis, nama_pelapor, no_hp, lokasi, deskripsi } = req.body;

    if (!jenis || !nama_pelapor || !no_hp || !lokasi || !deskripsi) {
      return res.status(400).json({
        success: false,
        message: "Jenis layanan, nama, no HP, lokasi, dan deskripsi wajib diisi.",
      });
    }

    if (!JENIS_VALID.includes(jenis)) {
      return res.status(400).json({ success: false, message: "Jenis layanan tidak valid." });
    }

    const kodeLayanan = await generateKodeLayanan();
    const fotoUrl = req.file ? `/uploads/layanan/${req.file.filename}` : null;

    await sequelize.query(
      `INSERT INTO layanan_publik
        (kode_layanan, jenis, nama_pelapor, no_hp, lokasi, deskripsi, foto_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Baru')`,
      {
        replacements: [kodeLayanan, jenis, nama_pelapor, no_hp, lokasi, deskripsi, fotoUrl],
      }
    );

    res.status(201).json({
      success: true,
      message: "Laporan berhasil dikirim. Tim kami akan segera menindaklanjuti.",
      data: { kode_layanan: kodeLayanan },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengirim laporan. Coba lagi beberapa saat." });
  }
}

// GET /api/layanan-publik?jenis=&status=&page=&limit=  (ADMIN/PETUGAS)
async function getAllLayanan(req, res) {
  try {
    const { jenis, status, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (jenis) {
      where.push("jenis = ?");
      replacements.push(jenis);
    }
    if (status) {
      where.push("status = ?");
      replacements.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM layanan_publik ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    const [rows] = await sequelize.query(
      `SELECT * FROM layanan_publik ${whereSql}
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
    res.status(500).json({ success: false, message: "Gagal mengambil data layanan." });
  }
}

// GET /api/layanan-publik/:id  (ADMIN/PETUGAS)
async function getLayananById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query("SELECT * FROM layanan_publik WHERE id = ?", {
      replacements: [id],
    });
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Data layanan tidak ditemukan." });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail layanan." });
  }
}

// PATCH /api/layanan-publik/:id/status  (ADMIN/PETUGAS)
async function updateStatusLayanan(req, res) {
  try {
    const { id } = req.params;
    const { status, catatan_tindak_lanjut } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "status wajib diisi." });
    }

    const [result] = await sequelize.query(
      `UPDATE layanan_publik
       SET status = ?, catatan_tindak_lanjut = ?, ditindak_oleh = ?
       WHERE id = ?`,
      { replacements: [status, catatan_tindak_lanjut || null, req.user.id, id] }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Data layanan tidak ditemukan." });
    }

    res.json({ success: true, message: "Status layanan berhasil diperbarui." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui status layanan." });
  }
}

module.exports = {
  createLayanan,
  getAllLayanan,
  getLayananById,
  updateStatusLayanan,
};