const router = require("express").Router();

const { uploadAduanMiddleware } = require("../middleware/uploadAduan");

const {
  getAllAduan,
  getAduanById,
  createAduan,
  updateAduan,
  deleteAduan,
} = require("../controllers/aduanController");

router.get("/", getAllAduan);
router.get("/:id", getAduanById);

router.post("/", uploadAduanMiddleware, createAduan);
router.put("/:id", uploadAduanMiddleware, updateAduan);

router.delete("/:id", deleteAduan);

module.exports = router;