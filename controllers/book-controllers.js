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
  if (user) {
    try {
      collection = await Collection.find({ owner: user });
    } catch (err) {
      const error = new HttpError(
        "La collecte de livres a échoué (collection), veuillez réessayer...",
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
  const book = req.params.bid;
  const { user } = req.query;
  console.log("book", book);
  let bookById;
  try {
    bookById = await Book.find({ _id: book });
  } catch (err) {
    const error = new HttpError(
      "La collecte de livre a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  console.log("bookById", bookById);

  let collection;
  if (user) {
    try {
      collection = await Collection.find({ owner: user });
    } catch (err) {
      const error = new HttpError(
        "La collecte de livre a échoué (collection), veuillez réessayer...",
        500
      );
      return next(error);
    }
  }

  console.log("collection", collection);

  // Regarder si le livre est dans la collection de l'utilisateur
  if (collection) {
    const bookCollection = collection.find(
      (col) => col.book.toString() === book
    );
    if (bookCollection) {
      bookById[0].souhaite = bookCollection.souhaite;
      bookById[0].possede = bookCollection.possede;
      bookById[0].critique = bookCollection.critique;
      bookById[0].lu = bookCollection.lu;
      bookById[0].note = bookCollection.note;
      bookById[0].date_achat = bookCollection.date_achat;
      bookById[0].lien = bookCollection.lien;
    }
  }

  console.log("bookById", bookById);
  res.status(200).json({ book: bookById[0].toObject({ getters: true }) });
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
  const editeurs = books.map((book) => book.editeur);

  // Récupérer la liste des genres dans la liste des livres
  const genres = books.map((book) => book.genre);

  // Récupérer la liste des formats dans la liste des livres
  const formats = books.map((book) => book.format);

  // Récupérer la liste des séries dans la liste des livres
  const series = books.map((book) => book.serie);

  // Récupérer seulement les noms des artistes
  artistes = artistes.map((artiste) => artiste.nom);

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

  const auteursFromDB = [];

  // Vérifier si chaque auteur existe ou non
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

  const dessinateursFromDB = [];

  // Vérifier si chaque dessinateur existe ou non
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

// const updatePlace = async (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     const error = new HttpError(
//       "Invalid inputs passed, please check your data.",
//       422
//     );
//     return next(error);
//   }

//   const { title, description } = req.body;
//   const placeId = req.params.pid;

//   let place;

//   try {
//     place = await Place.findById(placeId);
//   } catch (err) {
//     const error = new HttpError(
//       "Something went wrong, could not update place.",
//       500
//     );
//     return next(error);
//   }

//   if (place.creator.toString() !== req.userData.userId) {
//     const error = new HttpError("You are not allowed to edit this place", 401);

//     return next(error);
//   }

//   place.title = title;
//   place.description = description;

//   try {
//     await place.save();
//   } catch (err) {
//     const error = new HttpError(
//       "Something went wrong, could not update place.",
//       500
//     );
//     return next(error);
//   }

//   res.status(200).json({ place: place.toObject({ getters: true }) });
// };

// const deletePlace = async (req, res, next) => {
//   const placeId = req.params.pid;

//   let place;
//   try {
//     place = await Place.findById(placeId).populate("creator");
//   } catch (err) {
//     const error = new HttpError(
//       "Something went wrong, could not delete place",
//       500
//     );
//     return next(error);
//   }

//   if (!place) {
//     const error = new HttpError("Could not find place for this id", 404);
//     return next(error);
//   }

//   if (place.creator.id !== req.userData.userId) {
//     const error = new HttpError(
//       "You are not allowed to delete this place",
//       401
//     );

//     return next(error);
//   }

//   const imagePath = place.image;

//   try {
//     const sess = await mongoose.startSession();
//     sess.startTransaction();
//     await place.deleteOne({ session: sess });
//     place.creator.places.pull(place);
//     await place.creator.save({ session: sess });
//     await sess.commitTransaction();
//   } catch (err) {
//     console.log(place, err);
//     const error = new HttpError(
//       "Something went wrong, couldnt delete place",
//       500
//     );
//     return next(error);
//   }

//   fs.unlink(imagePath, (err) => {
//     console.log(err);
//   });

//   res.status(200).json({ message: "Deleted place!" });
// };

exports.getBooks = getBooks;
exports.createBook = createBook;
exports.getBookById = getBookById;
// exports.updatePlace = updatePlace;
// exports.deletePlace = deletePlace;
exports.getAllBooksInformation = getAllBooksInformation;
