const express = require("express");
const { check } = require("express-validator");

const collectionControllers = require("../controllers/collection-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:uid", collectionControllers.getCollectionByUserId);

// Middleware pour protéger l'accès aux routes suivantes
router.use(checkAuth);

router.post(
  "/",
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  collectionControllers.createPlace
);

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  collectionControllers.updatePlace
);

router.delete("/:pid", collectionControllers.deletePlace);

module.exports = router;
