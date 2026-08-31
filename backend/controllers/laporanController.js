const sequelize = require("../config/database");
const { hapusFileFoto } = require("../middleware/uploadLaporan");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const ROLE_LIHAT_SEMUA = ["admin", "kepala_satgas"];
const BULAN_NAMA = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ===========================================================================
// Helper umum
// ===========================================================================

// Parse array JSON dari body (form-data selalu berupa string JSON)
function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Khusus isi_laporan (Non P3K): buang poin kosong
function parseIsiLaporan(raw) {
  return parseJsonArray(raw).filter((p) => typeof p === "string" && p.trim());
}

// Bersihkan file yang sudah terlanjur diupload multer saat validasi gagal
function hapusFileUploadGagal(files) {
  (files || []).forEach((f) => hapusFileFoto(`/uploads/laporan/${f.filename}`));
}

function resolveFotoPath(foto_url) {
  if (!foto_url) return null;
  const fullPath = path.join(__dirname, "..", "public", foto_url);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function logoPath(filename) {
  const fullPath = path.join(__dirname, "..", "public", "logo", filename); // was "assets"
  return fs.existsSync(fullPath) ? fullPath : null;
}

// ===========================================================================
// SECTION 1: LAPORAN NON P3K PARUH WAKTU (tabel: laporan_kegiatan)
// Nota dinas per-kegiatan, bisa banyak foto.
// ===========================================================================

async function generateKodeLaporan() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [rows] = await sequelize.query(
    "SELECT kode_laporan FROM laporan_kegiatan WHERE kode_laporan LIKE ? ORDER BY id DESC LIMIT 1",
    { replacements: [`RPT-${yyyymm}-%`] }
  );
  if (rows.length === 0) return `RPT-${yyyymm}-001`;
  const last = rows[0].kode_laporan;
  const num = parseInt(last.split("-")[2], 10) || 0;
  return `RPT-${yyyymm}-${String(num + 1).padStart(3, "0")}`;
}

