const express = require("express");

const productionController = require("../controllers/marvel-prod-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", productionController.getAllProductions);
router.get("/:pid", productionController.getProductionById);

router.post("/", productionController.addProduction);
router.patch("/:pid", productionController.updateProduction);

module.exports = router;
