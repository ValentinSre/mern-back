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

  // Rechercher les livres de la même série (regarder aussi la version)
  if (bookObj.serie) {
    let booksSerie;
    try {
      booksSerie = await Book.find({
        serie: bookObj.serie,
        version: bookObj.version,
      }).select("image titre tome serie version");
    } catch (err) {
      const error = new HttpError(
        "La collecte de livres de la même série a échoué, veuillez réessayer...",
        500
      );
      return next(error);
    }

    // Supprimer le livre actuel de la liste
    booksSerie = booksSerie.filter(
      (book) => book._id.toString() !== bookId.toString()
    );

    bookObj.booksSerie = booksSerie;
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

const getBooksLists = async (req, res, next) => {
  const { user } = req.query;

  let valiantBooks; // Valiant
  let hiComicsBooks; // HiComics
  let asterixBooks; // Asterix
  let qcqBooks; // 404 Editions
  let pokemonBooks; // Pokémon
  let starWarsBooks; // Star Wars

  try {
    valiantBooks = await Book.find({ format: "Valiant" }).select(
      "titre serie tome version image"
    );
    hiComicsBooks = await Book.find({ editeur: "HiComics" }).select(
      "titre serie tome version image"
    );
    asterixBooks = await Book.find({ serie: "Astérix" }).select(
      "titre serie tome version image"
    );
    qcqBooks = await Book.find({ editeur: "404 Comics" }).select(
      "titre serie tome version image"
    );
    pokemonBooks = await Book.find({
      $or: [{ serie: /Pokémon/ }, { titre: /Pokémon/ }],
    }).select("titre serie tome version image");
    starWarsBooks = await Book.find({
      $or: [{ serie: /Star Wars/ }, { titre: /Star Wars/ }],
    }).select("titre serie tome version image");
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
      collection = await Collection.find({ owner: user }).select(
        "book souhaite"
      );
    } catch (err) {
      const error = new HttpError(
        "La comparaison de la bibliothèque avec votre collection a échoué, veuillez réessayer...",
        500
      );
      return next(error);
    }
  }

  // Fusionner les listes de books et de collections
  function mergeBooksWithCollection(books, collection) {
    return books.map((book) => {
      const bookObj = book.toObject({ getters: true });
      if (collection) {
        const bookCollection = collection.find(
          (col) => col.book.toString() === book._id.toString()
        );
        if (bookCollection) {
          bookObj.souhaite = bookCollection.souhaite;
        }
      }
      return bookObj;
    });
  }

  const mergedValiantBooks = mergeBooksWithCollection(valiantBooks, collection);
  const mergedHiComicsBooks = mergeBooksWithCollection(
    hiComicsBooks,
    collection
  );
  const mergedAsterixBooks = mergeBooksWithCollection(asterixBooks, collection);
  const mergedQcqBooks = mergeBooksWithCollection(qcqBooks, collection);
  const mergedPokemonBooks = mergeBooksWithCollection(pokemonBooks, collection);
  const mergedStarWarsBooks = mergeBooksWithCollection(
    starWarsBooks,
    collection
  );

  res.json({
    valiantBooks: mergedValiantBooks,
    hiComicsBooks: mergedHiComicsBooks,
    asterixBooks: mergedAsterixBooks,
    qcqBooks: mergedQcqBooks,
    pokemonBooks: mergedPokemonBooks,
    starWarsBooks: mergedStarWarsBooks,
  });
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

const searchBooks = async (req, res, next) => {
  const search = req.query.q;

  // fetch books with search in title
  let booksByTitle;
  try {
    booksByTitle = await Book.find({
      $or: [
        { titre: { $regex: search, $options: "i" } },
        { serie: { $regex: search, $options: "i" } },
      ],
    }).select(
      "-auteurs -editeur -date_parution -prix -poids -planches -image -format -genre -dessinateurs -type"
    );
  } catch (err) {
    const error = new HttpError("Failed to find books", 500);
    return next(error);
  }

  // fetch books with search in serie
  let booksBySerie;

  try {
    booksBySerie = await Book.aggregate([
      {
        $match: {
          $or: [{ serie: { $regex: search, $options: "i" } }],
        },
      },
      {
        $group: {
          _id: { serie: "$serie", version: "$version" },
        },
      },
      {
        $project: {
          _id: 0,
          serie: "$_id.serie",
          version: "$_id.version",
        },
      },
    ]).exec();
  } catch (err) {
    const error = new HttpError("Failed to find series", 500);
    return next(error);
  }

  // fetch artists with search in nom
  let artistsByName;
  try {
    artistsByName = await Artist.find({
      nom: { $regex: search, $options: "i" },
    }).select("-books -auteur -dessinateur");
  } catch (err) {
    const error = new HttpError("Failed to find artists", 500);
    return next(error);
  }

  res.status(200).json({ booksByTitle, booksBySerie, artistsByName });
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
exports.searchBooks = searchBooks;
exports.getBooksLists = getBooksLists;
