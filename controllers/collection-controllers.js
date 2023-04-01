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
    }).populate("book");
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
    return { ...book, ...rest };
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

  const { ids_book, id_user, list_name, books } = req.body;

  let updatedBooks = books.slice(); // Créer une copie du tableau de livres

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

    // Mettre à jour la liste de livres où on ajoute la collection
    const bookIndex = updatedBooks.findIndex((b) => b.id === id_book);
    if (bookIndex >= 0) {
      if (list_name === "collection") {
        updatedBooks[bookIndex].possede = true;
        updatedBooks[bookIndex].souhaite = false;
      } else if (list_name === "wishlist" && !updatedBooks[bookIndex].possede) {
        updatedBooks[bookIndex].souhaite = true;
      }
    }
  }

  res.status(201).json({ books: updatedBooks });
};

exports.getCollectionByUserId = getCollectionByUserId;
exports.addBookToCollection = addBookToCollection;
