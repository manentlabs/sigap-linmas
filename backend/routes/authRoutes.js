// backend/routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const { login, me } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Format email tidak valid."),
    body("password").notEmpty().withMessage("Kata sandi wajib diisi."),
  ],
  login
);

router.get("/me", verifyToken, me);

module.exports = router;
