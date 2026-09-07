// backend/controllers/kontakDaruratController.js
const sequelize = require("../config/database");

const KATEGORI_VALID = [
  "Pemadam Kebakaran",
  "Ambulans/Kesehatan",
  "Kepolisian",
  "Komando Linmas",
  "BPBD",
  "Lainnya",
];

// GET /api/kontak-darurat?kategori=&kecamatan_id=  (PUBLIK — tanpa login)
// Hanya menampilkan kontak yang is_active = 1, diurutkan berdasar `urutan`.
async function getKontakPublik(req, res) {
  try {
    const { kategori, kecamatan_id } = req.query;

    const where = ["is_active = 1"];
    const replacements = [];

    if (kategori) {
      where.push("kategori = ?");
      replacements.push(kategori);
    }
    if (kecamatan_id) {
      // Tampilkan kontak umum (kecamatan_id NULL) + kontak spesifik kecamatan yang diminta
      where.push("(kecamatan_id IS NULL OR kecamatan_id = ?)");
      replacements.push(kecamatan_id);
    }

    const [rows] = await sequelize.query(
      `SELECT kd.id, kd.kategori, kd.nama_kontak, kd.nomor_telepon, kd.keterangan,
              kd.kecamatan_id, k.nama AS kecamatan_nama
       FROM kontak_darurat kd
       LEFT JOIN kecamatan k ON k.id = kd.kecamatan_id
       WHERE ${where.join(" AND ")}
       ORDER BY kd.urutan ASC, kd.nama_kontak ASC`,
      { replacements }
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil daftar kontak darurat." });
  }
}

// GET /api/kontak-darurat/all?page=&limit=&kategori=&is_active=  (ADMIN)
async function getAllKontakAdmin(req, res) {
  try {
    const { kategori, is_active, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (kategori) {
      where.push("kd.kategori = ?");
      replacements.push(kategori);
    }
    if (is_active !== undefined) {
      where.push("kd.is_active = ?");
      replacements.push(is_active === "true" || is_active === "1" ? 1 : 0);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM kontak_darurat kd ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    const [rows] = await sequelize.query(
      `SELECT kd.*, k.nama AS kecamatan_nama
       FROM kontak_darurat kd
       LEFT JOIN kecamatan k ON k.id = kd.kecamatan_id
       ${whereSql}
       ORDER BY kd.urutan ASC, kd.nama_kontak ASC
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
    res.status(500).json({ success: false, message: "Gagal mengambil data kontak darurat." });
  }
}

// GET /api/kontak-darurat/:id  (ADMIN)
async function getKontakById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query(
      `SELECT kd.*, k.nama AS kecamatan_nama
       FROM kontak_darurat kd
       LEFT JOIN kecamatan k ON k.id = kd.kecamatan_id
       WHERE kd.id = ?`,
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kontak tidak ditemukan." });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail kontak." });
  }
}

// POST /api/kontak-darurat  (ADMIN)
async function createKontak(req, res) {
  try {
    const { kategori, nama_kontak, nomor_telepon, kecamatan_id, keterangan, urutan } = req.body;

    if (!kategori || !nama_kontak || !nomor_telepon) {
      return res.status(400).json({
        success: false,
        message: "Kategori, nama kontak, dan nomor telepon wajib diisi.",
      });
    }
    if (!KATEGORI_VALID.includes(kategori)) {
      return res.status(400).json({ success: false, message: "Kategori tidak valid." });
    }

    await sequelize.query(
      `INSERT INTO kontak_darurat
        (kategori, nama_kontak, nomor_telepon, kecamatan_id, keterangan, urutan, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      {
        replacements: [
          kategori,
          nama_kontak,
          nomor_telepon,
          kecamatan_id || null,
          keterangan || null,
          urutan || 0,
        ],
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({ success: true, message: "Kontak darurat berhasil ditambahkan.", data: { id: insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menambahkan kontak darurat." });
  }
}

// PUT /api/kontak-darurat/:id  (ADMIN)
async function updateKontak(req, res) {
  try {
    const { id } = req.params;
    const { kategori, nama_kontak, nomor_telepon, kecamatan_id, keterangan, urutan } = req.body;

    const [existing] = await sequelize.query("SELECT id FROM kontak_darurat WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Kontak tidak ditemukan." });
    }

    if (kategori && !KATEGORI_VALID.includes(kategori)) {
      return res.status(400).json({ success: false, message: "Kategori tidak valid." });
    }

    const fields = [];
    const replacements = [];
    const maybeSet = (col, val) => {
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        replacements.push(val === "" ? null : val);
      }
    };

    maybeSet("kategori", kategori);
    maybeSet("nama_kontak", nama_kontak);
    maybeSet("nomor_telepon", nomor_telepon);
    maybeSet("kecamatan_id", kecamatan_id);
    maybeSet("keterangan", keterangan);
    maybeSet("urutan", urutan);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah." });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE kontak_darurat SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Kontak darurat berhasil diperbarui." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui kontak darurat." });
  }
}

// PATCH /api/kontak-darurat/:id/status  (ADMIN) — aktif/nonaktifkan tampil di halaman publik
async function updateStatusKontak(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ success: false, message: "is_active wajib diisi." });
    }

    const [result] = await sequelize.query(
      "UPDATE kontak_darurat SET is_active = ? WHERE id = ?",
      { replacements: [is_active ? 1 : 0, id] }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Kontak tidak ditemukan." });
    }

    res.json({ success: true, message: "Status kontak berhasil diperbarui." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui status kontak." });
  }
}

// DELETE /api/kontak-darurat/:id  (ADMIN)
async function deleteKontak(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await sequelize.query("SELECT id FROM kontak_darurat WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Kontak tidak ditemukan." });
    }
    await sequelize.query("DELETE FROM kontak_darurat WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Kontak darurat berhasil dihapus." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus kontak darurat." });
  }
}

module.exports = {
  getKontakPublik,
  getAllKontakAdmin,
  getKontakById,
  createKontak,
  updateKontak,
  updateStatusKontak,
  deleteKontak,
};