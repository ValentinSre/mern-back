const HttpError = require("../models/http-error");
const uuid = require("uuid").v4;
const fs = require("fs");
const Book = require("../models/book");
const Collection = require("../models/collection");
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

const createBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    next(error);
  }

  const {
    titre,
    serie,
    tome,
    image,
    prix,
    auteur,
    editeur,
    date_parution,
    format,
    genre,
    dessinateur,
  } = req.body;

  const bookModel = {
    titre,
    auteur,
    editeur,
    prix,
    image,
    dessinateur,
  };

  if (serie) bookModel.serie = serie;
  if (tome) bookModel.tome = tome;
  if (date_parution) bookModel.date_parution = date_parution;
  if (format) bookModel.format = format;
  if (genre) bookModel.genre = genre;

  const createdBook = new Book(bookModel);

  try {
    await createdBook.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "La création du livre a échoué, veuillez réessayer.",
      500
    );
    return next(error);
  }

  res.status(201).json({ book: createdBook });
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
