const router = require("express").Router();
const { getDataSebaran } = require("../controllers/sebaranController");

router.get("/", getDataSebaran);

module.exports = router;