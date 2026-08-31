const router = require("express").Router();
const {
  getAllTitikPkl,
  getTitikPklById,
  createTitikPkl,
  updateTitikPkl,
  deleteTitikPkl,
} = require("../controllers/titikpklController");

router.get("/", getAllTitikPkl);
router.get("/:id", getTitikPklById);
router.post("/", createTitikPkl);
router.put("/:id", updateTitikPkl);
router.delete("/:id", deleteTitikPkl);

module.exports = router;