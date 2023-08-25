const HttpError = require("../models/http-error");
const uuid = require("uuid").v4;
const fs = require("fs");
const Collection = require("../models/collection");
const User = require("../models/user");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const getCollectionByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  const displayMode = req.query.displayMode;

  let collection;

  try {
    collection = await Collection.find({ owner: userId, possede: true })
      .select("-souhaite -read_dates -review -lien")
      .populate({
        path: "book",
        select:
          "-auteurs -date_parution -poids -planches -format -genre -dessinateurs",
      });
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
  const editeursSet = new Set(collectionWithBookId.map((coll) => coll.editeur));
  const editeurs = Array.from(editeursSet);

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

    collectionToReturn.forEach((serie) => {
      serie.books.sort((a, b) =>
        a.tome && b.tome ? a.tome - b.tome : a.tome ? -1 : b.tome ? 1 : 0
      );

      // Tri des livres avec quicksort
      const quickSort = (arr) => {
        if (arr.length <= 1) return arr;
        const pivot = arr[0].tome;
        const left = [];
        const right = [];
        for (let i = 1; i < arr.length; i++) {
          if (!arr[i].tome) {
            left.push(arr[i]);
          } else if (arr[i].tome < pivot) {
            left.push(arr[i]);
          } else {
            right.push(arr[i]);
          }
        }
        return [...quickSort(left), arr[0], ...quickSort(right)];
      };

      serie.books = quickSort(serie.books);
    });

    collectionToReturn.sort((a, b) => {
      return a.serie.localeCompare(b.serie);
    });
  } else {
    collectionToReturn = collectionWithBookId.sort((a, b) => {
      const getStringForSorting = (book) => {
        const { serie, tome, version, titre } = book;
        const serieToUse = serie || titre;
        const versionToUse = version ? ` (v${version})` : "";
        const tomeToUse = tome ? ` - tome ${tome}` : "";
        return `${serieToUse}${versionToUse}${tomeToUse}${titre}`;
      };

      const stringA = getStringForSorting(a);
      const stringB = getStringForSorting(b);

      return stringA.localeCompare(stringB);
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
    collection = await Collection.find({ owner: userId, souhaite: true })
      .select("book")
      .populate({
        path: "book",
        select: "_id serie titre date_parution tome prix image version",
      })
      .sort({ titre: 1 })
      .lean();
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
    const { book } = coll;
    const { _id, titre, image, serie, date_parution, tome, prix, version } =
      book;
    return {
      id_book: _id,
      titre,
      image,
      serie,
      date_parution,
      tome,
      prix,
      version,
    };
  });

  res.json({
    wishlist: collectionToReturn,
  });
};

const getFutureWishlistByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  const maintenant = new Date();

  const premierJourMoisCourant = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );

  premierJourMoisCourant.setHours(0, 0, 0, 0);

  let collection;

  try {
    collection = await Collection.find({ owner: userId, souhaite: true })
      .select("-possede -date_achat -read_dates -review -lien -lu -critique")
      .populate({
        path: "book",
        select:
          "-auteurs -poids -planches -format -genre -dessinateurs -type -editeur",
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

  const collectionToReturn = collection
    .filter((coll) => {
      const { date_parution: dateSortie } = coll.book;
      return dateSortie > premierJourMoisCourant;
    })
    .map((coll) => {
      const { book } = coll.toObject({ getters: true });
      return { ...book };
    });

  collectionToReturn.sort((a, b) => {
    const { titre: titreA } = a;
    const { titre: titreB } = b;
    return titreA.localeCompare(titreB);
  });

  console.log(collectionToReturn);
  res.json({
    wishlist: collectionToReturn,
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
      select: "-auteurs -format -genre -dessinateurs",
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

const getReadlistByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let collection;
  try {
    collection = await Collection.find({ owner: userId, lu: true })
      .select("book read_dates")
      .populate({
        path: "book",
        select: "_id serie titre tome image version",
      });
  } catch (err) {
    const error = new HttpError(
      "Fetching readlist failed, please try again later",
      500
    );
    return next(error);
  }

  if (!collection || collection.length === 0) {
    return next(
      new HttpError("La readlist n'existe pas ou semble vide...", 404)
    );
  }

  const allReadBooks = collection.map((coll) => {
    const { book, read_dates } = coll;
    const { _id, serie, titre, tome, image, version } = book;
    return read_dates.map((date) => {
      return {
        id_book: _id,
        serie,
        titre,
        tome,
        image,
        version,
        date,
      };
    });
  });

  const readBooks = allReadBooks.flat();

  const readBooksByDate = readBooks.reduce((acc, book) => {
    const { date } = book;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(book);
    return acc;
  }, {});

  const readBooksByDateSorted = Object.keys(readBooksByDate)
    .sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    })
    .reduce((acc, key) => {
      acc[key] = readBooksByDate[key];
      return acc;
    }, {});

  // non read books
  let unreadCollection;
  try {
    unreadCollection = await Collection.find({
      owner: userId,
      possede: true,
      lu: { $ne: true },
    })
      .select("book date_achat")
      .populate({
        path: "book",
        select: "_id serie titre tome image version planches",
      });
  } catch (err) {
    const error = new HttpError(
      "Fetching readlist failed, please try again later",
      500
    );
    return next(error);
  }

  if (!unreadCollection || unreadCollection.length === 0) {
    return next(
      new HttpError(
        "La liste de livres non lus n'existe pas ou semble vide...",
        404
      )
    );
  }

  const allUnreadBooks = unreadCollection.map((coll) => {
    const { book, date_achat } = coll;
    const { _id, serie, titre, tome, image, version, planches } = book;
    return {
      id_book: _id,
      serie,
      titre,
      tome,
      image,
      version,
      date_achat,
      planches,
    };
  });

  allUnreadBooks.sort((a, b) => {
    const getStringForSorting = (book) => {
      const { serie, tome, version, titre } = book;
      const serieToUse = serie || titre;
      const versionToUse = version ? ` (v${version})` : "";
      const tomeToUse = tome ? ` - tome ${tome}` : "";
      return `${serieToUse}${versionToUse}${tomeToUse}${titre}`;
    };

    const stringA = getStringForSorting(a);
    const stringB = getStringForSorting(b);

    return stringA.localeCompare(stringB);
  });

  res.json({
    readlist: readBooksByDateSorted,
    unreadlist: allUnreadBooks,
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

  if (!collection) {
    // create collection
    collection = new Collection({
      book: id_book,
      owner: id_user,
      souhaite: false,
      possede: false,
    });
  }

  if (collection) {
    if (lu) collection.lu = lu;
    if (date_lecture) collection.read_dates.push(date_lecture);
    if (lien) collection.lien = lien;
    if (review || lien) collection.critique = true;
    if (review) collection.review = review;
    if (note) collection.note = note;
  } else {
    const error = new HttpError(
      "La création du lien avec ce livre a échoué, veuillez réessayer.",
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

const deleteWishlist = async (req, res, next) => {
  const userId = req.params.uid;
  const bookId = req.params.bid;

  let wishlist;
  try {
    wishlist = await Collection.findOne({
      owner: userId,
      book: bookId,
      souhaite: true,
    });
  } catch (err) {
    const error = new HttpError(
      "Une erreur a eu lieu, veuillez réessayer.",
      500
    );
    return next(error);
  }

  if (!wishlist) {
    const error = new HttpError(
      "L'élément ne semble pas être dans votre wishlist, veuillez réessayer.",
      500
    );
    return next(error);
  }

  if (wishlist.lu === true) {
    wishlist.souhaite = false;

    try {
      await wishlist.save();
    } catch (err) {
      const error = new HttpError(
        "La mise à jour de la collection a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }
  } else {
    try {
      await wishlist.deleteOne();
    } catch (err) {
      const error = new HttpError(
        "La suppression a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }
  }

  res.status(200).json({ success: true, message: "Livre supprimé !" });
};

exports.getCollectionByUserId = getCollectionByUserId;
exports.addBookToCollection = addBookToCollection;
exports.editCollection = editCollection;
exports.getWishlistByUserId = getWishlistByUserId;
exports.getCollectionStatsByUserId = getCollectionStatsByUserId;
exports.getFutureWishlistByUserId = getFutureWishlistByUserId;
exports.deleteWishlist = deleteWishlist;
exports.getReadlistByUserId = getReadlistByUserId;
