const HttpError = require("../models/http-error");
const uuid = require("uuid").v4;
const fs = require("fs");
const Collection = require("../models/collection");
const User = require("../models/user");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const getCollectionByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let collection;

  try {
    collection = await Collection.find({
      owner: userId,
      possede: true,
    }).populate({
      path: "book",
      populate: [
        { path: "auteurs", model: "Artist" },
        { path: "dessinateurs", model: "Artist" },
      ],
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching collection failed, please try again later",
      500
    );
    return next(error);
  }

  if (!collection || collection.length === 0) {
    return next(
      new HttpError("La collection n'existe pas ou semble vide...", 404)
    );
  }

  const collectionToReturn = collection.map((coll) => {
    const { book, ...rest } = coll.toObject({ getters: true });
    const { id } = book;
    return { ...book, ...rest, id_book: id };
  });

  // Fetch editeurs
  let editeurs = [];
  for (const coll of collectionToReturn) {
    if (!editeurs.includes(coll.editeur)) {
      editeurs.push(coll.editeur);
    }
  }

  res.json({
    collection: collectionToReturn,
    editeurs: editeurs,
  });
};

const getWishlistByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let collection;

  try {
    collection = await Collection.find({
      owner: userId,
      souhaite: true,
    }).populate({
      path: "book",
      populate: [
        { path: "auteurs", model: "Artist" },
        { path: "dessinateurs", model: "Artist" },
      ],
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching collection failed, please try again later",
      500
    );
    return next(error);
  }

  if (!collection || collection.length === 0) {
    return next(
      new HttpError("La collection n'existe pas ou semble vide...", 404)
    );
  }

  const collectionToReturn = collection.map((coll) => {
    const { book, ...rest } = coll.toObject({ getters: true });
    const { id } = book;
    return { ...book, ...rest, id_book: id };
  });

  // Trier la wishlist entre deux listes : les livres déjà sortis et ceux qui ne le sont pas encore
  const wishlistSortie = collectionToReturn.filter(
    (coll) => new Date(coll.date_parution) < new Date()
  );
  const wishlistNonSortie = collectionToReturn.filter(
    (coll) => new Date(coll.date_parution) >= new Date()
  );

  // Trier la wishlistSortie par date de sortie croissante
  wishlistSortie.sort((a, b) => {
    return new Date(a.sortie) - new Date(b.sortie);
  });

  let editeurs = [];
  for (const coll of collectionToReturn) {
    if (!editeurs.includes(coll.editeur)) {
      editeurs.push(coll.editeur);
    }
  }

  res.json({
    available: wishlistSortie,
    incoming: wishlistNonSortie,
    editeurs: editeurs,
  });
};

const getCollectionStatsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let collection;

  try {
    collection = await Collection.find({
      owner: userId,
    }).populate({
      path: "book",
      populate: [
        { path: "auteurs", model: "Artist" },
        { path: "dessinateurs", model: "Artist" },
      ],
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching collection failed, please try again later",
      500
    );
    return next(error);
  }

  if (!collection || collection.length === 0) {
    return next(
      new HttpError("La collection n'existe pas ou semble vide...", 404)
    );
  }

  const collectionToReturn = collection.map((coll) => {
    const { book, ...rest } = coll.toObject({ getters: true });
    const { id } = book;
    return { ...book, ...rest, id_book: id };
  });

  // Fetch editeurs
  let editeurs = [];
  for (const coll of collectionToReturn) {
    if (!editeurs.includes(coll.editeur)) {
      editeurs.push(coll.editeur);
    }
  }

  res.json({
    collection: collectionToReturn,
    editeurs: editeurs,
  });
};

const addBookToCollection = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    next(error);
  }

  const { ids_book, id_user, list_name } = req.body;

  for (const id_book of ids_book) {
    let collection;
    try {
      collection = await Collection.findOne({ book: id_book, owner: id_user });
    } catch (err) {
      const error = new HttpError(
        "La création de la collection a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }

    if (collection) {
      if (list_name === "collection") {
        collection.possede = true;
        collection.souhaite = false;
      } else if (list_name === "wishlist" && !collection.possede) {
        collection.souhaite = true;
      }
    } else {
      collection = new Collection({
        book: id_book,
        owner: id_user,
        possede: list_name === "collection" ? true : false,
        souhaite: list_name === "wishlist" ? true : false,
      });
    }

    try {
      await collection.save();
    } catch (err) {
      const error = new HttpError(
        "La création de la collection a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }
  }

  res.status(201).json({ success: true });
};

const editCollection = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    next(error);
  }

  const { id_book, id_user, lu, lien, review, note } = req.body;

  let collection;
  try {
    collection = await Collection.findOne({ book: id_book, owner: id_user });
  } catch (err) {
    const error = new HttpError(
      "La création de la collection a échoué, veuillez réessayer.",
      500
    );
    return next(error);
  }

  if (collection) {
    if (lu) collection.lu = lu;
    if (lu) collection.date_lecture = Date.now();
    if (lien) collection.lien = lien;
    if (review || lien) collection.critique = true;
    if (review) collection.review = review;
    if (note) collection.note = note;
  } else {
    const error = new HttpError(
      "Ce livre n'existe pas dans votre collection.",
      500
    );
    return next(error);
  }

  try {
    await collection.save();
  } catch (err) {
    const error = new HttpError(
      "La modification de la collection a échoué, veuillez réessayer.",
      500
    );
    return next(error);
  }

  res.status(201).json({
    success: true,
    message: "La modification a bien été enregistrée !",
  });
};

exports.getCollectionByUserId = getCollectionByUserId;
exports.addBookToCollection = addBookToCollection;
exports.editCollection = editCollection;
exports.getWishlistByUserId = getWishlistByUserId;
exports.getCollectionStatsByUserId = getCollectionStatsByUserId;
