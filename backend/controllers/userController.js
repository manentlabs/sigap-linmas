const sequelize = require("../config/database");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// Role yang wajib memiliki kecamatan_id
const ROLES_WITH_KECAMATAN = ["operator_kecamatan", "non_p3k"];

// GET /api/users
async function getAllUsers(req, res) {
  try {
    const {
      q,
      role,
      kecamatan_id,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const where = [];
    const replacements = [];

    if (q) {
      where.push("(u.nama LIKE ? OR u.email LIKE ? OR u.username LIKE ?)");
      replacements.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (role) {
      where.push("u.role = ?");
      replacements.push(role);
    }

    if (kecamatan_id) {
      where.push("u.kecamatan_id = ?");
      replacements.push(kecamatan_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[count]] = await sequelize.query(
      `SELECT COUNT(*) total
       FROM users u
       ${whereSql}`,
      { replacements }
    );

    const [rows] = await sequelize.query(
      `SELECT
          u.id,
          u.nama,
          u.email,
          u.username,
          u.role,
          u.kecamatan_id,
          k.nama AS kecamatan_nama,
          u.is_active,
          u.created_at
       FROM users u
       LEFT JOIN kecamatan k
            ON k.id=u.kecamatan_id
       ${whereSql}
       ORDER BY u.id DESC
       LIMIT ${limitNum}
       OFFSET ${offset}`,
      { replacements }
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count.total,
        totalPages: Math.ceil(count.total / limitNum),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil user",
    });
  }
}

// GET /api/users/:id
async function getUserById(req, res) {
  try {
    const [rows] = await sequelize.query(
      `SELECT *
       FROM users
       WHERE id=?`,
      {
        replacements: [req.params.id],
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
}

// POST /api/users
async function createUser(req, res) {
  try {
    const {
      nama,
      email,
      username,
      password,
      role,
      kecamatan_id,
      is_active = 1,
    } = req.body;

    if (!nama || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Data belum lengkap",
      });
    }

    if (ROLES_WITH_KECAMATAN.includes(role) && !kecamatan_id) {
      return res.status(400).json({
        success: false,
        message: "Kecamatan wajib diisi untuk role ini",
      });
    }

    const cleanUsername = username ? username.trim() : null;

    if (cleanUsername && !/^[a-zA-Z0-9._-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username hanya boleh huruf, angka, titik, garis bawah, atau strip (3-30 karakter)",
      });
    }

    // Cek email & username sudah dipakai atau belum (dalam satu query)
    const [cek] = await sequelize.query(
      `SELECT id, email, username
       FROM users
       WHERE email=? ${cleanUsername ? "OR username=?" : ""}`,
      {
        replacements: cleanUsername
          ? [email, cleanUsername]
          : [email],
      }
    );

    if (cek.length) {
      const emailTaken = cek.some((r) => r.email === email);
      return res.status(409).json({
        success: false,
        message: emailTaken ? "Email sudah digunakan" : "Username sudah digunakan",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await sequelize.query(
      `INSERT INTO users
      (
        nama,
        email,
        username,
        password_hash,
        role,
        kecamatan_id,
        is_active
      )
      VALUES(?,?,?,?,?,?,?)`,
      {
        replacements: [
          nama,
          email,
          cleanUsername,
          passwordHash,
          role,
          ROLES_WITH_KECAMATAN.includes(role) ? kecamatan_id : null,
          is_active,
        ],
      }
    );

    res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal membuat user",
    });
  }
}

// PUT /api/users/:id
async function updateUser(req, res) {
  try {
    const { id } = req.params;

    const {
      nama,
      email,
      username,
      password,
      role,
      kecamatan_id,
      is_active,
    } = req.body;

    const [rows] = await sequelize.query(
      "SELECT * FROM users WHERE id=?",
      {
        replacements: [id],
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Tentukan role efektif (role baru jika dikirim, atau role lama)
    const effectiveRole = role || rows[0].role;

    if (
      ROLES_WITH_KECAMATAN.includes(effectiveRole) &&
      !kecamatan_id &&
      !rows[0].kecamatan_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Kecamatan wajib diisi untuk role ini",
      });
    }

    let cleanUsername;
    if (username !== undefined) {
      cleanUsername = username ? username.trim() : null;

      if (cleanUsername && !/^[a-zA-Z0-9._-]{3,30}$/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message:
            "Username hanya boleh huruf, angka, titik, garis bawah, atau strip (3-30 karakter)",
        });
      }

      if (cleanUsername) {
        const [dupe] = await sequelize.query(
          "SELECT id FROM users WHERE username=? AND id<>?",
          { replacements: [cleanUsername, id] }
        );
        if (dupe.length) {
          return res.status(409).json({
            success: false,
            message: "Username sudah digunakan",
          });
        }
      }
    }

    if (email !== undefined) {
      const [dupeEmail] = await sequelize.query(
        "SELECT id FROM users WHERE email=? AND id<>?",
        { replacements: [email, id] }
      );
      if (dupeEmail.length) {
        return res.status(409).json({
          success: false,
          message: "Email sudah digunakan",
        });
      }
    }

    const fields = [];
    const replacements = [];

    function add(col, value) {
      if (value !== undefined) {
        fields.push(`${col}=?`);
        replacements.push(value);
      }
    }

    add("nama", nama);
    add("email", email);
    if (username !== undefined) add("username", cleanUsername);
    add("role", role);

    if (ROLES_WITH_KECAMATAN.includes(effectiveRole)) {
      add("kecamatan_id", kecamatan_id);
    } else if (role) {
      add("kecamatan_id", null);
    }

    add("is_active", is_active);

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      add("password_hash", hash);
    }

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data untuk diperbarui",
      });
    }

    replacements.push(id);

    await sequelize.query(
      `UPDATE users
       SET ${fields.join(",")}
       WHERE id=?`,
      {
        replacements,
      }
    );

    res.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal update user",
    });
  }
}

// DELETE
async function deleteUser(req, res) {
  try {
    await sequelize.query(
      "DELETE FROM users WHERE id=?",
      {
        replacements: [req.params.id],
      }
    );

    res.json({
      success: true,
      message: "User berhasil dihapus",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user",
    });
  }
}

// PATCH STATUS
async function updateStatus(req, res) {
  try {
    await sequelize.query(
      `UPDATE users
       SET is_active=?
       WHERE id=?`,
      {
        replacements: [
          req.body.is_active,
          req.params.id,
        ],
      }
    );

    res.json({
      success: true,
      message: "Status berhasil diperbarui",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal update status",
    });
  }
}

// AUTOCOMPLETE ANGGOTA
async function searchAnggota(req, res) {
  try {
    const q = req.query.q || "";

    const [rows] = await sequelize.query(
      `SELECT
          a.id,
          a.kode_anggota,
          a.nama,
          a.kecamatan_id,
          k.nama AS kecamatan_nama
      FROM anggota a
      JOIN kecamatan k
          ON k.id=a.kecamatan_id
      WHERE
          a.nama LIKE ?
          OR a.kode_anggota LIKE ?
      ORDER BY a.nama
      LIMIT 10`,
      {
        replacements: [
          `%${q}%`,
          `%${q}%`,
        ],
      }
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Gagal mencari anggota",
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateStatus,
  searchAnggota,
};