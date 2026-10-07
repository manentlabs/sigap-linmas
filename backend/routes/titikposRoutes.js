const router = require("express").Router();
const {
  getAllTitikPos,
  getTitikPosById,
  createTitikPos,
  updateTitikPos,
  deleteTitikPos,
} = require("../controllers/titikposController");

router.get("/", getAllTitikPos);
router.get("/:id", getTitikPosById);
router.post("/", createTitikPos);
router.put("/:id", updateTitikPos);
router.delete("/:id", deleteTitikPos);

module.exports = router;