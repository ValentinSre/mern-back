const HttpError = require("../models/http-error");
const Book = require("../models/book");
const Collection = require("../models/collection");
const Artist = require("../models/artist");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const HTTP_STATUS = {
  SUCCESS: 201,
  ERROR: 500,
  INVALID_DATA: 422,
};

const ERROR_MESSAGES = {
  INVALID_DATA: "Informations invalides, please check your data.",
  CREATE_FAILED: "Creating book failed, please try again.",
};

const getBooks = async (req, res, next) => {
  const { user } = req.query;

  let books;
  try {
    books = await Book.find(
      {},
      {
        _id: 1,
        serie: 1,
        titre: 1,
        editeur: 1,
        tome: 1,
        prix: 1,
        image: 1,
        format: 1,
        type: 1,
        version: 1,
      }
    );
  } catch (err) {
    const error = new HttpError(
      "La collecte de livres a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  let collection;
  if (user !== "undefined") {
    try {
      collection = await Collection.find({ owner: user });
    } catch (err) {
      const error = new HttpError(
        "La comparaison de la bibliothèque avec votre collection a échoué, veuillez réessayer...",
        500
      );
      return next(error);
    }
  }

  // Fusionner les listes de books et de collections
  const mergedBooks = books.map((book) => {
    const bookObj = book.toObject({ getters: true });
    if (collection) {
      const bookCollection = collection.find(
        (col) => col.book.toString() === book._id.toString()
      );
      if (bookCollection) {
        bookObj.souhaite = bookCollection.souhaite;
        bookObj.possede = bookCollection.possede;
      }
    }
    return bookObj;
  });

  res.json({ books: mergedBooks });
};

const getBookById = async (req, res, next) => {
  const bookId = req.params.bid;
  const { user } = req.query;

  let bookById;
  try {
    bookById = await Book.findById(bookId).populate([
      { path: "auteurs", model: "Artist" },
      { path: "dessinateurs", model: "Artist" },
    ]);
  } catch (err) {
    const error = new HttpError(
      "La collecte de livre a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  let collection;

  if (user !== "undefined") {
    try {
      collection = await Collection.find({ owner: user, book: bookId });
    } catch (err) {
      const error = new HttpError(
        "La comparaison du livre avec votre collection a échoué, veuillez réessayer...",
        500
      );
      return next(error);
    }
  }

  if (!bookById) {
    const error = new HttpError(
      "Impossible de trouver le livre avec l'identifiant fourni.",
      404
    );
    return next(error);
  }
  let bookObj = bookById.toObject({ getters: true });
  // Regarder si le livre est dans la collection de l'utilisateur
  if (collection) {
    const bookCollection = collection[0];

    if (bookCollection) {
      bookObj.souhaite = bookCollection.souhaite;
      bookObj.possede = bookCollection.possede;
      bookObj.critique = bookCollection.critique;
      bookObj.lu = bookCollection.lu;
      bookObj.note = bookCollection.note;
      bookObj.read_dates = bookCollection.read_dates;
      bookObj.date_achat = bookCollection.date_achat;
      bookObj.lien = bookCollection.lien;
    }
  }

  res.status(200).json({ book: bookObj });
};

const getFutureReleases = async (req, res, next) => {
  const maintenant = new Date();

  const premierJourMoisCourant = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );

  premierJourMoisCourant.setHours(0, 0, 0, 0);

  let books;

  try {
    books = await Book.find({
      date_parution: { $gte: premierJourMoisCourant },
    }).select("date_parution titre serie tome image version");
  } catch (err) {
    const error = new HttpError(
      "La collecte de livres à venir a échoué, veuillez réessayer...",

      500
    );

    return next(error);
  }

  res.json({ books: books.map((book) => book.toObject({ getters: true })) });
};

const getAllBooksInformation = async (req, res, next) => {
  try {
    const editeurs = await Book.distinct("editeur", {
      editeur: { $ne: null, $ne: undefined },
    });
    const genres = await Book.distinct("genre", {
      genre: { $ne: null, $ne: undefined },
    });
    const formats = await Book.distinct("format", {
      format: { $ne: null, $ne: undefined },
    });
    const series = await Book.distinct("serie", {
      serie: { $ne: null, $ne: undefined },
    });
    const artistes = await Artist.distinct("nom", {});

    const options = {
      editeurs,
      genres,
      formats,
      series,
      artistes,
    };

    res.status(200).json(options);
  } catch (err) {
    const error = new HttpError(
      "La collecte d'informations sur les livres a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }
};

const createBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      ERROR_MESSAGES.INVALID_DATA,
      HTTP_STATUS.INVALID_DATA
    );
    return next(error);
  }

  const {
    titre,
    serie,
    tome,
    version,
    image,
    prix,
    auteurs,
    editeur,
    date_parution,
    format,
    genre,
    dessinateurs,
    type,
    poids,
    planches,
  } = req.body;

  const bookModel = {
    titre,
    editeur,
    prix,
    image,
    type: type || "Comics",
  };

  if (serie) bookModel.serie = serie;
  if (tome) bookModel.tome = tome;
  if (date_parution) bookModel.date_parution = date_parution;
  if (format) bookModel.format = format;
  if (genre) bookModel.genre = genre;
  if (version) bookModel.version = version;
  if (planches) bookModel.planches = planches;
  if (poids) bookModel.poids = poids;

  const { auteursFromDB, dessinateursFromDB } = await manageArtists(
    auteurs,
    dessinateurs
  );

  bookModel.auteurs = auteursFromDB;
  bookModel.dessinateurs = dessinateursFromDB;

  const createdBook = new Book(bookModel);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdBook.save({ session: sess });

    const authorsPromises = auteursFromDB.map((auteur) => {
      auteur.books.push(createdBook);
      return auteur.save({ session: sess });
    });

    const dessinateursPromises = dessinateursFromDB.map((dessinateur) => {
      dessinateur.books.push(createdBook);
      return dessinateur.save({ session: sess });
    });

    await Promise.all([...authorsPromises, ...dessinateursPromises]);

    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      ERROR_MESSAGES.CREATE_FAILED,
      HTTP_STATUS.ERROR
    );
    return next(error);
  }

  res.status(HTTP_STATUS.SUCCESS).json({ bookId: createdBook.id });
};

const updateBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const bookId = req.params.bid;

  const { auteursFromDB, dessinateursFromDB } = await manageArtists(
    req.body.auteurs,
    req.body.dessinateurs
  );

  let book;

  try {
    book = await Book.findById(bookId);
  } catch (err) {
    const error = new HttpError(
      "Le livre à éditer n'a pas été trouvé, veuillez réessayer.",
      500
    );
    return next(error);
  }

  book = { ...book, ...req.body, auteursFromDB, dessinateursFromDB };

  try {
    await book.save();
  } catch (err) {
    const error = new HttpError(
      "La mise à jour du livre a échoué, veuillez réessayer.",
      500
    );
    return next(error);
  }

  res.status(200).json({ book: book.toObject({ getters: true }) });
};

const createArtist = async (nom, auteur, dessinateur) => {
  const newArtist = new Artist({
    nom,
    books: [],
    auteur,
    dessinateur,
  });

  try {
    await newArtist.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "La création de l'artiste a échoué, veuillez réessayer.",
      500
    );
    throw error;
  }

  return newArtist;
};

const manageArtists = async (auteurs, dessinateurs) => {
  const artistNames = [...auteurs, ...dessinateurs];
  const artistsFromDB = {};

  try {
    const foundArtists = await Artist.find({ nom: { $in: artistNames } });
    for (const artist of foundArtists) {
      artistsFromDB[artist.nom] = artist;
    }
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "La recherche des artistes a échoué, veuillez réessayer.",
      500
    );
    throw error;
  }

  const auteursFromDB = [];
  for (const auteurName of auteurs) {
    if (artistsFromDB[auteurName]) {
      auteursFromDB.push(artistsFromDB[auteurName]);
    } else {
      const newArtist = await createArtist(auteurName, true, false);
      artistsFromDB[auteurName] = newArtist;
      auteursFromDB.push(newArtist);
    }
  }

  const dessinateursFromDB = [];
  for (const dessinateurName of dessinateurs) {
    if (artistsFromDB[dessinateurName]) {
      dessinateursFromDB.push(artistsFromDB[dessinateurName]);
    } else {
      const newArtist = await createArtist(dessinateurName, false, true);
      artistsFromDB[dessinateurName] = newArtist;
      dessinateursFromDB.push(newArtist);
    }
  }

  return { auteursFromDB, dessinateursFromDB };
};

const deleteBook = async (req, res, next) => {
  const bookId = req.params.bid;

  let book;
  try {
    book = await Book.findById(bookId).populate([
      { path: "auteurs", model: "Artist" },
      { path: "dessinateurs", model: "Artist" },
    ]);
  } catch (err) {
    const error = new HttpError("Failed to find book", 500);
    return next(error);
  }

  if (!book) {
    const error = new HttpError("Failed to find book with provided ID", 404);
    return next(error);
  }

  let collections;
  try {
    collections = await Collection.find({ book: bookId });
  } catch (err) {
    const error = new HttpError(
      "Failed to find collections with provided book ID",
      500
    );
    return next(error);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await removeBookFromCollections(collections, session);
    await removeBookFromArtistArrays(book, session);
    await book.deleteOne({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    const error = new HttpError("Failed to delete book", 500);
    return next(error);
  } finally {
    session.endSession();
  }

  res.status(200).json({ message: "Le livre a été supprimé !" });
};

const removeBookFromCollections = async (collections, session) => {
  for (const collection of collections) {
    await collection.deleteOne({ session });
  }
};

const removeBookFromArtistArrays = async (book, session) => {
  for (const auteur of book.auteurs) {
    auteur.books.pull(book);
    await auteur.save({ session });
  }

  for (const dessinateur of book.dessinateurs) {
    dessinateur.books.pull(book);
    await dessinateur.save({ session });
  }
};

exports.getBooks = getBooks;
exports.createBook = createBook;
exports.getFutureReleases = getFutureReleases;
exports.getBookById = getBookById;
exports.updateBook = updateBook;
exports.deleteBook = deleteBook;
exports.getAllBooksInformation = getAllBooksInformation;
