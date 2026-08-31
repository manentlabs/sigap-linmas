const pool = require("../config/database");

// GET /api/kecamatan
async function getAllKecamatan(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nama, kabupaten_kota, peta_pos_x, peta_pos_y FROM kecamatan ORDER BY nama ASC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data kecamatan" });
  }
}

// GET /api/kecamatan/:id
async function getKecamatanById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM kecamatan WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail kecamatan" });
  }
}

// POST /api/kecamatan  body: { nama, kabupaten_kota, peta_pos_x, peta_pos_y }
async function createKecamatan(req, res) {
  try {
    const { nama, kabupaten_kota, peta_pos_x, peta_pos_y } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ success: false, message: "Nama kecamatan wajib diisi" });
    }

    const [existing] = await pool.query("SELECT id FROM kecamatan WHERE nama = ?", [nama.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Kecamatan dengan nama tersebut sudah ada" });
    }

    const [result] = await pool.query(
      `INSERT INTO kecamatan (nama, kabupaten_kota, peta_pos_x, peta_pos_y)
       VALUES (?, ?, ?, ?)`,
      [
        nama.trim(),
        kabupaten_kota || "Kabupaten",
        peta_pos_x !== undefined && peta_pos_x !== "" ? peta_pos_x : null,
        peta_pos_y !== undefined && peta_pos_y !== "" ? peta_pos_y : null,
      ]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, nama: nama.trim() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menambah kecamatan" });
  }
}

// PUT /api/kecamatan/:id
async function updateKecamatan(req, res) {
  try {
    const { id } = req.params;
    const { nama, kabupaten_kota, peta_pos_x, peta_pos_y } = req.body;

    const [existingRows] = await pool.query("SELECT * FROM kecamatan WHERE id = ?", [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan" });
    }

    if (nama && nama.trim() !== existingRows[0].nama) {
      const [dup] = await pool.query("SELECT id FROM kecamatan WHERE nama = ? AND id != ?", [nama.trim(), id]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: "Nama kecamatan sudah dipakai" });
      }
    }

    const fields = [];
    const params = [];

    if (nama) {
      fields.push("nama = ?");
      params.push(nama.trim());
    }
    if (kabupaten_kota) {
      fields.push("kabupaten_kota = ?");
      params.push(kabupaten_kota);
    }
    if (peta_pos_x !== undefined) {
      fields.push("peta_pos_x = ?");
      params.push(peta_pos_x === "" ? null : peta_pos_x);
    }
    if (peta_pos_y !== undefined) {
      fields.push("peta_pos_y = ?");
      params.push(peta_pos_y === "" ? null : peta_pos_y);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    params.push(id);
    await pool.query(`UPDATE kecamatan SET ${fields.join(", ")} WHERE id = ?`, params);

    res.json({ success: true, message: "Kecamatan berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui kecamatan" });
  }
}

// DELETE /api/kecamatan/:id
// Ditolak jika kecamatan masih dipakai oleh anggota (FK RESTRICT).
async function deleteKecamatan(req, res) {
  try {
    const { id } = req.params;

    const [dipakai] = await pool.query(
      "SELECT COUNT(*) AS total FROM anggota WHERE kecamatan_id = ?",
      [id]
    );
    if (dipakai[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: "Kecamatan tidak bisa dihapus karena masih dipakai oleh anggota",
      });
    }

    const [result] = await pool.query("DELETE FROM kecamatan WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan" });
    }

    res.json({ success: true, message: "Kecamatan berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus kecamatan" });
  }
}

// GET /api/kecamatan/stats/jumlah-desa
// Menghitung jumlah desa unik per kecamatan dari kolom desa_id di tabel anggota
async function getJumlahDesaPerKecamatan(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT k.id AS kecamatan_id, k.nama AS kecamatan_nama,
              COUNT(DISTINCT CASE WHEN a.desa_id IS NOT NULL AND a.desa_id != 0
                                   THEN a.desa_id END) AS jumlah_desa
       FROM kecamatan k
       LEFT JOIN anggota a ON a.kecamatan_id = k.id
       GROUP BY k.id, k.nama
       ORDER BY k.nama ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil jumlah desa per kecamatan" });
  }
}

module.exports = {
  getAllKecamatan,
  getKecamatanById,
  createKecamatan,
  updateKecamatan,
  deleteKecamatan,
  getJumlahDesaPerKecamatan, // <-- BARU
};