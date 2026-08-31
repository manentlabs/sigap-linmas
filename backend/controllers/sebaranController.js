const sequelize = require("../config/database"); // instance Sequelize langsung

/**
 * GET /api/sebaran
 * Mengembalikan seluruh data anggota (tanpa paginasi) untuk keperluan peta dan grafik.
 * Field yang dikirim: id, kode_anggota, nama, kecamatan, jenis_kelamin, status, bpjs_status, tanggal_lahir
 */
async function getDataSebaran(req, res) {
  try {
    const [rows] = await sequelize.query(
      `SELECT 
        a.id,
        a.kode_anggota,
        a.nama,
        k.nama AS kecamatan,
        a.jenis_kelamin,
        a.status,
        a.keterangan,
        a.tanggal_lahir
      FROM anggota a
      LEFT JOIN kecamatan k ON k.id = a.kecamatan_id
      ORDER BY a.created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Gagal mengambil data sebaran:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data sebaran",
    });
  }
}

module.exports = { getDataSebaran };