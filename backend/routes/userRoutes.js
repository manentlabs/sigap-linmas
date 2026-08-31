const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// =====================
// Search Anggota (Autocomplete)
// =====================
router.get(
  "/anggota",
  verifyToken,
  authorizeRoles("admin"),
  userController.searchAnggota
);

// =====================
// CRUD User
// =====================
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  userController.getAllUsers
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  userController.getUserById
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  userController.createUser
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  userController.updateUser
);

router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin"),
  userController.updateStatus
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  userController.deleteUser
);

module.exports = router;