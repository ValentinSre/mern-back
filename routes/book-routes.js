const express = require("express");
const { check } = require("express-validator");

const bookControllers = require("../controllers/book-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", bookControllers.getBooks);
router.get("/all-information", bookControllers.getAllBooksInformation);
router.get("/future-releases", bookControllers.getFutureReleases);
router.get("/search", bookControllers.searchBooks);
router.get("/:bid", bookControllers.getBookById);

// router.get("/user/:uid", placesControllers.getPlacesByUserId);

// Middleware pour protéger l'accès aux routes suivantes
router.use(checkAuth);

router.post(
  "/",
  [
    check("titre").not().isEmpty(),
    check("editeur").not().isEmpty(),
    check("prix").not().isEmpty(),
    // check("auteurs").not().isEmpty(),
    // check("dessinateurs").not().isEmpty(),
  ],
  bookControllers.createBook
);

router.patch("/edit/:bid", bookControllers.updateBook);

router.delete("/:bid", bookControllers.deleteBook);

module.exports = router;
