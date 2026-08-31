const sequelize = require("../config/database");
const { hapusFileFotoMonev } = require("../middleware/uploadMonev");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const ROLE_LIHAT_SEMUA = ["admin", "kepala_satgas"];

// ===========================================================================
// Helper umum (sama pola dengan laporanController)
// ===========================================================================

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Khusus isi_laporan: buang poin kosong
function parseIsiLaporan(raw) {
  return parseJsonArray(raw).filter((p) => typeof p === "string" && p.trim());
}

// anggota_tim bisa dikirim sebagai array string ATAU array {nama}
function parseAnggotaTim(raw) {
  return parseJsonArray(raw)
    .map((a) => (typeof a === "string" ? a.trim() : (a?.nama || "").trim()))
    .filter(Boolean);
}

function hapusFileUploadGagal(files) {
  (files || []).forEach((f) => hapusFileFotoMonev(`/uploads/monev/${f.filename}`));
}

function resolveFotoPath(foto_url) {
  if (!foto_url) return null;
  const fullPath = path.join(__dirname, "..", "public", foto_url);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function logoPath(filename) {
  const fullPath = path.join(__dirname, "..", "public", "logo", filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

async function generateKodeMonev() {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [rows] = await sequelize.query(
    "SELECT kode_laporan FROM laporan_monev WHERE kode_laporan LIKE ? ORDER BY id DESC LIMIT 1",
    { replacements: [`MNV-${yyyymm}-%`] }
  );
  if (rows.length === 0) return `MNV-${yyyymm}-001`;
  const last = rows[0].kode_laporan;
  const num = parseInt(last.split("-")[2], 10) || 0;
  return `MNV-${yyyymm}-${String(num + 1).padStart(3, "0")}`;
}

// ===========================================================================
// CRUD: laporan_monev
// ===========================================================================

async function getAllMonev(req, res) {
  try {
    const { page = 1, limit = 25, kecamatan_id, status, tanggal, q, sort = "terbaru" } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (!ROLE_LIHAT_SEMUA.includes(req.user.role)) {
      where.push("m.petugas_id = ?");
      replacements.push(req.user.anggota_id || req.user.id);
    }

    if (kecamatan_id) { where.push("m.kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (status) { where.push("m.status = ?"); replacements.push(status); }
    if (tanggal) { where.push("m.tanggal = ?"); replacements.push(tanggal); }
    if (q) {
      where.push("(m.kode_laporan LIKE ? OR m.perihal LIKE ? OR a.nama LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderSQL = sort === "terlama"
      ? "ORDER BY m.tanggal ASC, m.created_at ASC"
      : "ORDER BY m.tanggal DESC, m.created_at DESC";

    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM laporan_monev m
       JOIN kecamatan k ON k.id = m.kecamatan_id
       JOIN anggota a ON a.id = m.petugas_id
       ${whereSQL}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT m.id, m.kode_laporan, m.tanggal,
              m.kecamatan_id, k.nama AS kecamatan_nama,
              m.petugas_id, a.nama AS petugas_nama,
              m.perihal, m.status, m.created_at
       FROM laporan_monev m
       JOIN kecamatan k ON k.id = m.kecamatan_id
       JOIN anggota a ON a.id = m.petugas_id
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
    res.status(500).json({ success: false, message: "Gagal mengambil data laporan monev" });
  }
}

async function getMonevById(req, res) {
  try {
    const { id } = req.params;

    const [[monev]] = await sequelize.query(
      `SELECT m.*, k.nama AS kecamatan_nama, a.nama AS petugas_nama
       FROM laporan_monev m
       JOIN kecamatan k ON k.id = m.kecamatan_id
       JOIN anggota a ON a.id = m.petugas_id
       WHERE m.id = ?`,
      { replacements: [id] }
    );
    if (!monev) return res.status(404).json({ success: false, message: "Laporan monev tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && monev.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const [fotoList] = await sequelize.query(
      "SELECT id, foto_url FROM monev_foto WHERE monev_id = ? ORDER BY id ASC",
      { replacements: [id] }
    );
    monev.foto_list = fotoList;

    ["isi_laporan", "anggota_tim"].forEach((field) => {
      if (typeof monev[field] === "string") {
        try { monev[field] = JSON.parse(monev[field]); } catch { monev[field] = []; }
      }
    });

    res.json({ success: true, data: monev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal mengambil detail laporan monev" });
  }
}

async function createMonev(req, res) {
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
      kepada = "Yth. Kepala Bidang Linmas", dari = "Bidang Linmas", nomor_surat = "",
      perihal, dasar_surat, nama_pelapor, jabatan_pelapor = "KABID LINMAS", nip_pelapor = "",
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
        message: "Perihal, dasar surat, nama pelapor, dan minimal 1 poin hasil monev wajib diisi",
      });
    }

    const anggotaTim = parseAnggotaTim(req.body.anggota_tim);
    const kode_laporan = await generateKodeMonev();

    await sequelize.query(
      `INSERT INTO laporan_monev
        (kode_laporan, tanggal, kecamatan_id, petugas_id, status,
         kepada, dari, nomor_surat, perihal, dasar_surat, isi_laporan, anggota_tim,
         nama_pelapor, jabatan_pelapor, nip_pelapor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          kode_laporan, tanggal, kecamatan_id, petugas_id, status,
          kepada, dari, nomor_surat, perihal, dasar_surat,
          JSON.stringify(isiLaporan), JSON.stringify(anggotaTim),
          nama_pelapor, jabatan_pelapor, nip_pelapor,
        ],
        transaction: t,
      }
    );

    const [[{ insertId }]] = await sequelize.query("SELECT LAST_INSERT_ID() AS insertId", { transaction: t });

    for (const file of files) {
      await sequelize.query(
        "INSERT INTO monev_foto (monev_id, foto_url) VALUES (?, ?)",
        { replacements: [insertId, `/uploads/monev/${file.filename}`], transaction: t }
      );
    }

    await t.commit();
    res.status(201).json({ success: true, data: { id: insertId, kode_laporan } });
  } catch (err) {
    await t.rollback();
    hapusFileUploadGagal(files);
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menyimpan laporan monev" });
  }
}

async function updateMonev(req, res) {
  const t = await sequelize.transaction();
  const files = req.files || [];
  try {
    const { id } = req.params;

    const [[existing]] = await sequelize.query("SELECT * FROM laporan_monev WHERE id = ?", {
      replacements: [id],
      transaction: t,
    });
    if (!existing) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(404).json({ success: false, message: "Laporan monev tidak ditemukan" });
    }

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && existing.petugas_id !== petugasId) {
      await t.rollback();
      hapusFileUploadGagal(files);
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const {
      tanggal, kecamatan_id, status,
      kepada, dari, nomor_surat, perihal, dasar_surat,
      nama_pelapor, jabatan_pelapor, nip_pelapor,
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
    if (nip_pelapor !== undefined) { fields.push("nip_pelapor = ?"); replacements.push(nip_pelapor); }
    if (req.body.isi_laporan !== undefined) {
      fields.push("isi_laporan = ?");
      replacements.push(JSON.stringify(parseIsiLaporan(req.body.isi_laporan)));
    }
    if (req.body.anggota_tim !== undefined) {
      fields.push("anggota_tim = ?");
      replacements.push(JSON.stringify(parseAnggotaTim(req.body.anggota_tim)));
    }

    // Hapus foto lama yang diminta dihapus
    if (req.body.hapus_foto_ids) {
      const hapusIds = parseJsonArray(req.body.hapus_foto_ids);
      if (hapusIds.length) {
        const placeholders = hapusIds.map(() => "?").join(",");
        const [fotoRows] = await sequelize.query(
          `SELECT id, foto_url FROM monev_foto WHERE id IN (${placeholders}) AND monev_id = ?`,
          { replacements: [...hapusIds, id], transaction: t }
        );
        for (const foto of fotoRows) hapusFileFotoMonev(foto.foto_url);
        await sequelize.query(
          `DELETE FROM monev_foto WHERE id IN (${placeholders}) AND monev_id = ?`,
          { replacements: [...hapusIds, id], transaction: t }
        );
      }
    }

    // Tambah foto baru
    for (const file of files) {
      await sequelize.query(
        "INSERT INTO monev_foto (monev_id, foto_url) VALUES (?, ?)",
        { replacements: [id, `/uploads/monev/${file.filename}`], transaction: t }
      );
    }

    if (fields.length > 0) {
      replacements.push(id);
      await sequelize.query(
        `UPDATE laporan_monev SET ${fields.join(", ")} WHERE id = ?`,
        { replacements, transaction: t }
      );
    }

    await t.commit();
    res.json({ success: true, message: "Laporan monev berhasil diperbarui" });
  } catch (err) {
    await t.rollback();
    hapusFileUploadGagal(files);
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal memperbarui laporan monev" });
  }
}

async function deleteMonev(req, res) {
  try {
    const { id } = req.params;
    const [[monev]] = await sequelize.query(
      "SELECT petugas_id FROM laporan_monev WHERE id = ?",
      { replacements: [id] }
    );
    if (!monev) return res.status(404).json({ success: false, message: "Laporan monev tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && monev.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    const [fotoRows] = await sequelize.query(
      "SELECT foto_url FROM monev_foto WHERE monev_id = ?",
      { replacements: [id] }
    );
    for (const foto of fotoRows) hapusFileFotoMonev(foto.foto_url);

    await sequelize.query("DELETE FROM laporan_monev WHERE id = ?", { replacements: [id] });
    // Baris di monev_foto ikut terhapus otomatis lewat ON DELETE CASCADE

    res.json({ success: true, message: "Laporan monev berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal menghapus laporan monev" });
  }
}

// ===========================================================================
// PDF: format Nota Dinas Monev
// ===========================================================================

function drawMonevPage(doc, row, fotoList) {
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

  const pembuka = `Berdasarkan ${row.dasar_surat || "-"}. Bersama ini kami sampaikan laporan ${row.perihal || "-"} Di Kecamatan ${row.kecamatan_nama || "-"}, adalah sebagai berikut :`;

  doc.font("Helvetica").fontSize(11).text(pembuka, margin, doc.y, {
    width: contentWidth,
    align: "justify",
    indent: 28,
  });

  doc.moveDown(0.8);

  // Isi laporan (hasil monev) dengan penomoran sejajar
  const isiLaporan = Array.isArray(row.isi_laporan) ? row.isi_laporan : [];
  const nomorWidth = 20;
  const textIndent = margin + nomorWidth + 10;

  isiLaporan.forEach((poin, idx) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(11).text(`${idx + 1}.`, margin, y, { width: nomorWidth, align: "right" });
    doc.text(poin, textIndent, y, { width: contentWidth - (textIndent - margin), align: "justify" });
    doc.moveDown(0.4);
  });

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(11)
    .text(`Demikian laporan hasil pelaksanaan ${row.perihal || "-"}, agar menjadi maklum.`, margin, doc.y, { width: contentWidth });
  doc.moveDown(1.2);

  // ========== FOOTER DUA KOLOM: ANGGOTA (kiri) & TANDA TANGAN (kanan) ==========
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;
  const leftX = margin;
  const rightX = margin + leftColWidth;
  const footerTopY = doc.y;

  // Kolom kiri: daftar anggota tim
  doc.font("Helvetica-Bold").fontSize(10).text("Anggota :", leftX, footerTopY, { width: leftColWidth });
  let anggotaY = doc.y + 2;
  const anggotaTim = Array.isArray(row.anggota_tim) ? row.anggota_tim : [];
  anggotaTim.forEach((nama, idx) => {
    doc.font("Helvetica").fontSize(10).text(`${idx + 1}. ${nama}`, leftX, anggotaY, { width: leftColWidth });
    anggotaY = doc.y + 2;
  });

  // Kolom kanan: blok tanda tangan pelapor
  doc.font("Helvetica").fontSize(11).text("Yang Melapor,", rightX, footerTopY, { width: rightColWidth, align: "center" });
  doc.font("Helvetica-Bold").fontSize(11).text(
    (row.jabatan_pelapor || "KABID LINMAS").toUpperCase(),
    rightX, doc.y + 2, { width: rightColWidth, align: "center" }
  );
  doc.moveDown(2.5);
  doc.font("Helvetica-Bold").fontSize(11).text(
    row.nama_pelapor || "-",
    rightX, doc.y, { width: rightColWidth, align: "center", underline: true }
  );
  doc.font("Helvetica").fontSize(10).text(
    `NIP. ${row.nip_pelapor || "-"}`,
    rightX, doc.y + 2, { width: rightColWidth, align: "center" }
  );

  // Pastikan doc.y berada di bawah blok terpanjang (kiri vs kanan) sebelum footer kode
  doc.y = Math.max(doc.y, anggotaY) + 10;

  // Footer (kode laporan, kecamatan, status) di kiri bawah
  doc.font("Helvetica").fontSize(8).fillColor("#999999").text(
    `Kode Laporan: ${row.kode_laporan}  ·  Kecamatan: ${row.kecamatan_nama || "-"}  ·  Status: ${row.status}`,
    margin,
    doc.page.height - doc.page.margins.bottom - 10
  );
  doc.fillColor("#000000");

  // Halaman foto dokumentasi (jika ada)
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

async function downloadFilteredMonevPDF(req, res) {
  try {
    const { kecamatan_id, status, tanggal, q } = req.query;

    const where = [];
    const replacements = [];

    if (!ROLE_LIHAT_SEMUA.includes(req.user.role)) {
      where.push("m.petugas_id = ?");
      replacements.push(req.user.anggota_id || req.user.id);
    }
    if (kecamatan_id) { where.push("m.kecamatan_id = ?"); replacements.push(kecamatan_id); }
    if (status) { where.push("m.status = ?"); replacements.push(status); }
    if (tanggal) { where.push("m.tanggal = ?"); replacements.push(tanggal); }
    if (q) {
      where.push("(m.kode_laporan LIKE ? OR m.perihal LIKE ? OR a.nama LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await sequelize.query(
      `SELECT m.id, m.kode_laporan, m.tanggal, k.nama AS kecamatan_nama, a.nama AS petugas_nama,
              m.status, m.kepada, m.dari, m.nomor_surat, m.perihal, m.dasar_surat,
              m.isi_laporan, m.anggota_tim, m.nama_pelapor, m.jabatan_pelapor, m.nip_pelapor
       FROM laporan_monev m
       JOIN kecamatan k ON k.id = m.kecamatan_id
       JOIN anggota a ON a.id = m.petugas_id
       ${whereSQL}
       ORDER BY m.tanggal DESC`,
      { replacements }
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=laporan_monev.pdf");
    doc.pipe(res);

    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(12).text("Tidak ada laporan monev yang sesuai dengan filter.", { align: "center" });
    } else {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        if (idx > 0) doc.addPage();
        ["isi_laporan", "anggota_tim"].forEach((field) => {
          if (typeof row[field] === "string") {
            try { row[field] = JSON.parse(row[field]); } catch { row[field] = []; }
          }
        });
        const [fotoList] = await sequelize.query(
          "SELECT id, foto_url FROM monev_foto WHERE monev_id = ? ORDER BY id ASC",
          { replacements: [row.id] }
        );
        drawMonevPage(doc, row, fotoList);
      }
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal membuat PDF laporan monev" });
  }
}

async function downloadSingleMonevPDF(req, res) {
  try {
    const { id } = req.params;

    const [[row]] = await sequelize.query(
      `SELECT m.id, m.kode_laporan, m.tanggal, k.nama AS kecamatan_nama, a.nama AS petugas_nama,
              m.status, m.petugas_id, m.kepada, m.dari, m.nomor_surat, m.perihal, m.dasar_surat,
              m.isi_laporan, m.anggota_tim, m.nama_pelapor, m.jabatan_pelapor, m.nip_pelapor
       FROM laporan_monev m
       JOIN kecamatan k ON k.id = m.kecamatan_id
       JOIN anggota a ON a.id = m.petugas_id
       WHERE m.id = ?`,
      { replacements: [id] }
    );

    if (!row) return res.status(404).json({ success: false, message: "Laporan monev tidak ditemukan" });

    const petugasId = req.user.anggota_id || req.user.id;
    if (!ROLE_LIHAT_SEMUA.includes(req.user.role) && row.petugas_id !== petugasId) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke laporan ini" });
    }

    ["isi_laporan", "anggota_tim"].forEach((field) => {
      if (typeof row[field] === "string") {
        try { row[field] = JSON.parse(row[field]); } catch { row[field] = []; }
      }
    });

    const [fotoList] = await sequelize.query(
      "SELECT id, foto_url FROM monev_foto WHERE monev_id = ? ORDER BY id ASC",
      { replacements: [id] }
    );

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=monev-${row.kode_laporan}.pdf`);
    doc.pipe(res);

    drawMonevPage(doc, row, fotoList);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Gagal membuat PDF laporan monev" });
  }
}

module.exports = {
  getAllMonev,
  getMonevById,
  createMonev,
  updateMonev,
  deleteMonev,
  downloadFilteredMonevPDF,
  downloadSingleMonevPDF,
};