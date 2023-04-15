const HttpError = require("../models/http-error");
const uuid = require("uuid").v4;
const fs = require("fs");
const Collection = require("../models/collection");
const User = require("../models/user");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const getCollectionByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // find the query params : displayMode
  const displayMode = req.query.displayMode;

  let collection;

  try {
    collection = await Collection.find({
      owner: userId,
      possede: true,
    }).populate("book");
  } catch (err) {
    const error = new HttpError(
      "La recherche de la collection de l'utilisateur a échoué.",
      500
    );
    return next(error);
  }

  if (!collection || collection.length === 0) {
    return next(
      new HttpError("La collection n'existe pas ou semble vide...", 404)
    );
  }

  const collectionWithBookId = collection.map((coll) => {
    const { book, ...rest } = coll.toObject({ getters: true });
    const { id } = book;
    return { ...book, ...rest, id_book: id };
  });

  // Fetch editeurs
  let editeurs = [];
  for (const coll of collectionWithBookId) {
    if (!editeurs.includes(coll.editeur)) {
      editeurs.push(coll.editeur);
    }
  }

  let collectionToReturn = [];
  if (displayMode === "bySeries") {
    for (const coll of collectionWithBookId) {
      const { serie, version, titre } = coll;
      const serieToUse = serie ? serie : titre;
      const versionToUse = version ? " (v" + version + ")" : "";
      const serieToUseWithVersion = serieToUse + versionToUse;
      const serieIndex = collectionToReturn.findIndex(
        (serie) => serie.serie === serieToUseWithVersion
      );
      if (serieIndex === -1) {
        collectionToReturn.push({
          serie: serieToUseWithVersion,
          books: [coll],
        });
      } else {
        collectionToReturn[serieIndex].books.push(coll);
      }
    }

    for (const serie of collectionToReturn) {
      serie.books.sort((a, b) => {
        if (a.tome && b.tome) {
          return a.tome - b.tome;
        } else if (a.tome) {
          return -1;
        } else if (b.tome) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    collectionToReturn.sort((a, b) => {
      return a.serie.localeCompare(b.serie);
    });
  } else {
    // sort by alphabetical order of the book title : the title is the serie + version + tome + titre (if serie, tome and version are not null) or the titre (if serie, tome and version are null
    collectionToReturn = collectionWithBookId.sort((a, b) => {
      const {
        serie: serieA,
        tome: tomeA,
        version: versionA,
        titre: titreA,
      } = a;
      const {
        serie: serieB,
        tome: tomeB,
        version: versionB,
        titre: titreB,
      } = b;
      const serieToUseA = serieA ? serieA : titreA;
      const versionToUseA = versionA ? " (v" + versionA + ")" : "";
      const tomeToUseA = tomeA ? " - tome " + tomeA : "";
      const serieToUseWithVersionAndTomeA =
        serieToUseA + versionToUseA + tomeToUseA;
      const serieToUseB = serieB ? serieB : titreB;
      const versionToUseB = versionB ? " (v" + versionB + ")" : "";
      const tomeToUseB = tomeB ? " - tome " + tomeB : "";
      const serieToUseWithVersionAndTomeB =
        serieToUseB + versionToUseB + tomeToUseB;
      return serieToUseWithVersionAndTomeA.localeCompare(
        serieToUseWithVersionAndTomeB
      );
    });
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

  const { ids_book, id_user, list_name, book, date_achat } = req.body;

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
        if (date_achat) collection.date_achat = date_achat;
      } else if (list_name === "wishlist" && !collection.possede) {
        collection.souhaite = true;
      }
    } else {
      collection = new Collection({
        book: id_book,
        owner: id_user,
        possede: list_name === "collection" ? true : false,
        souhaite: list_name === "wishlist" ? true : false,
        date_achat: list_name === "collection" ? date_achat : null,
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

  // if book, update book
  if (book) {
    if (list_name === "collection") {
      book.possede = true;
      book.souhaite = false;
      if (date_achat) book.date_achat = date_achat;
    } else if (list_name === "wishlist" && !book.possede) {
      book.souhaite = true;
    }
  }

  res.status(201).json({ success: true, book: book });
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

  const { id_book, id_user, lu, lien, review, note, date_lecture } = req.body;

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
    if (date_lecture) collection.date_lecture = date_lecture;
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
