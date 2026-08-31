const router = require("express").Router();
const {
  getAllAgenda,
  getAgendaById,
  createAgenda,
  updateAgenda,
  deleteAgenda,
} = require("../controllers/agendaController");

router.get("/", getAllAgenda);
router.get("/:id", getAgendaById);
router.post("/", createAgenda);
router.put("/:id", updateAgenda);
router.delete("/:id", deleteAgenda);

module.exports = router;