const sequelize = require("../config/database");
const { hapusFileFotoAbsensi } = require("../middleware/uploadAbsensi");

function urlFotoBaru(file) {
  return file ? `/uploads/absensi/${file.filename}` : null;
}

// =============================================================================
// GET /api/absensi
// Mendapatkan daftar absensi dengan filter & pagination
// Role:
//   - admin / kepala_satgas : semua data
//   - non_p3k              : hanya milik sendiri (anggota_id = user.anggota_id)
//   - operator_kecamatan   : hanya anggota di kecamatan yang sama (user.kecamatan_id)
// =============================================================================
async function getAllAbsensi(req, res) {
  try {
    const user = req.user; // dari middleware verifyToken
    const { role, anggota_id: userAnggotaId, kecamatan_id: userKecamatanId } = user;

    const {
      page = 1,
      limit = 25,
      tanggal,
      status,
      anggota_id,
      q,
      sort = "terbaru",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    // --- Filter dasar ---
    if (tanggal) {
      where.push("a.tanggal = ?");
      replacements.push(tanggal);
    }
    if (status) {
      where.push("a.status = ?");
      replacements.push(status);
    }
    if (anggota_id) {
      where.push("a.anggota_id = ?");
      replacements.push(anggota_id);
    }
    if (q) {
      where.push("(ag.nama LIKE ? OR ag.kode_anggota LIKE ? OR ag.nik LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // --- Filter berdasarkan role ---
    if (role === "non_p3k") {
      if (!userAnggotaId) {
        return res.status(400).json({ success: false, message: "Data anggota tidak ditemukan untuk akun ini" });
      }
      where.push("a.anggota_id = ?");
      replacements.push(userAnggotaId);
    } else if (role === "operator_kecamatan") {
      if (!userKecamatanId) {
        return res.status(400).json({ success: false, message: "Kecamatan tidak ditemukan untuk operator ini" });
      }
      // Filter berdasarkan kecamatan_id dari tabel anggota
      where.push("ag.kecamatan_id = ?");
      replacements.push(userKecamatanId);
    }
    // admin dan kepala_satgas: tanpa filter tambahan

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Sorting
    let orderSQL = "ORDER BY a.tanggal DESC, a.jam_masuk DESC";
    if (sort === "terlama") orderSQL = "ORDER BY a.tanggal ASC, a.jam_masuk ASC";
    else if (sort === "nama") orderSQL = "ORDER BY ag.nama ASC, a.tanggal DESC";

    // Total
    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) AS total 
       FROM absensi a 
       JOIN anggota ag ON ag.id = a.anggota_id 
       ${whereSQL}`,
      { replacements }
    );
    const total = countRows[0].total;

    // Data
    const [rows] = await sequelize.query(
      `SELECT a.id, a.anggota_id, a.tanggal, a.jam_masuk, a.jam_keluar,
              a.status, a.lokasi_checkin, a.lokasi_checkout,
              a.foto_masuk, a.foto_keluar, a.catatan, a.created_at,
              ag.kode_anggota, ag.nama AS anggota_nama, ag.nik,
              k.nama AS kecamatan_nama
       FROM absensi a
       JOIN anggota ag ON ag.id = a.anggota_id
       LEFT JOIN kecamatan k ON k.id = ag.kecamatan_id
       ${whereSQL}
       ${orderSQL}
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
    res.status(500).json({ success: false, message: "Gagal mengambil data absensi" });
  }
}

// =============================================================================
// GET /api/absensi/:id
// Detail satu data absensi
// Role:
//   - admin / kepala_satgas : boleh lihat semua
//   - non_p3k              : hanya jika milik sendiri
//   - operator_kecamatan   : hanya jika anggota berada di kecamatan yang sama
// =============================================================================
async function getAbsensiById(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    // Ambil data absensi + informasi anggota
    const [rows] = await sequelize.query(
      `SELECT a.*, ag.kode_anggota, ag.nama AS anggota_nama, ag.nik,
              ag.kecamatan_id, k.nama AS kecamatan_nama
       FROM absensi a
       JOIN anggota ag ON ag.id = a.anggota_id
       LEFT JOIN kecamatan k ON k.id = ag.kecamatan_id
       WHERE a.id = ?`,
      { replacements: [id] }
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan" });
    }

    const data = rows[0];

    // --- Validasi akses berdasarkan role ---
    if (user.role === "non_p3k") {
      if (data.anggota_id !== user.anggota_id) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke data ini" });
      }
    } else if (user.role === "operator_kecamatan") {
      if (data.kecamatan_id !== user.kecamatan_id) {
        return res.status(403).json({ success: false, message: "Anda hanya dapat melihat data di kecamatan Anda" });
      }
    }
    // admin dan kepala_satgas: bebas

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail absensi" });
  }
}

