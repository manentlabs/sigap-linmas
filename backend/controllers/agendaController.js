const sequelize = require("../config/database");

/**
 * GET /api/agenda
 * Mendapatkan daftar agenda.
 * Query params:
 *   - tanggal: filter berdasarkan tanggal spesifik (format YYYY-MM-DD)
 *   - hari_ini: jika "true", hanya ambil agenda hari ini (default jika tidak ada filter lain)
 *   - status: filter status
 *   - q: pencarian judul/deskripsi
 *   - page, limit: paginasi
 */
async function getAllAgenda(req, res) {
  try {
    const {
      tanggal,
      hari_ini,
      status,
      q,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    // Tentukan filter tanggal
    if (tanggal) {
      where.push("a.tanggal = ?");
      replacements.push(tanggal);
    } else if (hari_ini === "true" || (!tanggal && !status && !q)) {
      // Default: hari ini
      const today = new Date().toISOString().split("T")[0];
      where.push("a.tanggal = ?");
      replacements.push(today);
    }

    if (status) {
      where.push("a.status = ?");
      replacements.push(status);
    }
    if (q) {
      where.push("(a.judul LIKE ? OR a.deskripsi LIKE ? OR a.lokasi LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Total
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM agenda a ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    // Data
    const [rows] = await sequelize.query(
      `SELECT *
       FROM agenda a
       ${whereSql}
       ORDER BY a.tanggal ASC, a.waktu_mulai ASC
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
    res.status(500).json({ success: false, message: "Gagal mengambil agenda" });
  }
}

/**
 * GET /api/agenda/:id
 */
async function getAgendaById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query("SELECT * FROM agenda WHERE id = ?", {
      replacements: [id],
    });
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil agenda" });
  }
}

/**
 * POST /api/agenda
 */
async function createAgenda(req, res) {
  try {
    const { judul, deskripsi, tanggal, waktu_mulai, waktu_selesai, lokasi, status } = req.body;

    if (!judul || !tanggal) {
      return res.status(400).json({
        success: false,
        message: "Judul dan tanggal wajib diisi",
      });
    }

    await sequelize.query(
      `INSERT INTO agenda (judul, deskripsi, tanggal, waktu_mulai, waktu_selesai, lokasi, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          judul,
          deskripsi || null,
          tanggal,
          waktu_mulai || null,
          waktu_selesai || null,
          lokasi || null,
          status || "Terjadwal",
        ],
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({ success: true, data: { id: insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan agenda" });
  }
}

/**
 * PUT /api/agenda/:id
 */
async function updateAgenda(req, res) {
  try {
    const { id } = req.params;
    const { judul, deskripsi, tanggal, waktu_mulai, waktu_selesai, lokasi, status } = req.body;

    const [existing] = await sequelize.query("SELECT id FROM agenda WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Agenda tidak ditemukan" });
    }

    const fields = [];
    const replacements = [];

    if (judul !== undefined) { fields.push("judul = ?"); replacements.push(judul); }
    if (deskripsi !== undefined) { fields.push("deskripsi = ?"); replacements.push(deskripsi); }
    if (tanggal !== undefined) { fields.push("tanggal = ?"); replacements.push(tanggal); }
    if (waktu_mulai !== undefined) { fields.push("waktu_mulai = ?"); replacements.push(waktu_mulai); }
    if (waktu_selesai !== undefined) { fields.push("waktu_selesai = ?"); replacements.push(waktu_selesai); }
    if (lokasi !== undefined) { fields.push("lokasi = ?"); replacements.push(lokasi); }
    if (status !== undefined) { fields.push("status = ?"); replacements.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE agenda SET ${fields.join(", ")} WHERE id = ?`, { replacements });

    res.json({ success: true, message: "Agenda berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui agenda" });
  }
}

/**
 * DELETE /api/agenda/:id
 */
async function deleteAgenda(req, res) {
  try {
    const { id } = req.params;
    await sequelize.query("DELETE FROM agenda WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Agenda berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus agenda" });
  }
}

module.exports = {
  getAllAgenda,
  getAgendaById,
  createAgenda,
  updateAgenda,
  deleteAgenda,
};