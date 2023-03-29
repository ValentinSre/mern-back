const express = require("express");
const { check } = require("express-validator");

const collectionControllers = require("../controllers/collection-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:uid", collectionControllers.getCollectionByUserId);

// Middleware pour protéger l'accès aux routes suivantes
router.use(checkAuth);
router.post("/add", collectionControllers.addBookToCollection);

module.exports = router;
