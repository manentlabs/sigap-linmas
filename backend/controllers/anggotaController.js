const sequelize = require("../config/database"); // instance Sequelize langsung
const { hapusFileFoto } = require("../middleware/uploadAnggota");

async function generateKodeAnggota() {
  const [rows] = await sequelize.query(
    "SELECT kode_anggota FROM anggota ORDER BY id DESC LIMIT 1"
  );
  if (rows.length === 0) return "LM-1000";
  const last = rows[0].kode_anggota;
  const num = parseInt(last.split("-")[1], 10) || 999;
  return `LM-${num + 1}`;
}

// GET /api/anggota?page=&limit=&kecamatan_id=&status=&bpjs_status=&q=&sort=
async function getAllAnggota(req, res) {
  try {
    const {
      kecamatan_id,
      status,
      bpjs_status,
      q,
      sort,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (kecamatan_id) {
      where.push("a.kecamatan_id = ?");
      replacements.push(kecamatan_id);
    }
    if (status) {
      where.push("a.status = ?");
      replacements.push(status);
    }
    if (bpjs_status) {
      where.push("a.bpjs_status = ?");
      replacements.push(bpjs_status);
    }
    if (q) {
      where.push("(a.nama LIKE ? OR a.kode_anggota LIKE ? OR a.nik LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSql =
      sort === "nama" ? "ORDER BY a.nama ASC" : "ORDER BY a.created_at DESC";

    // Total data
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM anggota a ${whereSql}`,
      { replacements }
    );
    const total = countRows[0].total;

    // Ambil data
    const [rows] = await sequelize.query(
      `SELECT a.id, a.kode_anggota, a.nama, a.nik, a.jenis_kelamin,
              a.tempat_lahir, a.tanggal_lahir, a.alamat, a.no_hp,
              a.kecamatan_id, k.nama AS kecamatan_nama,
              a.tanggal_bergabung, a.status, a.bpjs_status,
              a.foto_url, a.created_at
       FROM anggota a
       JOIN kecamatan k ON k.id = a.kecamatan_id
       ${whereSql}
       ${orderSql}
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
    res.status(500).json({ success: false, message: "Gagal mengambil data anggota" });
  }
}

// GET /api/anggota/:id
async function getAnggotaById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query(
      `SELECT a.*, k.nama AS kecamatan_nama
       FROM anggota a
       JOIN kecamatan k ON k.id = a.kecamatan_id
       WHERE a.id = ?`,
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Anggota tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail anggota" });
  }
}

// GET /api/anggota/stats/ringkasan
async function getRingkasanAnggota(req, res) {
  try {
    const [[total]] = await sequelize.query("SELECT COUNT(*) AS total FROM anggota");
    const [[aktif]] = await sequelize.query(
      "SELECT COUNT(*) AS total FROM anggota WHERE status = 'Aktif'"
    );
    const [[bpjsAktif]] = await sequelize.query(
      "SELECT COUNT(*) AS total FROM anggota WHERE bpjs_status = 'Aktif'"
    );
    res.json({
      success: true,
      data: {
        total_anggota: total.total,
        anggota_aktif: aktif.total,
        bpjs_aktif: bpjsAktif.total,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil ringkasan anggota" });
  }
}

// POST /api/anggota (multipart/form-data)
async function createAnggota(req, res) {
  try {
    const {
      nama,
      nik,
      jenis_kelamin,
      tempat_lahir,
      tanggal_lahir,
      alamat,
      no_hp,
      kecamatan_id,
      tanggal_bergabung,
      status,
      bpjs_status,
    } = req.body;

    if (!nama || !nik || !jenis_kelamin || !kecamatan_id || !tanggal_bergabung) {
      return res.status(400).json({
        success: false,
        message: "Nama, NIK, jenis kelamin, kecamatan, dan tanggal bergabung wajib diisi",
      });
    }

    if (!["L", "P"].includes(jenis_kelamin)) {
      return res.status(400).json({ success: false, message: "Jenis kelamin harus L atau P" });
    }

    const [existingNik] = await sequelize.query("SELECT id FROM anggota WHERE nik = ?", {
      replacements: [nik],
    });
    if (existingNik.length > 0) {
      return res.status(409).json({ success: false, message: "NIK sudah terdaftar" });
    }

    const kodeAnggota = await generateKodeAnggota();
    const fotoUrl = req.file ? `/uploads/anggota/${req.file.filename}` : null;

    // INSERT dan ambil insertId
    await sequelize.query(
      `INSERT INTO anggota
        (kode_anggota, nama, nik, jenis_kelamin, tempat_lahir, tanggal_lahir,
         alamat, no_hp, kecamatan_id, tanggal_bergabung, status, bpjs_status, foto_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          kodeAnggota,
          nama,
          nik,
          jenis_kelamin,
          tempat_lahir || null,
          tanggal_lahir || null,
          alamat || null,
          no_hp || null,
          kecamatan_id,
          tanggal_bergabung,
          status || "Aktif",
          bpjs_status || "Belum Terdaftar",
          fotoUrl,
        ],
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({
      success: true,
      data: { id: insertId, kode_anggota: kodeAnggota },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan data anggota" });
  }
}

// PUT /api/anggota/:id
async function updateAnggota(req, res) {
  try {
    const { id } = req.params;
    const {
      nama,
      nik,
      jenis_kelamin,
      tempat_lahir,
      tanggal_lahir,
      alamat,
      no_hp,
      kecamatan_id,
      tanggal_bergabung,
      status,
      bpjs_status,
    } = req.body;

    const [existingRows] = await sequelize.query("SELECT * FROM anggota WHERE id = ?", {
      replacements: [id],
    });
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Anggota tidak ditemukan" });
    }
    const existing = existingRows[0];

    if (nik && nik !== existing.nik) {
      const [dup] = await sequelize.query(
        "SELECT id FROM anggota WHERE nik = ? AND id != ?",
        { replacements: [nik, id] }
      );
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: "NIK sudah dipakai anggota lain" });
      }
    }

    if (jenis_kelamin && !["L", "P"].includes(jenis_kelamin)) {
      return res.status(400).json({ success: false, message: "Jenis kelamin harus L atau P" });
    }

    const fields = [];
    const replacements = [];

    const maybeSet = (col, val) => {
      if (val !== undefined && val !== "") {
        fields.push(`${col} = ?`);
        replacements.push(val);
      }
    };

    maybeSet("nama", nama);
    maybeSet("nik", nik);
    maybeSet("jenis_kelamin", jenis_kelamin);
    maybeSet("tempat_lahir", tempat_lahir);
    maybeSet("tanggal_lahir", tanggal_lahir);
    maybeSet("alamat", alamat);
    maybeSet("no_hp", no_hp);
    maybeSet("kecamatan_id", kecamatan_id);
    maybeSet("tanggal_bergabung", tanggal_bergabung);
    maybeSet("status", status);
    maybeSet("bpjs_status", bpjs_status);

    if (req.file) {
      fields.push("foto_url = ?");
      replacements.push(`/uploads/anggota/${req.file.filename}`);
      hapusFileFoto(existing.foto_url);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE anggota SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Data anggota berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui data anggota" });
  }
}

// PATCH /api/anggota/:id/status
async function updateStatusAnggota(req, res) {
  try {
    const { id } = req.params;
    const { status, bpjs_status } = req.body;

    if (!status && !bpjs_status) {
      return res.status(400).json({ success: false, message: "status atau bpjs_status wajib diisi" });
    }

    const fields = [];
    const replacements = [];
    if (status) {
      fields.push("status = ?");
      replacements.push(status);
    }
    if (bpjs_status) {
      fields.push("bpjs_status = ?");
      replacements.push(bpjs_status);
    }
    replacements.push(id);

    const [result] = await sequelize.query(
      `UPDATE anggota SET ${fields.join(", ")} WHERE id = ?`,
      { replacements }
    );

    // Sequelize raw UPDATE tidak mengembalikan affectedRows secara langsung, tapi bisa dicek
    // Kita bisa tangkap hasilnya untuk cek perubahan (opsional)
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Anggota tidak ditemukan" });
    }

    res.json({ success: true, message: "Status anggota berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui status anggota" });
  }
}

// DELETE /api/anggota/:id
async function deleteAnggota(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query("SELECT foto_url FROM anggota WHERE id = ?", {
      replacements: [id],
    });
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Anggota tidak ditemukan" });
    }
    await sequelize.query("DELETE FROM anggota WHERE id = ?", {
      replacements: [id],
    });
    hapusFileFoto(rows[0].foto_url);
    res.json({ success: true, message: "Data anggota berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus data anggota" });
  }
}

module.exports = {
  getAllAnggota,
  getAnggotaById,
  getRingkasanAnggota,
  createAnggota,
  updateAnggota,
  updateStatusAnggota,
  deleteAnggota,
};