async function getAllLaporan(req, res) {
  try {
    const { page = 1, limit = 25, kecamatan_id, status, tanggal, q, sort = "terbaru" } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (!ROLE_LIHAT_SEMUA.includes(req.user.role)) {
      where.push("l.petugas_id = ?");
      replacements.push(req.user.anggota_id || req.user.id);
    }

    if (kecamatan_id) { where.push("l.kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (status) { where.push("l.status = ?"); replacements.push(status); }
    if (tanggal) { where.push("l.tanggal = ?"); replacements.push(tanggal); }
    if (q) {
      where.push("(l.kode_laporan LIKE ? OR l.perihal LIKE ? OR a.nama LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSQL = sort === "terlama"
      ? "ORDER BY l.tanggal ASC, l.created_at ASC"
      : "ORDER BY l.tanggal DESC, l.created_at DESC";

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       ${whereSQL}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT l.id, l.kode_laporan, l.tanggal,
              l.kecamatan_id, k.nama AS kecamatan_nama,
              l.petugas_id, a.nama AS petugas_nama,
              l.perihal, l.status, l.created_at
       FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       ${whereSQL}
       ${orderSQL}
       LIMIT ${limitNum} OFFSET ${offset}`,
      { replacements }
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data laporan" });
  }
}

async function getLaporanById(req, res) {
  try {
    const { id } = req.params;

    const [[laporan]] = await sequelize.query(
      `SELECT l.*, k.nama AS kecamatan_nama, a.nama AS petugas_nama
       FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       WHERE l.id = ?`,
      { replacements: [id] }
    );
    if (!laporan) return res.status(404).json({ success: false, message: "Laporan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && laporan.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const [fotoList] = await sequelize.query(
      "SELECT id, foto_url FROM laporan_foto WHERE laporan_id = ? ORDER BY id ASC",
      { replacements: [id] }
    );
    laporan.foto_list = fotoList;
    if (typeof laporan.isi_laporan === "string") {
      try { laporan.isi_laporan = JSON.parse(laporan.isi_laporan); } catch { laporan.isi_laporan = []; }
    }

    res.json({ success: true, data: laporan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail laporan" });
  }
}

async function createLaporan(req, res) {
  const t = await sequelize.transaction();
  const files = req.files || [];
  try {
    const petugas_id = req.user.anggota_id || req.user.id;
    if (!petugas_id) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(400).json({ success: false, message: "Tidak dapat mengidentifikasi petugas" });
    }

    const {
      tanggal, kecamatan_id, status = "Proses",
      kepada = "", dari = "", nomor_surat = "",
      perihal, dasar_surat, nama_pelapor, jabatan_pelapor = "SATGAS LINMAS",
    } = req.body;

    if (!tanggal || !kecamatan_id) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(400).json({ success: false, message: "Tanggal dan kecamatan wajib diisi" });
    }

    const isiLaporan = parseIsiLaporan(req.body.isi_laporan);
    if (!perihal?.trim() || !dasar_surat?.trim() || !nama_pelapor?.trim() || isiLaporan.length === 0) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(400).json({
        success: false,
        message: "Perihal, dasar surat, nama pelapor, dan minimal 1 poin isi laporan wajib diisi",
      });
    }

    const kode_laporan = await generateKodeLaporan();

    await sequelize.query(
      `INSERT INTO laporan_kegiatan
        (kode_laporan, tanggal, kecamatan_id, petugas_id, status,
         kepada, dari, nomor_surat, perihal, dasar_surat, isi_laporan, nama_pelapor, jabatan_pelapor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          kode_laporan, tanggal, kecamatan_id, petugas_id, status,
          kepada, dari, nomor_surat, perihal, dasar_surat,
          JSON.stringify(isiLaporan), nama_pelapor, jabatan_pelapor,
        ],
        transaction: t,
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId", { transaction: t });

    for (const file of files) {
      await sequelize.query(
        "INSERT INTO laporan_foto (laporan_id, foto_url) VALUES (?, ?)",
        { replacements: [insertId, `/uploads/laporan/${file.filename}`], transaction: t }
      );
    }

    await t.commit();
    res.status(201).json({ success: true, data: { id: insertId, kode_laporan } });
  } catch (err) {
    await t.rollback();
    hapusFileUploadGagal(files);
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan laporan" });
  }
}

async function updateLaporan(req, res) {
  const t = await sequelize.transaction();
  const files = req.files || [];
  try {
    const { id } = req.params;

    const [[existing]] = await sequelize.query("SELECT * FROM laporan_kegiatan WHERE id = ?", {
      replacements: [id],
      transaction: t,
    });
    if (!existing) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(404).json({ success: false, message: "Laporan tidak ditemukan" });
    }

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && existing.petugas_id !== petugasId) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const {
      tanggal, kecamatan_id, status,
      kepada, dari, nomor_surat, perihal, dasar_surat, nama_pelapor, jabatan_pelapor,
    } = req.body;

    const fields = [];
    const replacements = [];

    if (tanggal) { fields.push("tanggal = ?"); replacements.push(tanggal); }
    if (kecamatan_id) { fields.push("kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (status) { fields.push("status = ?"); replacements.push(status); }
    if (kepada !== undefined) { fields.push("kepada = ?"); replacements.push(kepada); }
    if (dari !== undefined) { fields.push("dari = ?"); replacements.push(dari); }
    if (nomor_surat !== undefined) { fields.push("nomor_surat = ?"); replacements.push(nomor_surat); }
    if (perihal !== undefined) { fields.push("perihal = ?"); replacements.push(perihal); }
    if (dasar_surat !== undefined) { fields.push("dasar_surat = ?"); replacements.push(dasar_surat); }
    if (nama_pelapor !== undefined) { fields.push("nama_pelapor = ?"); replacements.push(nama_pelapor); }
    if (jabatan_pelapor !== undefined) { fields.push("jabatan_pelapor = ?"); replacements.push(jabatan_pelapor); }
    if (req.body.isi_laporan !== undefined) {
      fields.push("isi_laporan = ?");
      replacements.push(JSON.stringify(parseIsiLaporan(req.body.isi_laporan)));
    }

    // Hapus foto lama yang diminta dihapus
    if (req.body.hapus_foto_ids) {
      const hapusIds = parseJsonArray(req.body.hapus_foto_ids);
      if (hapusIds.length) {
        const placeholders = hapusIds.map(() => "?").join(",");
        const [fotoRows] = await sequelize.query(
          `SELECT id, foto_url FROM laporan_foto WHERE id IN (${placeholders}) AND laporan_id = ?`,
          { replacements: [...hapusIds, id], transaction: t }
        );
        for (const foto of fotoRows) hapusFileFoto(foto.foto_url);
        await sequelize.query(
          `DELETE FROM laporan_foto WHERE id IN (${placeholders}) AND laporan_id = ?`,
          { replacements: [...hapusIds, id], transaction: t }
        );
      }
    }

    // Tambah foto baru
    for (const file of files) {
      await sequelize.query(
        "INSERT INTO laporan_foto (laporan_id, foto_url) VALUES (?, ?)",
        { replacements: [id, `/uploads/laporan/${file.filename}`], transaction: t }
      );
    }

    if (fields.length > 0) {
      replacements.push(id);
      await sequelize.query(
        `UPDATE laporan_kegiatan SET ${fields.join(", ")} WHERE id = ?`,
        { replacements, transaction: t }
      );
    }

    await t.commit();
    res.json({ success: true, message: "Laporan berhasil diperbarui" });
  } catch (err) {
    await t.rollback();
    hapusFileUploadGagal(files);
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui laporan" });
  }
}

async function deleteLaporan(req, res) {
  try {
    const { id } = req.params;
    const [[laporan]] = await sequelize.query(
      "SELECT petugas_id FROM laporan_kegiatan WHERE id = ?",
      { replacements: [id] }
    );
    if (!laporan) return res.status(404).json({ success: false, message: "Laporan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && laporan.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const [fotoRows] = await sequelize.query(
      "SELECT foto_url FROM laporan_foto WHERE laporan_id = ?",
      { replacements: [id] }
    );
    for (const foto of fotoRows) hapusFileFoto(foto.foto_url);

    await sequelize.query("DELETE FROM laporan_kegiatan WHERE id = ?", { replacements: [id] });
    // Baris di laporan_foto ikut terhapus otomatis lewat ON DELETE CASCADE

    res.json({ success: true, message: "Laporan berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus laporan" });
  }
}

function drawNonP3KPage(doc, row, fotoList) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - margin * 2;

  doc.font("Helvetica-Bold").fontSize(16).text("NOTA DINAS", { align: "center", underline: true });
  doc.moveDown(1.2);

  const labelWidth = 85;
  const colonX = margin + labelWidth;
  const valueX = colonX + 14;
  const valueWidth = contentWidth - labelWidth - 14;

  const drawField = (label, value, opts = {}) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(11).text(label, margin, y, { width: labelWidth });
    doc.font("Helvetica").fontSize(11).text(":", colonX, y, { width: 14 });
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(11)
      .text(value || "-", valueX, y, { width: valueWidth });
    doc.moveDown(0.45);
  };

  drawField("Kepada", row.kepada);
  drawField("Dari", row.dari);
  drawField("Nomor", row.nomor_surat);
  drawField("Tanggal", row.tanggal
    ? new Date(row.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : "-");
  drawField("Perihal", row.perihal, { bold: true });

  // ========== GARIS PEMISAH SETELAH PERIHAL ==========
  const lineY = doc.y - 0.2;
  doc.lineWidth(1).strokeColor("#000000")
    .moveTo(margin, lineY)
    .lineTo(pageWidth - margin, lineY)
    .stroke();
  doc.moveDown(0.8);

  const pembuka = `Berdasarkan ${row.dasar_surat || "-"}. Bersama ini kami sampaikan laporan ${row.perihal || "-"} :`;

    // Paragraf dengan alinea menjorok
    doc.font("Helvetica")
    .fontSize(11)
    .text(pembuka, margin, doc.y, {
        width: contentWidth,
        align: "justify",
        indent: 28 // hanya baris pertama yang menjorok
    });

    doc.moveDown(0.8);

    // Isi laporan dengan penomoran sejajar
    const isiLaporan = Array.isArray(row.isi_laporan) ? row.isi_laporan : [];

    const nomorWidth = 20;
    const textIndent = margin + nomorWidth + 10;

    isiLaporan.forEach((poin, idx) => {
        const y = doc.y;

        // Nomor rata kiri
        doc.font("Helvetica")
          .fontSize(11)
          .text(`${idx + 1}.`, margin, y, {
              width: nomorWidth,
              align: "right"
          });

        // Isi poin sejajar
        doc.text(poin, textIndent, y, {
            width: contentWidth - (textIndent - margin),
            align: "justify"
        });

        doc.moveDown(0.4);
    });

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(11)
    .text("Demikian laporan hasil pelaksanaan, agar menjadi maklum.", margin, doc.y, { width: contentWidth });
  doc.moveDown(1.2);

  // ========== TANDA TANGAN DUA KOLOM ==========
  const leftColWidth = contentWidth * 0.6;
  const rightColWidth = contentWidth * 0.4;

  const leftX = margin;
  const rightX = margin + leftColWidth;

  // Baris 1
  doc.text("", leftX, doc.y, {
      width: leftColWidth,
      align: "center"
  });
  doc.text("Yang Melapor,", rightX, doc.y, {
      width: rightColWidth,
      align: "center"
  });

  doc.moveDown(0.3);

  // Baris 2
  doc.font("Helvetica-Bold").text("", leftX, doc.y, {
      width: leftColWidth,
      align: "center"
  });
  doc.font("Helvetica-Bold").text(
      (row.jabatan_pelapor || "SATGAS LINMAS").toUpperCase(),
      rightX,
      doc.y,
      {
          width: rightColWidth,
          align: "center"
      }
  );

  doc.moveDown(2.5);

  // Baris 3
  doc.font("Helvetica-Bold").text("", leftX, doc.y, {
      width: leftColWidth,
      align: "center"
  });
  doc.font("Helvetica-Bold").text(
      row.nama_pelapor || "-",
      rightX,
      doc.y,
      {
          width: rightColWidth,
          align: "center",
          underline: true
      }
  );
  // Footer (kode laporan, kecamatan, status) di kiri bawah
  doc.font("Helvetica").fontSize(8).fillColor("#999999").text(
    `Kode Laporan: ${row.kode_laporan}  ·  Kecamatan: ${row.kecamatan_nama || "-"}  ·  Status: ${row.status}`,
    margin,
    doc.page.height - doc.page.margins.bottom - 10
  );
  doc.fillColor("#000000");

  // Halaman foto (jika ada)
  if (fotoList && fotoList.length > 0) {
    doc.addPage();
    const gap = 15;
    const colWidthFoto = (contentWidth - gap) / 2;
    const boxHeight = 250;
    let y = doc.page.margins.top;

    fotoList.forEach((foto, idx) => {
      const col = idx % 2;
      const rowIdx = Math.floor(idx / 2);

      if (col === 0) {
        if (rowIdx > 0) y += boxHeight + gap;
        if (y + boxHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
        }
      }

      const x = margin + col * (colWidthFoto + gap);
      doc.rect(x, y, colWidthFoto, boxHeight).strokeColor("#CCCCCC").stroke();

      const fotoPath = resolveFotoPath(foto.foto_url);
      if (fotoPath) {
        try {
          doc.image(fotoPath, x + 4, y + 4, { fit: [colWidthFoto - 8, boxHeight - 8], align: "center", valign: "center" });
        } catch {
          doc.font("Helvetica-Oblique").fontSize(9).fillColor("#999999")
            .text("Foto tidak dapat dimuat", x + 10, y + boxHeight / 2 - 5, { width: colWidthFoto - 20, align: "center" });
          doc.fillColor("#000000");
        }
      } else {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#999999")
          .text("Tidak ada foto", x + 10, y + boxHeight / 2 - 5, { width: colWidthFoto - 20, align: "center" });
        doc.fillColor("#000000");
      }
    });
  }
}

async function downloadFilteredPDF(req, res) {
  try {
    const { kecamatan_id, status, tanggal, q } = req.query;

    const where = [];
    const replacements = [];

    if (!ROLE_LIHAT_SEMUA.includes(req.user.role)) {
      where.push("l.petugas_id = ?");
      replacements.push(req.user.anggota_id || req.user.id);
    }
    if (kecamatan_id) { where.push("l.kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (status) { where.push("l.status = ?"); replacements.push(status); }
    if (tanggal) { where.push("l.tanggal = ?"); replacements.push(tanggal); }
    if (q) {
      where.push("(l.kode_laporan LIKE ? OR l.perihal LIKE ? OR a.nama LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await sequelize.query(
      `SELECT l.id, l.kode_laporan, l.tanggal, k.nama AS kecamatan_nama, a.nama AS petugas_nama,
              l.status, l.kepada, l.dari, l.nomor_surat, l.perihal, l.dasar_surat, l.isi_laporan,
              l.nama_pelapor, l.jabatan_pelapor
       FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       ${whereSQL}
       ORDER BY l.tanggal DESC`,
      { replacements }
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=laporan_kegiatan.pdf");
    doc.pipe(res);

    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(12).text("Tidak ada laporan yang sesuai dengan filter.", { align: "center" });
    } else {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        if (idx > 0) doc.addPage();
        if (typeof row.isi_laporan === "string") {
          try { row.isi_laporan = JSON.parse(row.isi_laporan); } catch { row.isi_laporan = []; }
        }
        const [fotoList] = await sequelize.query(
          "SELECT id, foto_url FROM laporan_foto WHERE laporan_id = ? ORDER BY id ASC",
          { replacements: [row.id] }
        );
        drawNonP3KPage(doc, row, fotoList);
      }
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal membuat PDF" });
  }
}

async function downloadSinglePDF(req, res) {
  try {
    const { id } = req.params;

    const [[row]] = await sequelize.query(
      `SELECT l.id, l.kode_laporan, l.tanggal, k.nama AS kecamatan_nama, a.nama AS petugas_nama,
              l.status, l.petugas_id, l.kepada, l.dari, l.nomor_surat, l.perihal, l.dasar_surat, l.isi_laporan,
              l.nama_pelapor, l.jabatan_pelapor
       FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       WHERE l.id = ?`,
      { replacements: [id] }
    );

    if (!row) return res.status(404).json({ success: false, message: "Laporan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && row.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    if (typeof row.isi_laporan === "string") {
      try { row.isi_laporan = JSON.parse(row.isi_laporan); } catch { row.isi_laporan = []; }
    }
    const [fotoList] = await sequelize.query(
      "SELECT id, foto_url FROM laporan_foto WHERE laporan_id = ? ORDER BY id ASC",
      { replacements: [id] }
    );

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 40,
        bottom: 40,
        left: 60,
        right: 60
      }
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=laporan-${row.kode_laporan}.pdf`);
    doc.pipe(res);

    drawNonP3KPage(doc, row, fotoList);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal membuat PDF" });
  }
}

// ===========================================================================
// SECTION 2: LAPORAN BULANAN KECAMATAN (tabel: laporan_bulanan_kecamatan)
// Dulu dikenal sebagai "Linmas Desa" — sekarang 1 laporan per kecamatan per bulan.
// ===========================================================================

function generateKodeBulanan(kecamatan_id, bulan, tahun) {
  const yyyymm = `${tahun}${String(bulan).padStart(2, "0")}`;
  return `RPB-${yyyymm}-K${kecamatan_id}`;
}

async function getAllLaporanBulanan(req, res) {
  try {
    const { page = 1, limit = 25, kecamatan_id, bulan, tahun, status } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (!ROLE_LIHAT_SEMUA.includes(req.user.role)) {
      where.push("l.petugas_id = ?");
      replacements.push(req.user.anggota_id || req.user.id);
    }
    if (kecamatan_id) { where.push("l.kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (bulan) { where.push("l.bulan = ?"); replacements.push(bulan); }
    if (tahun) { where.push("l.tahun = ?"); replacements.push(tahun); }
    if (status) { where.push("l.status = ?"); replacements.push(status); }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM laporan_bulanan_kecamatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       ${whereSQL}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT l.id, l.kode_laporan, l.kecamatan_id, k.nama AS kecamatan_nama,
              l.bulan, l.tahun, l.jenis_operasi, l.status, l.created_at,
              a.nama AS petugas_nama
       FROM laporan_bulanan_kecamatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       ${whereSQL}
       ORDER BY l.tahun DESC, l.bulan DESC, l.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      { replacements }
    );

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, bulan_nama: BULAN_NAMA[r.bulan] })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil data laporan bulanan" });
  }
}

async function getLaporanBulananById(req, res) {
  try {
    const { id } = req.params;
    const [[row]] = await sequelize.query(
      `SELECT l.*, k.nama AS kecamatan_nama, a.nama AS petugas_nama
       FROM laporan_bulanan_kecamatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       JOIN anggota a ON a.id = l.petugas_id
       WHERE l.id = ?`,
      { replacements: [id] }
    );
    if (!row) return res.status(404).json({ success: false, message: "Laporan bulanan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && row.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    ["tanggal_kegiatan", "hambatan", "solusi", "rekap_kegiatan", "daftar_petugas"].forEach((field) => {
      if (typeof row[field] === "string") {
        try { row[field] = JSON.parse(row[field]); } catch { row[field] = []; }
      }
    });
    row.bulan_nama = BULAN_NAMA[row.bulan];

    res.json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail laporan bulanan" });
  }
}

async function createLaporanBulanan(req, res) {
  try {
    const petugas_id = req.user.anggota_id || req.user.id;
    if (!petugas_id) {
      return res.status(400).json({ success: false, message: "Tidak dapat mengidentifikasi petugas" });
    }

    const {
      kecamatan_id, bulan, tahun,
      dasar_surat_nomor, dasar_surat_perihal, jenis_operasi,
      sasaran_operasi, misi_metode_operasi, misi_sop,
      status = "Proses",
    } = req.body;

    if (!kecamatan_id || !bulan || !tahun || !jenis_operasi?.trim()) {
      return res.status(400).json({ success: false, message: "Kecamatan, bulan, tahun, dan jenis operasi wajib diisi" });
    }

    const bulanNum = parseInt(bulan, 10);
    if (bulanNum < 1 || bulanNum > 12) {
      return res.status(400).json({ success: false, message: "Bulan tidak valid" });
    }

    const tanggal_kegiatan = parseJsonArray(req.body.tanggal_kegiatan);
    const hambatan = parseJsonArray(req.body.hambatan);
    const solusi = parseJsonArray(req.body.solusi);
    const rekap_kegiatan = parseJsonArray(req.body.rekap_kegiatan);
    const daftar_petugas = parseJsonArray(req.body.daftar_petugas);

    const kode_laporan = generateKodeBulanan(kecamatan_id, bulanNum, tahun);

    try {
      await sequelize.query(
        `INSERT INTO laporan_bulanan_kecamatan
          (kode_laporan, kecamatan_id, bulan, tahun, petugas_id,
           dasar_surat_nomor, dasar_surat_perihal, jenis_operasi, tanggal_kegiatan,
           sasaran_operasi, misi_metode_operasi, misi_sop,
           hambatan, solusi, rekap_kegiatan, daftar_petugas, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            kode_laporan, kecamatan_id, bulanNum, tahun, petugas_id,
            dasar_surat_nomor || null, dasar_surat_perihal || null, jenis_operasi, JSON.stringify(tanggal_kegiatan),
            sasaran_operasi || null, misi_metode_operasi || null, misi_sop || null,
            JSON.stringify(hambatan), JSON.stringify(solusi), JSON.stringify(rekap_kegiatan), JSON.stringify(daftar_petugas), status,
          ],
        }
      );
    } catch (dbErr) {
      if (dbErr.original?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ success: false, message: "Laporan bulanan untuk kecamatan dan bulan ini sudah ada" });
      }
      throw dbErr;
    }

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId");
    res.status(201).json({ success: true, data: { id: insertId, kode_laporan } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan laporan bulanan" });
  }
}

async function updateLaporanBulanan(req, res) {
  try {
    const { id } = req.params;
    const [[existing]] = await sequelize.query("SELECT * FROM laporan_bulanan_kecamatan WHERE id = ?", { replacements: [id] });
    if (!existing) return res.status(404).json({ success: false, message: "Laporan bulanan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && existing.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const fields = [];
    const replacements = [];
    const body = req.body;

    const simpleFields = [
      "dasar_surat_nomor", "dasar_surat_perihal", "jenis_operasi",
      "sasaran_operasi", "misi_metode_operasi", "misi_sop", "status",
    ];
    simpleFields.forEach((f) => {
      if (body[f] !== undefined) { fields.push(`${f} = ?`); replacements.push(body[f]); }
    });

    const jsonFields = ["tanggal_kegiatan", "hambatan", "solusi", "rekap_kegiatan", "daftar_petugas"];
    jsonFields.forEach((f) => {
      if (body[f] !== undefined) { fields.push(`${f} = ?`); replacements.push(JSON.stringify(parseJsonArray(body[f]))); }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data yang diperbarui" });
    }

    replacements.push(id);
    await sequelize.query(`UPDATE laporan_bulanan_kecamatan SET ${fields.join(", ")} WHERE id = ?`, { replacements });

    res.json({ success: true, message: "Laporan bulanan berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui laporan bulanan" });
  }
}

async function deleteLaporanBulanan(req, res) {
  try {
    const { id } = req.params;
    const [[row]] = await sequelize.query("SELECT petugas_id FROM laporan_bulanan_kecamatan WHERE id = ?", { replacements: [id] });
    if (!row) return res.status(404).json({ success: false, message: "Laporan bulanan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && row.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    await sequelize.query("DELETE FROM laporan_bulanan_kecamatan WHERE id = ?", { replacements: [id] });
    res.json({ success: true, message: "Laporan bulanan berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus laporan bulanan" });
  }
}

function drawCoverPage(doc, row) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const logoKiri = logoPath("satpol.png");
  const logoKanan = logoPath("linmas.png");

  const logoSize = 75;
  const centerX = pageWidth / 2;

  const yLogo = 80;

  if (logoKiri)
    doc.image(logoKiri, centerX - 95, yLogo, { width: logoSize });

  if (logoKanan)
    doc.image(logoKanan, centerX + 20, yLogo, { width: logoSize });

  doc.y = yLogo + logoSize + 30;

  doc
    .font("Helvetica")
    .fontSize(18)
    .text("LAPORAN PELAKSANAAN", {
      align: "center",
    });

  doc.moveDown(0.5);

  doc.text("PATROLI WILAYAH", {
    align: "center",
  });

  doc.moveDown(0.5);

  doc.text(`KECAMATAN ${(row.kecamatan_nama || "-").toUpperCase()}`, {
    align: "center",
  });

  doc.moveDown(0.5);

  doc.text(`BULAN ${(BULAN_NAMA[row.bulan] || "-").toUpperCase()}`, {
    align: "center",
  });

  doc.y = pageHeight - 140;

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(`TAHUN ${row.tahun}`, {
      align: "center",
    });
}

// ---- PDF: "Laporan Pelaksanaan Patroli Wilayah" ----
function drawRekapTable(doc, margin, contentWidth, rekapKegiatan) {
  const headerHeight = 24;
  const rowHeight = 20;
  const colTanggalWidth = 70;
  const colJumlahWidth = 110;
  const colKegiatanWidth = contentWidth - colTanggalWidth - colJumlahWidth;
  const colTanggalX = margin;
  const colKegiatanX = margin + colTanggalWidth;
  const colJumlahX = colKegiatanX + colKegiatanWidth;

  const drawHeader = () => {
    const y = doc.y;
    doc.lineWidth(0.75).strokeColor("#000000");
    doc.rect(colTanggalX, y, colTanggalWidth, headerHeight).stroke();
    doc.rect(colKegiatanX, y, colKegiatanWidth, headerHeight).stroke();
    doc.rect(colJumlahX, y, colJumlahWidth, headerHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("TANGGAL", colTanggalX + 2, y + 8, { width: colTanggalWidth - 4, align: "center" });
    doc.text("KEGIATAN", colKegiatanX + 2, y + 8, { width: colKegiatanWidth - 4, align: "center" });
    doc.text("JUMLAH KEJADIAN/PELANGGARAN", colJumlahX + 2, y + 2, { width: colJumlahWidth - 4, align: "center" });
    doc.y = y + headerHeight;
  };

  drawHeader();

  (rekapKegiatan || []).forEach((group) => {
    const items = Array.isArray(group.kegiatan) && group.kegiatan.length ? group.kegiatan : [{ label: "-", jumlah: "-" }];
    const blockHeight = items.length * rowHeight;

    if (doc.y + blockHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    const blockTop = doc.y;
    doc.lineWidth(0.5).strokeColor("#999999");

    items.forEach((item, idx) => {
      const rowY = blockTop + idx * rowHeight;
      doc.rect(colKegiatanX, rowY, colKegiatanWidth, rowHeight).stroke();
      doc.rect(colJumlahX, rowY, colJumlahWidth, rowHeight).stroke();
      doc.font("Helvetica").fontSize(9)
        .text(item.label || "-", colKegiatanX + 6, rowY + 6, { width: colKegiatanWidth - 12 });
      doc.text(
        item.jumlah === null || item.jumlah === undefined || item.jumlah === "" ? "-" : String(item.jumlah),
        colJumlahX, rowY + 6, { width: colJumlahWidth, align: "center" }
      );
    });

    doc.lineWidth(0.75).strokeColor("#000000");
    doc.rect(colTanggalX, blockTop, colTanggalWidth, blockHeight).stroke();
    doc.font("Helvetica-Bold").fontSize(9).text(
      group.tanggal ? new Date(group.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-",
      colTanggalX, blockTop + blockHeight / 2 - 5, { width: colTanggalWidth, align: "center" }
    );

    doc.y = blockTop + blockHeight;
  });

  doc.moveDown(0.5);
}

function drawDaftarPetugas(doc, margin, contentWidth, daftarPetugas) {
  const rowHeight = 40;
  const headerHeight = 22;
  const colNoWidth = 40;
  const colNamaWidth = (contentWidth - colNoWidth) * 0.5;
  const colTtdWidth = contentWidth - colNoWidth - colNamaWidth;

  if (doc.y + headerHeight + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();

  const y0 = doc.y;
  doc.lineWidth(0.75).strokeColor("#000000");
  doc.rect(margin, y0, colNoWidth, headerHeight).stroke();
  doc.rect(margin + colNoWidth, y0, colNamaWidth, headerHeight).stroke();
  doc.rect(margin + colNoWidth + colNamaWidth, y0, colTtdWidth, headerHeight).stroke();
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("NO", margin, y0 + 7, { width: colNoWidth, align: "center" });
  doc.text("NAMA", margin + colNoWidth, y0 + 7, { width: colNamaWidth, align: "center" });
  doc.text("TANDA TANGAN", margin + colNoWidth + colNamaWidth, y0 + 7, { width: colTtdWidth, align: "center" });
  doc.y = y0 + headerHeight;

  (daftarPetugas || []).forEach((p, idx) => {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const rowY = doc.y;
    doc.lineWidth(0.5).strokeColor("#999999");
    doc.rect(margin, rowY, colNoWidth, rowHeight).stroke();
    doc.rect(margin + colNoWidth, rowY, colNamaWidth, rowHeight).stroke();
    doc.rect(margin + colNoWidth + colNamaWidth, rowY, colTtdWidth, rowHeight).stroke();
    doc.font("Helvetica").fontSize(9);
    doc.text(String(idx + 1), margin, rowY + rowHeight / 2 - 5, { width: colNoWidth, align: "center" });
    doc.text((p.nama || "-").toUpperCase(), margin + colNoWidth + 6, rowY + rowHeight / 2 - 5, { width: colNamaWidth - 12 });
    doc.y = rowY + rowHeight;
  });
}

function drawLaporanBulananPage(doc, row) {

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - margin * 2;

  doc.font("Helvetica-Bold")
     .fontSize(11)
     .text("A. JENIS PELAKSANAAN", margin, doc.y);

  doc.moveDown(0.4);

  const dasarText = `Dasar Surat Perintah Nomor: ${row.dasar_surat_nomor || "-"} ${row.dasar_surat_perihal ? "Perihal " + row.dasar_surat_perihal : ""}`;
  doc.font("Helvetica").fontSize(10).text(dasarText, margin, doc.y, { width: contentWidth, align: "justify" });
  doc.moveDown(0.6);

  const numbered = (n, label, value) => {
    doc.font("Helvetica").fontSize(10).text(`${n}. ${label} : ${value || "-"}`, margin, doc.y, { width: contentWidth, align: "justify" });
    doc.moveDown(0.4);
  };

  numbered(1, "Jenis Operasi", row.jenis_operasi);

  const tanggalList = (row.tanggal_kegiatan || []).map((t) =>
    new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  ).join(", ");
  numbered(2, "Tanggal", tanggalList);

  doc.font("Helvetica").fontSize(10).text("3. Sasaran dan Misi", margin, doc.y);
  doc.moveDown(0.3);
  doc.text("a. Sasaran Operasi", margin + 14, doc.y, { width: contentWidth - 14 });
  doc.text(`- ${row.sasaran_operasi || "-"}`, margin + 28, doc.y, { width: contentWidth - 28 });
  doc.moveDown(0.3);
  doc.text("b. Misi", margin + 14, doc.y);
  doc.text(`- Metode Operasi : ${row.misi_metode_operasi || "-"}`, margin + 28, doc.y, { width: contentWidth - 28 });
  doc.text(`- SOP yang digunakan : ${row.misi_sop || "-"}`, margin + 28, doc.y, { width: contentWidth - 28 });
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(10).text("4. Hambatan dan Solusi", margin, doc.y);
  doc.moveDown(0.3);
  doc.text("a. Jenis Hambatan :", margin + 14, doc.y);
  (row.hambatan || []).forEach((h) => {
    doc.text(`- ${h}`, margin + 28, doc.y, { width: contentWidth - 28 });
  });
  doc.moveDown(0.2);
  doc.text("b. Solusi :", margin + 14, doc.y);
  (row.solusi || []).forEach((s) => {
    doc.text(`- ${s}`, margin + 28, doc.y, { width: contentWidth - 28 });
  });
  doc.moveDown(0.6);

  doc.font("Helvetica").fontSize(10).text("5. Laporan Kegiatan", margin, doc.y);
  doc.moveDown(0.3);
  drawRekapTable(doc, margin, contentWidth, row.rekap_kegiatan);

  doc.font("Helvetica").fontSize(10).text(
    "6. Demikian Laporan pelaksanaan Patroli Di wilayah yang dapat kami sampaikan",
    margin, doc.y, { width: contentWidth, align: "justify" }
  );
  doc.moveDown(0.8);

  drawDaftarPetugas(doc, margin, contentWidth, row.daftar_petugas);
}

async function downloadLaporanBulananPDF(req, res) {
  try {
    const { id } = req.params;
    const [[row]] = await sequelize.query(
      `SELECT l.*, k.nama AS kecamatan_nama
       FROM laporan_bulanan_kecamatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       WHERE l.id = ?`,
      { replacements: [id] }
    );
    if (!row) return res.status(404).json({ success: false, message: "Laporan bulanan tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && row.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    ["tanggal_kegiatan", "hambatan", "solusi", "rekap_kegiatan", "daftar_petugas"].forEach((field) => {
      if (typeof row[field] === "string") {
        try { row[field] = JSON.parse(row[field]); } catch { row[field] = []; }
      }
    });

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 40,
        bottom: 40,
        left: 80,
        right: 80
      }
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=laporan-bulanan-${row.kode_laporan}.pdf`);
    doc.pipe(res);

    // Halaman Cover
    drawCoverPage(doc, row);

    // Halaman Baru
    doc.addPage();

    // Isi laporan
    drawLaporanBulananPage(doc, row);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal membuat PDF laporan bulanan" });
  }
}

// ===========================================================================
// SECTION 3: STATISTIK GABUNGAN
// ===========================================================================
async function getStatsPerKecamatan(req, res) {
  try {
    const [rows] = await sequelize.query(
      `SELECT k.nama AS kecamatan_nama, 'Non P3K Paruh Waktu' AS jenis, COUNT(*) AS jumlah
       FROM laporan_kegiatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       GROUP BY k.nama
       UNION ALL
       SELECT k.nama AS kecamatan_nama, 'Laporan Bulanan' AS jenis, COUNT(*) AS jumlah
       FROM laporan_bulanan_kecamatan l
       JOIN kecamatan k ON k.id = l.kecamatan_id
       GROUP BY k.nama
       ORDER BY kecamatan_nama, jenis`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil statistik laporan per kecamatan" });
  }
}

module.exports = {
  // Non P3K Paruh Waktu (laporan_kegiatan)
  getAllLaporan,
  getLaporanById,
  createLaporan,
  updateLaporan,
  deleteLaporan,
  downloadFilteredPDF,
  downloadSinglePDF,

  // Laporan Bulanan Kecamatan (dulu Linmas Desa)
  getAllLaporanBulanan,
  getLaporanBulananById,
  createLaporanBulanan,
  updateLaporanBulanan,
  deleteLaporanBulanan,
  downloadLaporanBulananPDF,

  // Statistik
  getStatsPerKecamatan,
};