const sequelize = require("../config/database");

const JENIS = ["Posyandu", "Poskamling"];
const KONDISI = ["Baik", "Cukup", "Perlu Perbaikan"];
const STATUS = ["Aktif", "Tidak Aktif"];

/**
 * GET /api/titikpos
 * Mendapatkan semua titik Posyandu & Poskamling dengan filter, pencarian, dan paginasi.
 * Jika query parameter limit = "-1", akan mengambil seluruh data tanpa paginasi.
 */
async function getAllTitikPos(req, res) {
  try {
    const {
      kecamatan_id,
      jenis,
      kondisi,
      status,
      q,
      page = 1,
      limit = 25,
    } = req.query;

    const isAllData = limit === "-1" || parseInt(limit, 10) === -1;

    let pageNum = 1;
    let limitNum = 25;
    let offset = 0;

    if (!isAllData) {
      limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
      pageNum = Math.max(parseInt(page, 10) || 1, 1);
      offset = (pageNum - 1) * limitNum;
    }

    const where = [];
    const replacements = [];

    if (kecamatan_id) {
      where.push("t.kecamatan_id = ?");
      replacements.push(kecamatan_id);
    }
    if (jenis) {
      where.push("t.jenis = ?");
      replacements.push(jenis);
    }
    if (kondisi) {
      where.push("t.kondisi = ?");
      replacements.push(kondisi);
    }
    if (status) {
      where.push("t.status = ?");
      replacements.push(status);
    }
    if (q) {
      where.push("(t.nama_lokasi LIKE ? OR t.alamat LIKE ? OR t.catatan LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Total data (tanpa limit)
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM titik_pos t ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    // Query data dengan join kecamatan
    let dataQuery = `SELECT t.*, k.nama AS kecamatan_nama
                     FROM titik_pos t
                     JOIN kecamatan k ON k.id = t.kecamatan_id
                     ${whereSql}
                     ORDER BY t.nama_lokasi ASC`;

    if (!isAllData) {
      dataQuery += ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    const [rows] = await sequelize.query(dataQuery, { replacements });

    const actualLimit = isAllData ? total : limitNum;
    const totalPages = isAllData ? 1 : Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: isAllData ? 1 : pageNum,
        limit: actualLimit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data titik Posyandu & Poskamling" });
  }
}

/**
 * GET /api/titikpos/:id
 */
async function getTitikPosById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query(
      `SELECT t.*, k.nama AS kecamatan_nama
       FROM titik_pos t
       JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.id = ?`,
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail titik" });
  }
}

/**
 * POST /api/titikpos
 */
async function createTitikPos(req, res) {
  try {
    const {
      nama_lokasi,
      jenis,
      kecamatan_id,
      alamat,
      latitude,
      longitude,
      peta_pos_x,
      peta_pos_y,
      jumlah_petugas,
      kondisi,
      status,
      terakhir_diperiksa,
      catatan,
    } = req.body;

    if (!nama_lokasi || !jenis || !kecamatan_id || jumlah_petugas === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama lokasi, jenis, kecamatan, dan jumlah petugas wajib diisi",
      });
    }
    if (!JENIS.includes(jenis)) {
      return res.status(400).json({ success: false, message: "Jenis tidak valid" });
    }
    if (kondisi && !KONDISI.includes(kondisi)) {
      return res.status(400).json({ success: false, message: "Kondisi tidak valid" });
    }
    if (status && !STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid" });
    }

    // Pada MySQL, hasil pertama dari INSERT mentah adalah insertId
    const [insertId] = await sequelize.query(
      `INSERT INTO titik_pos
        (nama_lokasi, jenis, kecamatan_id, alamat, latitude, longitude,
         peta_pos_x, peta_pos_y, jumlah_petugas, kondisi, status,
         terakhir_diperiksa, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          nama_lokasi,
          jenis,
          kecamatan_id,
          alamat || null,
          latitude || null,
          longitude || null,
          peta_pos_x || null,
          peta_pos_y || null,
          jumlah_petugas,
          kondisi || "Baik",
          status || "Aktif",
          terakhir_diperiksa || null,
          catatan || null,
        ],
      }
    );

    res.status(201).json({ success: true, data: { id: insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan titik" });
  }
}

/**
 * PUT /api/titikpos/:id
 * Update parsial: hanya field yang dikirim yang diubah.
 */
async function updateTitikPos(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await sequelize.query("SELECT id FROM titik_pos WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Titik tidak ditemukan" });
    }

    const { jenis, kondisi, status } = req.body;
    if (jenis !== undefined && !JENIS.includes(jenis)) {
      return res.status(400).json({ success: false, message: "Jenis tidak valid" });
    }
    if (kondisi !== undefined && !KONDISI.includes(kondisi)) {
      return res.status(400).json({ success: false, message: "Kondisi tidak valid" });
    }
    if (status !== undefined && !STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid" });
    }

    const allowed = [
      "nama_lokasi",
      "jenis",
      "kecamatan_id",
      "alamat",
      "latitude",
      "longitude",
      "peta_pos_x",
      "peta_pos_y",
      "jumlah_petugas",
      "kondisi",
      "status",
      "terakhir_diperiksa",
      "catatan",
    ];

    const fields = [];
    const replacements = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        replacements.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE titik_pos SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Titik berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui titik" });
  }
}

/**
 * DELETE /api/titikpos/:id
 */
async function deleteTitikPos(req, res) {
  try {
    const { id } = req.params;
    await sequelize.query("DELETE FROM titik_pos WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Titik berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus titik" });
  }
}

module.exports = {
  getAllTitikPos,
  getTitikPosById,
  createTitikPos,
  updateTitikPos,
  deleteTitikPos,
};