const sequelize = require("../config/database");

/**
 * GET /api/titik-pkl
 * Mendapatkan semua titik PKL dengan filter, pencarian, dan paginasi.
 * Jika query parameter limit = "-1", akan mengambil seluruh data tanpa paginasi.
 */
async function getAllTitikPkl(req, res) {
  try {
    const {
      kecamatan_id,
      tingkat_kerawanan,
      status_penanganan,
      q,
      page = 1,
      limit = 25,
    } = req.query;

    // Cek apakah limit bernilai "-1" untuk mengambil semua data
    const isAllData = limit === "-1" || parseInt(limit, 10) === -1;

    let pageNum = 1;
    let limitNum = 25;
    let offset = 0;

    if (!isAllData) {
      // Batasi limit maksimal 200
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
    if (tingkat_kerawanan) {
      where.push("t.tingkat_kerawanan = ?");
      replacements.push(tingkat_kerawanan);
    }
    if (status_penanganan) {
      where.push("t.status_penanganan = ?");
      replacements.push(status_penanganan);
    }
    if (q) {
      where.push("(t.nama_lokasi LIKE ? OR t.catatan LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Total data (tanpa limit)
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM titik_pkl t ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    // Query data dengan join kecamatan
    let dataQuery = `SELECT t.*, k.nama AS kecamatan_nama
                     FROM titik_pkl t
                     JOIN kecamatan k ON k.id = t.kecamatan_id
                     ${whereSql}
                     ORDER BY t.nama_lokasi ASC`;

    if (!isAllData) {
      dataQuery += ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    const [rows] = await sequelize.query(dataQuery, { replacements });

    // Siapkan response pagination
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
    res.status(500).json({ success: false, message: "Gagal mengambil data titik PKL" });
  }
}

/**
 * GET /api/titik-pkl/:id
 * Mendapatkan detail satu titik PKL
 */
async function getTitikPklById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query(
      `SELECT t.*, k.nama AS kecamatan_nama
       FROM titik_pkl t
       JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.id = ?`,
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik PKL tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail titik PKL" });
  }
}

/**
 * POST /api/titik-pkl
 * Menambah titik PKL baru
 */
async function createTitikPkl(req, res) {
  try {
    const {
      nama_lokasi,
      kecamatan_id,
      latitude,
      longitude,
      peta_pos_x,
      peta_pos_y,
      jumlah_pkl,
      tingkat_kerawanan,
      status_penanganan,
      terakhir_diperiksa,
      catatan,
    } = req.body;

    if (!nama_lokasi || !kecamatan_id || jumlah_pkl === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama lokasi, kecamatan, dan jumlah PKL wajib diisi",
      });
    }

    await sequelize.query(
      `INSERT INTO titik_pkl 
        (nama_lokasi, kecamatan_id, latitude, longitude, peta_pos_x, peta_pos_y,
         jumlah_pkl, tingkat_kerawanan, status_penanganan, terakhir_diperiksa, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          nama_lokasi,
          kecamatan_id,
          latitude || null,
          longitude || null,
          peta_pos_x || null,
          peta_pos_y || null,
          jumlah_pkl,
          tingkat_kerawanan || "Sedang",
          status_penanganan || "Belum Ditindak",
          terakhir_diperiksa || null,
          catatan || null,
        ],
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({ success: true, data: { id: insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan titik PKL" });
  }
}

/**
 * PUT /api/titik-pkl/:id
 * Memperbarui data titik PKL
 */
async function updateTitikPkl(req, res) {
  try {
    const { id } = req.params;
    const {
      nama_lokasi,
      kecamatan_id,
      latitude,
      longitude,
      peta_pos_x,
      peta_pos_y,
      jumlah_pkl,
      tingkat_kerawanan,
      status_penanganan,
      terakhir_diperiksa,
      catatan,
    } = req.body;

    // Cek apakah data ada
    const [existing] = await sequelize.query("SELECT id FROM titik_pkl WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Titik PKL tidak ditemukan" });
    }

    const fields = [];
    const replacements = [];

    if (nama_lokasi !== undefined) {
      fields.push("nama_lokasi = ?");
      replacements.push(nama_lokasi);
    }
    if (kecamatan_id !== undefined) {
      fields.push("kecamatan_id = ?");
      replacements.push(kecamatan_id);
    }
    if (latitude !== undefined) {
      fields.push("latitude = ?");
      replacements.push(latitude);
    }
    if (longitude !== undefined) {
      fields.push("longitude = ?");
      replacements.push(longitude);
    }
    if (peta_pos_x !== undefined) {
      fields.push("peta_pos_x = ?");
      replacements.push(peta_pos_x);
    }
    if (peta_pos_y !== undefined) {
      fields.push("peta_pos_y = ?");
      replacements.push(peta_pos_y);
    }
    if (jumlah_pkl !== undefined) {
      fields.push("jumlah_pkl = ?");
      replacements.push(jumlah_pkl);
    }
    if (tingkat_kerawanan !== undefined) {
      fields.push("tingkat_kerawanan = ?");
      replacements.push(tingkat_kerawanan);
    }
    if (status_penanganan !== undefined) {
      fields.push("status_penanganan = ?");
      replacements.push(status_penanganan);
    }
    if (terakhir_diperiksa !== undefined) {
      fields.push("terakhir_diperiksa = ?");
      replacements.push(terakhir_diperiksa);
    }
    if (catatan !== undefined) {
      fields.push("catatan = ?");
      replacements.push(catatan);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE titik_pkl SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Titik PKL berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui titik PKL" });
  }
}

/**
 * DELETE /api/titik-pkl/:id
 * Menghapus titik PKL
 */
async function deleteTitikPkl(req, res) {
  try {
    const { id } = req.params;
    await sequelize.query("DELETE FROM titik_pkl WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Titik PKL berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus titik PKL" });
  }
}

module.exports = {
  getAllTitikPkl,
  getTitikPklById,
  createTitikPkl,
  updateTitikPkl,
  deleteTitikPkl,
};