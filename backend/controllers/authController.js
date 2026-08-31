// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function toPublicUser(user) {
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    username: user.username,
    role: user.role,
    kecamatan_id: user.kecamatan_id,
  };
}

// POST /api/auth/login
// Body: { identifier, password }  -- identifier boleh diisi email ATAU username
exports.login = async (req, res) => {
  // Hasil validasi dari express-validator (lihat routes/authRoutes.js)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Data yang dikirim tidak valid.",
      errors: errors.array(),
    });
  }

  const { identifier, password } = req.body;
  const cleanIdentifier = (identifier || "").trim();

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email/username atau kata sandi salah.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Akun ini sudah dinonaktifkan. Hubungi admin sistem.",
      });
    }

    const cocok = await bcrypt.compare(password, user.password_hash);
    if (!cocok) {
      return res.status(401).json({
        success: false,
        message: "Email/username atau kata sandi salah.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        kecamatan_id: user.kecamatan_id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: `Selamat datang, ${user.nama}.`,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server. Coba lagi beberapa saat.",
    });
  }
};

// GET /api/auth/me  (butuh middleware verifyToken)
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }
    return res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
  }
};