// =============================================================================
// POST /api/absensi
// Membuat data absensi manual (hanya admin & kepala_satgas)
// =============================================================================
async function createAbsensi(req, res) {
  const files = req.files || {};
  try {
    const user = req.user;
    // Hanya admin & kepala_satgas yang boleh membuat absensi manual
    if (!["admin", "kepala_satgas"].includes(user.role)) {
      hapusFileUploadGagal(files);
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin untuk membuat absensi" });
    }

    let {
      anggota_id,
      tanggal,
      jam_masuk,
      jam_keluar,
      status: absensiStatus = "Hadir",
      lokasi_checkin,
      lokasi_checkout,
      catatan,
    } = req.body;

    if (!anggota_id) {
      hapusFileUploadGagal(files);
      return res.status(400).json({ success: false, message: "anggota_id wajib diisi" });
    }

    // Default tanggal & jam masuk jika tidak diisi
    if (!tanggal) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      tanggal = `${yyyy}-${mm}-${dd}`;
    }

    if (!jam_masuk) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      jam_masuk = `${hh}:${min}:${ss}`;
    }

    const validStatus = ["Hadir", "Izin", "Sakit", "Alpha"];
    if (!validStatus.includes(absensiStatus)) {
      hapusFileUploadGagal(files);
      return res.status(400).json({
        success: false,
        message: `Status harus salah satu dari: ${validStatus.join(", ")}`,
      });
    }

    // Cek anggota
    const [anggotaRows] = await sequelize.query("SELECT id FROM anggota WHERE id = ?", {
      replacements: [anggota_id],
    });
    if (anggotaRows.length === 0) {
      hapusFileUploadGagal(files);
      return res.status(400).json({ success: false, message: "Anggota tidak ditemukan" });
    }

    // Cek duplikasi
    const [dup] = await sequelize.query(
      "SELECT id FROM absensi WHERE anggota_id = ? AND tanggal = ?",
      { replacements: [anggota_id, tanggal] }
    );
    if (dup.length > 0) {
      hapusFileUploadGagal(files);
      return res.status(409).json({
        success: false,
        message: "Absensi untuk anggota ini pada tanggal tersebut sudah ada",
      });
    }

    const foto_masuk = urlFotoBaru(files.foto_masuk?.[0]);
    const foto_keluar = urlFotoBaru(files.foto_keluar?.[0]);

    await sequelize.query(
      `INSERT INTO absensi
        (anggota_id, tanggal, jam_masuk, jam_keluar, status,
         lokasi_checkin, lokasi_checkout, foto_masuk, foto_keluar, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          anggota_id,
          tanggal,
          jam_masuk,
          jam_keluar || null,
          absensiStatus,
          lokasi_checkin || null,
          lokasi_checkout || null,
          foto_masuk,
          foto_keluar,
          catatan || null,
        ],
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");
    res.status(201).json({
      success: true,
      data: { id: insertId, tanggal, jam_masuk, foto_masuk, foto_keluar },
    });
  } catch (err) {
    hapusFileUploadGagal(files);
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Absensi sudah tercatat untuk anggota dan tanggal ini" });
    }
    res.status(500).json({ success: false, message: "Gagal menyimpan data absensi" });
  }
}

// =============================================================================
// PUT /api/absensi/:id
// Memperbarui data absensi (hanya admin & kepala_satgas)
// =============================================================================
async function updateAbsensi(req, res) {
  const files = req.files || {};
  try {
    const user = req.user;
    if (!["admin", "kepala_satgas"].includes(user.role)) {
      hapusFileUploadGagal(files);
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin untuk mengubah absensi" });
    }

    const { id } = req.params;
    const { jam_masuk, jam_keluar, status, lokasi_checkin, lokasi_checkout, catatan } = req.body;

    const [existing] = await sequelize.query("SELECT * FROM absensi WHERE id = ?", {
      replacements: [id],
    });
    if (existing.length === 0) {
      hapusFileUploadGagal(files);
      return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan" });
    }

    const fields = [];
    const replacements = [];

    const maybeSet = (col, val) => {
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        replacements.push(val);
      }
    };

    maybeSet("jam_masuk", jam_masuk);
    maybeSet("jam_keluar", jam_keluar);
    if (status) {
      const validStatus = ["Hadir", "Izin", "Sakit", "Alpha"];
      if (!validStatus.includes(status)) {
        hapusFileUploadGagal(files);
        return res.status(400).json({
          success: false,
          message: `Status harus salah satu dari: ${validStatus.join(", ")}`,
        });
      }
      maybeSet("status", status);
    }
    maybeSet("lokasi_checkin", lokasi_checkin);
    maybeSet("lokasi_checkout", lokasi_checkout);
    maybeSet("catatan", catatan);

    // Ganti foto_masuk jika ada file baru
    if (files.foto_masuk?.[0]) {
      if (existing[0].foto_masuk) hapusFileFotoAbsensi(existing[0].foto_masuk);
      maybeSet("foto_masuk", urlFotoBaru(files.foto_masuk[0]));
    }
    // Ganti foto_keluar jika ada file baru
    if (files.foto_keluar?.[0]) {
      if (existing[0].foto_keluar) hapusFileFotoAbsensi(existing[0].foto_keluar);
      maybeSet("foto_keluar", urlFotoBaru(files.foto_keluar[0]));
    }

    if (fields.length === 0) {
      hapusFileUploadGagal(files);
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE absensi SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Data absensi berhasil diperbarui" });
  } catch (err) {
    hapusFileUploadGagal(files);
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui data absensi" });
  }
}

// =============================================================================
// DELETE /api/absensi/:id
// Menghapus data absensi (hanya admin & kepala_satgas)
// =============================================================================
async function deleteAbsensi(req, res) {
  try {
    const user = req.user;
    if (!["admin", "kepala_satgas"].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin untuk menghapus absensi" });
    }

    const { id } = req.params;
    const [rows] = await sequelize.query(
      "SELECT id, foto_masuk, foto_keluar FROM absensi WHERE id = ?",
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan" });
    }

    hapusFileFotoAbsensi(rows[0].foto_masuk);
    hapusFileFotoAbsensi(rows[0].foto_keluar);

    await sequelize.query("DELETE FROM absensi WHERE id = ?", {
      replacements: [id],
    });
    res.json({ success: true, message: "Data absensi berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus data absensi" });
  }
}

// =============================================================================
// POST /api/absensi/checkin  (untuk anggota sendiri)
// =============================================================================
async function checkinAnggota(req, res) {
  try {
    const user = req.user;
    const anggota_id = user.anggota_id || user.id;
    if (!anggota_id) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menemukan data anggota dari akun ini",
      });
    }

    // Pastikan role yang login adalah non_p3k (atau bisa juga untuk role lain yang memiliki anggota_id)
    // Jika role lain (admin/kepala_satgas) ingin checkin, bisa diizinkan atau tidak?
    // Untuk saat ini kita izinkan semua yang punya anggota_id

    const [anggotaRows] = await sequelize.query(
      "SELECT id, nama FROM anggota WHERE id = ?",
      { replacements: [anggota_id] }
    );
    if (anggotaRows.length === 0) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      return res.status(400).json({ success: false, message: "Data anggota tidak ditemukan" });
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const tanggal = `${yyyy}-${mm}-${dd}`;

    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const jam_masuk = `${hh}:${min}:${ss}`;

    // Cek apakah sudah ada baris untuk hari ini
    const [existing] = await sequelize.query(
      "SELECT id, jam_masuk, jam_keluar FROM absensi WHERE anggota_id = ? AND tanggal = ?",
      { replacements: [anggota_id, tanggal] }
    );

    if (existing.length > 0) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      const data = existing[0];
      if (data.jam_masuk && !data.jam_keluar) {
        return res.status(409).json({
          success: false,
          message: "Anda sudah absen masuk. Silakan lakukan absen pulang.",
          data: { id: data.id, jam_masuk: data.jam_masuk },
        });
      } else if (data.jam_masuk && data.jam_keluar) {
        return res.status(409).json({
          success: false,
          message: "Anda sudah absen masuk dan pulang hari ini.",
          data: { id: data.id, jam_masuk: data.jam_masuk, jam_keluar: data.jam_keluar },
        });
      }
    }

    let lokasi_checkin = req.body.lokasi || null;
    if (!lokasi_checkin) {
      lokasi_checkin = req.ip || "Web Check-in";
    }

    const foto_masuk = urlFotoBaru(req.file);

    await sequelize.query(
      `INSERT INTO absensi (anggota_id, tanggal, jam_masuk, status, lokasi_checkin, foto_masuk)
       VALUES (?, ?, ?, 'Hadir', ?, ?)`,
      { replacements: [anggota_id, tanggal, jam_masuk, lokasi_checkin, foto_masuk] }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({
      success: true,
      message: "Absen masuk berhasil",
      data: {
        id: insertId,
        anggota_id,
        nama: anggotaRows[0].nama,
        tanggal,
        jam_masuk,
        lokasi: lokasi_checkin,
        foto_masuk,
      },
    });
  } catch (err) {
    if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Anda sudah absen hari ini" });
    }
    res.status(500).json({ success: false, message: "Gagal melakukan absensi" });
  }
}

// =============================================================================
// POST /api/absensi/checkout (untuk anggota sendiri)
// =============================================================================
async function checkoutAnggota(req, res) {
  try {
    const user = req.user;
    const anggota_id = user.anggota_id || user.id;
    if (!anggota_id) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menemukan data anggota dari akun ini",
      });
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const tanggal = `${yyyy}-${mm}-${dd}`;

    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const jam_keluar = `${hh}:${min}:${ss}`;

    // Cari baris hari ini
    const [rows] = await sequelize.query(
      "SELECT id, jam_masuk, jam_keluar, lokasi_checkin FROM absensi WHERE anggota_id = ? AND tanggal = ?",
      { replacements: [anggota_id, tanggal] }
    );

    if (rows.length === 0) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      return res.status(400).json({
        success: false,
        message: "Anda belum melakukan absen masuk hari ini",
      });
    }

    const data = rows[0];
    if (data.jam_keluar) {
      if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
      return res.status(409).json({
        success: false,
        message: "Anda sudah absen pulang hari ini",
      });
    }

    let lokasi_checkout = req.body.lokasi || null;
    if (!lokasi_checkout) {
      lokasi_checkout = req.ip || "Web Check-in";
    }

    const foto_keluar = urlFotoBaru(req.file);

    await sequelize.query(
      "UPDATE absensi SET jam_keluar = ?, lokasi_checkout = ?, foto_keluar = ? WHERE id = ?",
      { replacements: [jam_keluar, lokasi_checkout, foto_keluar, data.id] }
    );

    res.json({
      success: true,
      message: "Absen pulang berhasil",
      data: {
        id: data.id,
        jam_masuk: data.jam_masuk,
        jam_keluar,
        lokasi_checkin: data.lokasi_checkin,
        lokasi_checkout,
        foto_keluar,
      },
    });
  } catch (err) {
    if (req.file) hapusFileFotoAbsensi(urlFotoBaru(req.file));
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal melakukan absen pulang" });
  }
}

// =============================================================================
// GET /api/absensi/riwayat (untuk anggota sendiri)
// =============================================================================
async function getRiwayatAnggota(req, res) {
  try {
    const user = req.user;
    const anggota_id = user.anggota_id || user.id;
    if (!anggota_id) {
      return res.status(400).json({ success: false, message: "Data anggota tidak ditemukan" });
    }

    const {
      page = 1,
      limit = 20,
      status,
      bulan,
      tahun,
      sort = "terbaru",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = ["a.anggota_id = ?"];
    const replacements = [anggota_id];

    if (status) {
      where.push("a.status = ?");
      replacements.push(status);
    }
    if (bulan) {
      where.push("DATE_FORMAT(a.tanggal, '%Y-%m') = ?");
      replacements.push(bulan);
    } else if (tahun) {
      where.push("YEAR(a.tanggal) = ?");
      replacements.push(tahun);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM absensi a ${whereSQL}`,
      { replacements }
    );

    const orderSQL =
      sort === "terlama"
        ? "ORDER BY a.tanggal ASC, a.jam_masuk ASC"
        : "ORDER BY a.tanggal DESC, a.jam_masuk DESC";

    const [rows] = await sequelize.query(
      `SELECT a.id, a.tanggal, a.jam_masuk, a.jam_keluar, a.status,
              a.lokasi_checkin, a.lokasi_checkout, a.foto_masuk, a.foto_keluar, a.catatan
       FROM absensi a
       ${whereSQL}
       ${orderSQL}
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
    res.status(500).json({ success: false, message: "Gagal mengambil riwayat absensi" });
  }
}

// =============================================================================
// GET /api/absensi/today (untuk anggota sendiri)
// =============================================================================
async function getAbsensiToday(req, res) {
  try {
    const user = req.user;
    const anggota_id = user.anggota_id || user.id;
    if (!anggota_id) {
      return res.status(400).json({ success: false, message: "Data anggota tidak ditemukan" });
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const tanggal = `${yyyy}-${mm}-${dd}`;

    const [rows] = await sequelize.query(
      `SELECT id, tanggal, jam_masuk, jam_keluar, status,
              lokasi_checkin, lokasi_checkout, foto_masuk, foto_keluar
       FROM absensi
       WHERE anggota_id = ? AND tanggal = ?
       LIMIT 1`,
      { replacements: [anggota_id, tanggal] }
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data absensi hari ini" });
  }
}

// =============================================================================
// Helper: hapus file upload jika gagal validasi (mode fields)
// =============================================================================
function hapusFileUploadGagal(files) {
  if (!files) return;
  ["foto_masuk", "foto_keluar"].forEach((field) => {
    (files[field] || []).forEach((f) => hapusFileFotoAbsensi(`/uploads/absensi/${f.filename}`));
  });
}

module.exports = {
  getAllAbsensi,
  getAbsensiById,
  createAbsensi,
  updateAbsensi,
  deleteAbsensi,
  checkinAnggota,
  checkoutAnggota,
  getRiwayatAnggota,
  getAbsensiToday,
};