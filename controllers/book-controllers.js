const HttpError = require("../models/http-error");
const Book = require("../models/book");
const Collection = require("../models/collection");
const Artist = require("../models/artist");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

const getBooks = async (req, res, next) => {
  const { user } = req.query;

  let books;
  try {
    books = await Book.find();
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
    });
  } catch (err) {
    const error = new HttpError(
      "La collecte de livres à venir a échoué, veuillez réessayer...",

      500
    );

    return next(error);
  }

  console.log(books);

  res.json({ books: books.map((book) => book.toObject({ getters: true })) });
};

const getAllBooksInformation = async (req, res, next) => {
  // Récupérer les informations des livres
  let books;
  try {
    books = await Book.find();
  } catch (err) {
    const error = new HttpError(
      "La collecte de livres a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  // Récupérer les informations des auteurs
  let artistes;
  try {
    artistes = await Artist.find();
  } catch (err) {
    const error = new HttpError(
      "La collecte des artistes a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  // Récupérer la liste des éditeurs dans la liste des livres
  const editeurs = books
    .map((book) => book.editeur)
    .filter((el) => el !== null && el !== undefined);

  // Récupérer la liste des genres dans la liste des livres
  const genres = books
    .map((book) => book.genre)
    .filter((el) => el !== null && el !== undefined);

  // Récupérer la liste des formats dans la liste des livres
  const formats = books
    .map((book) => book.format)
    .filter((el) => el !== null && el !== undefined);

  // Récupérer la liste des séries dans la liste des livres
  const series = books
    .map((book) => book.serie)
    .filter((el) => el !== null && el !== undefined);

  // Récupérer seulement les noms des artistes
  artistes = artistes
    .map((artiste) => artiste.nom)
    .filter((el) => el !== null && el !== undefined);

  const options = {
    editeurs: [...new Set(editeurs)],
    genres: [...new Set(genres)],
    formats: [...new Set(formats)],
    series: [...new Set(series)],
    artistes,
  };

  res.status(200).json(options);
};

const createBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Informations invalides, please check your data.",
      422
    );
    next(error);
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

    for (const auteur of auteursFromDB) {
      auteur.books.push(createdBook);
      await auteur.save({ session: sess });
    }
    for (const dessinateur of dessinateursFromDB) {
      dessinateur.books.push(createdBook);
      await dessinateur.save({ session: sess });
    }
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError("Creating book failed, please try again.", 500);
  }

  res.status(201).json({ bookId: createdBook.id });
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
  const {
    serie,
    titre,
    auteurs,
    editeur,
    date_parution,
    tome,
    prix,
    image,
    format,
    genre,
    dessinateurs,
    type,
    version,
    poids,
    planches,
  } = req.body;

  const { auteursFromDB, dessinateursFromDB } = await manageArtists(
    auteurs,
    dessinateurs
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

  book.serie = serie;
  book.titre = titre;
  book.auteurs = auteursFromDB;
  book.editeur = editeur;
  book.date_parution = date_parution;
  book.tome = tome;
  book.prix = prix;
  book.image = image;
  book.format = format;
  book.genre = genre;
  book.dessinateurs = dessinateursFromDB;
  book.type = type;
  book.version = version;
  book.poids = poids;
  book.planches = planches;

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

const manageArtists = async (auteurs, dessinateurs) => {
  // Vérifier si chaque auteur existe ou non
  const auteursFromDB = [];
  for (const auteurName of auteurs) {
    let auteur;
    try {
      auteur = await Artist.findOne({ nom: auteurName });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "La recherche de l'artiste a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }

    if (!auteur) {
      // Si l'artiste n'existe pas, on le crée
      const newArtist = new Artist({
        nom: auteurName,
        books: [],
        auteur: true,
        dessinateur: false,
      });
      try {
        await newArtist.save();
      } catch (err) {
        console.log(err);
        const error = new HttpError(
          "La création de l'artiste a échoué, veuillez réessayer.",
          500
        );
        return next(error);
      }
      auteur = newArtist;
    }
    auteursFromDB.push(auteur);
  }

  // Vérifier si chaque dessinateur existe ou non
  const dessinateursFromDB = [];
  for (const dessinateurName of dessinateurs) {
    let dessinateur;
    try {
      dessinateur = await Artist.findOne({ nom: dessinateurName });
    } catch (err) {
      console.log(err);
      const error = new HttpError(
        "La recherche de l'artiste a échoué, veuillez réessayer.",
        500
      );
      return next(error);
    }

    if (!dessinateur) {
      // Si l'artiste n'existe pas, on le crée
      const newArtist = new Artist({
        nom: dessinateurName,
        books: [],
        auteur: false,
        dessinateur: true,
      });
      try {
        await newArtist.save();
      } catch (err) {
        console.log(err);
        const error = new HttpError(
          "La création de l'artiste a échoué, veuillez réessayer.",
          500
        );
        return next(error);
      }
      dessinateur = newArtist;
    }
    dessinateursFromDB.push(dessinateur);
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
    const error = new HttpError(
      "Something went wrong, could not delete book",
      500
    );
    return next(error);
  }

  if (!book) {
    const error = new HttpError(
      "[DEL] Impossible de trouver le livre lié à cet id !",
      404
    );
    return next(error);
  }

  // Delete book and remove it from the artist's books array
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await book.deleteOne({ session: sess });
    for (const auteur of book.auteurs) {
      auteur.books.pull(book);
      await auteur.save({ session: sess });
    }
    for (const dessinateur of book.dessinateurs) {
      dessinateur.books.pull(book);
      await dessinateur.save({ session: sess });
    }
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete book",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted place!" });
};

exports.getBooks = getBooks;
exports.createBook = createBook;
exports.getFutureReleases = getFutureReleases;
exports.getBookById = getBookById;
exports.updateBook = updateBook;
exports.deleteBook = deleteBook;
exports.getAllBooksInformation = getAllBooksInformation;
