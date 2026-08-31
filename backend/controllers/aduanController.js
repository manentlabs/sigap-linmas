const sequelize = require("../config/database");

/**
 * GET /api/aduan
 */
async function getAllAduan(req, res) {
  try {
    const { status, kategori_id, q, page = 1, limit = 25 } = req.query;

    const offset = (page - 1) * limit;

    let where = [];
    let replacements = [];

    if (status) {
      where.push("status = ?");
      replacements.push(status);
    }

    if (kategori_id) {
      where.push("kategori_id = ?");
      replacements.push(kategori_id);
    }

    if (q) {
      where.push("(kode_aduan LIKE ? OR isi LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const [count] = await sequelize.query(
      `SELECT COUNT(*) total FROM aduan ${whereSql}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT *
       FROM aduan
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${parseInt(limit)}
       OFFSET ${parseInt(offset)}`,
      { replacements }
    );

    res.json({
      success: true,
      data: rows,
      total: count[0].total,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success:false,
      message:"Gagal mengambil data"
    });
  }
}

/**
 * GET DETAIL
 */
async function getAduanById(req,res){
  try{

    const [rows]=await sequelize.query(
      "SELECT * FROM aduan WHERE id=?",
      {
        replacements:[req.params.id]
      }
    );

    if(rows.length==0){
      return res.status(404).json({
        success:false,
        message:"Data tidak ditemukan"
      });
    }

    res.json({
      success:true,
      data:rows[0]
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      success:false,
      message:"Terjadi kesalahan"
    });
  }
}

/**
 * CREATE
 */
async function createAduan(req,res){

  try{

    const {
      kode_aduan,
      anggota_id,
      kategori_id,
      isi,
      tanggal,
      status,
      ditindak_oleh,
      tanggal_selesai,
      catatan_tindak_lanjut
    } = req.body;

    await sequelize.query(
      `INSERT INTO aduan
      (
        kode_aduan,
        anggota_id,
        kategori_id,
        isi,
        tanggal,
        status,
        ditindak_oleh,
        tanggal_selesai,
        catatan_tindak_lanjut,
        created_at
      )
      VALUES
      (?,?,?,?,?,?,?,?,?,NOW())`,
      {
        replacements:[
          kode_aduan,
          anggota_id,
          kategori_id,
          isi,
          tanggal,
          status || 'Baru',
          ditindak_oleh,
          tanggal_selesai,
          catatan_tindak_lanjut
        ]
      }
    );

    const [[last]] = await sequelize.query(
      "SELECT LAST_INSERT_ID() id"
    );

    res.status(201).json({
      success:true,
      id:last.id
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      success:false,
      message:"Gagal menyimpan data"
    });
  }

}

/**
 * UPDATE
 */
async function updateAduan(req,res){

  try{

    const {id}=req.params;

    const {
      kode_aduan,
      anggota_id,
      kategori_id,
      isi,
      tanggal,
      status,
      ditindak_oleh,
      tanggal_selesai,
      catatan_tindak_lanjut
    }=req.body;

    await sequelize.query(
      `UPDATE aduan
      SET
      kode_aduan=?,
      anggota_id=?,
      kategori_id=?,
      isi=?,
      tanggal=?,
      status=?,
      ditindak_oleh=?,
      tanggal_selesai=?,
      catatan_tindak_lanjut=?
      WHERE id=?`,
      {
        replacements:[
          kode_aduan,
          anggota_id,
          kategori_id,
          isi,
          tanggal,
          status,
          ditindak_oleh,
          tanggal_selesai,
          catatan_tindak_lanjut,
          id
        ]
      }
    );

    res.json({
      success:true,
      message:"Data berhasil diubah"
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      success:false,
      message:"Gagal mengubah data"
    });
  }

}

/**
 * DELETE
 */
async function deleteAduan(req,res){

  try{

    await sequelize.query(
      "DELETE FROM aduan WHERE id=?",
      {
        replacements:[req.params.id]
      }
    );

    res.json({
      success:true,
      message:"Data berhasil dihapus"
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      success:false,
      message:"Gagal menghapus data"
    });
  }

}

module.exports = {
  getAllAduan,
  getAduanById,
  createAduan,
  updateAduan,
  deleteAduan
};