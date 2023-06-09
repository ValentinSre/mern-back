const express = require("express");

const collectionControllers = require("../controllers/collection-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/wishlist/:uid", collectionControllers.getWishlistByUserId);
router.get("/readlist/:uid", collectionControllers.getReadlistByUserId);
router.get(
  "/my-releases/:uid",
  collectionControllers.getFutureWishlistByUserId
);
router.get("/stats/:uid", collectionControllers.getCollectionStatsByUserId);
router.get("/:uid", collectionControllers.getCollectionByUserId);

// Middleware pour protéger l'accès aux routes suivantes
router.use(checkAuth);
router.post("/add", collectionControllers.addBookToCollection);
router.post("/edit", collectionControllers.editCollection);

router.delete("/wishlist/:uid/:bid", collectionControllers.deleteWishlist);

module.exports = router;
