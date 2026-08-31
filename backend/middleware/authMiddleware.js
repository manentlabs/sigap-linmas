// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// Memastikan request membawa token JWT yang valid di header Authorization
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token akses tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, kecamatan_id }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token tidak valid atau sudah kedaluwarsa." });
  }
}

// Membatasi endpoint hanya untuk role tertentu, contoh: authorizeRoles('admin', 'kepala_satgas')
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk aksi ini." });
    }
    next();
  };
}

module.exports = { verifyToken, authorizeRoles };
