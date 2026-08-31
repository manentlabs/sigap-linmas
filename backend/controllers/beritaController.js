// controller/beritaController.js
const sequelize = require("../config/database");
const { hapusFileGambar } = require("../middleware/uploadBerita");

function slugify(str) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(judul, excludeId = null) {
  const base = slugify(judul) || "berita";
  let slug = base;
  let counter = 2;

  while (true) {
    let query, replacements;
    if (excludeId) {
      query = "SELECT id FROM berita WHERE slug = ? AND id != ?";
      replacements = [slug, excludeId];
    } else {
      query = "SELECT id FROM berita WHERE slug = ?";
      replacements = [slug];
    }
    const [rows] = await sequelize.query(query, { replacements });
    if (rows.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

async function getAllBerita(req, res) {
  try {
    const {
      tahun,
      kategori_id,
      q,
      status,
      sort,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (tahun) {
      where.push("YEAR(b.tanggal_publish) = ?");
      replacements.push(tahun);
    }
    if (kategori_id) {
      where.push("b.kategori_id = ?");
      replacements.push(kategori_id);
    }
    if (q) {
      where.push("b.judul LIKE ?");
      replacements.push(`%${q}%`);
    }
    if (status === "published") {
      where.push("b.is_published = 1");
    } else if (status === "draft") {
      where.push("b.is_published = 0");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSql = sort === "asc" ? "ORDER BY b.tanggal_publish ASC" : "ORDER BY b.tanggal_publish DESC";

    // Hitung total
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total
       FROM berita b
       JOIN kategori_berita k ON k.id = b.kategori_id
       ${whereSql}`,
      { replacements }
    );
    const total = countResult[0].total;

    // Ambil data
    const [rows] = await sequelize.query(
      `SELECT b.id, b.judul, b.slug, b.kategori_id, k.nama AS kategori_nama,
              b.ringkasan, b.gambar_url, b.tanggal_publish, b.is_published,
              b.penulis_id, b.created_at
       FROM berita b
       JOIN kategori_berita k ON k.id = b.kategori_id
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
    res.status(500).json({ success: false, message: "Gagal mengambil data berita" });
  }
}

async function getTahunList(req, res) {
  try {
    const [rows] = await sequelize.query(
      "SELECT DISTINCT YEAR(tanggal_publish) AS tahun FROM berita ORDER BY tahun DESC"
    );
    res.json({ success: true, data: rows.map((r) => r.tahun) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil daftar tahun" });
  }
}

async function getBeritaById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query(
      `SELECT b.*, k.nama AS kategori_nama
       FROM berita b
       JOIN kategori_berita k ON k.id = b.kategori_id
       WHERE b.id = ?`,
      { replacements: [id] }
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail berita" });
  }
}

async function createBerita(req, res) {
  try {
    const { judul, kategori_id, ringkasan, konten, tanggal_publish, is_published } = req.body;

    if (!judul || !kategori_id || !ringkasan || !tanggal_publish) {
      return res.status(400).json({
        success: false,
        message: "Judul, kategori, ringkasan, dan tanggal publish wajib diisi",
      });
    }

    const slug = await generateUniqueSlug(judul);
    const gambarUrl = req.file ? `/uploads/berita/${req.file.filename}` : null;
    const penulisId = req.user?.id || null;

    // Sequelize INSERT: gunakan query INSERT dan ambil insertId
    const [result] = await sequelize.query(
      `INSERT INTO berita
        (judul, slug, kategori_id, ringkasan, konten, gambar_url, tanggal_publish, penulis_id, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          judul,
          slug,
          kategori_id,
          ringkasan,
          konten || null,
          gambarUrl,
          tanggal_publish,
          penulisId,
          is_published === "false" || is_published === "0" ? 0 : 1,
        ],
      }
    );

    // Setelah INSERT, kita ingin mendapatkan ID yang baru dibuat.
    // Catatan: Sequelize untuk raw INSERT biasanya tidak mengembalikan insertId secara langsung,
    // tergantung driver dan pengaturan. Untuk mendapatkan ID, bisa melakukan SELECT LAST_INSERT_ID().
    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");

    res.status(201).json({ success: true, data: { id: insertId, slug } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan berita" });
  }
}

async function updateBerita(req, res) {
  try {
    const { id } = req.params;
    const { judul, kategori_id, ringkasan, konten, tanggal_publish, is_published } = req.body;

    const [existingRows] = await sequelize.query("SELECT * FROM berita WHERE id = ?", {
      replacements: [id],
    });
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }
    const existing = existingRows[0];

    const fields = [];
    const replacements = [];

    if (judul && judul !== existing.judul) {
      const slug = await generateUniqueSlug(judul, id);
      fields.push("judul = ?", "slug = ?");
      replacements.push(judul, slug);
    }
    if (kategori_id) {
      fields.push("kategori_id = ?");
      replacements.push(kategori_id);
    }
    if (ringkasan) {
      fields.push("ringkasan = ?");
      replacements.push(ringkasan);
    }
    if (konten !== undefined) {
      fields.push("konten = ?");
      replacements.push(konten);
    }
    if (tanggal_publish) {
      fields.push("tanggal_publish = ?");
      replacements.push(tanggal_publish);
    }
    if (is_published !== undefined) {
      fields.push("is_published = ?");
      replacements.push(is_published === "false" || is_published === "0" ? 0 : 1);
    }

    if (req.file) {
      fields.push("gambar_url = ?");
      replacements.push(`/uploads/berita/${req.file.filename}`);
      hapusFileGambar(existing.gambar_url);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diubah" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE berita SET ${fields.join(", ")} WHERE id = ?`, {
      replacements,
    });

    res.json({ success: true, message: "Berita berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui berita" });
  }
}

async function deleteBerita(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await sequelize.query("SELECT gambar_url FROM berita WHERE id = ?", {
      replacements: [id],
    });
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Berita tidak ditemukan" });
    }
    await sequelize.query("DELETE FROM berita WHERE id = ?", {
      replacements: [id],
    });
    hapusFileGambar(rows[0].gambar_url);
    res.json({ success: true, message: "Berita berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus berita" });
  }
}

module.exports = {
  getAllBerita,
  getTahunList,
  getBeritaById,
  createBerita,
  updateBerita,
  deleteBerita,
};