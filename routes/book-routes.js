const express = require("express");
const { check } = require("express-validator");

const bookControllers = require("../controllers/book-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", bookControllers.getBooks);

// router.get("/user/:uid", placesControllers.getPlacesByUserId);

// Middleware pour protéger l'accès aux routes suivantes
router.use(checkAuth);

router.post(
  "/",
  [
    check("titre").not().isEmpty(),
    check("image").not().isEmpty(),
    check("prix").not().isEmpty(),
    check("auteur").not().isEmpty(),
    check("editeur").not().isEmpty(),
    check("dessinateur").not().isEmpty(),
    check("format").not().isEmpty(),
  ],
  bookControllers.createBook
);

// router.patch(
//   "/:pid",
//   [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
//   placesControllers.updatePlace
// );

// router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
