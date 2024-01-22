const HttpError = require("../models/http-error");
const MarvelProduction = require("../models/marvel-productions");
const mongoose = require("mongoose");

const getAllProductions = async (req, res, next) => {
  let productions;
  try {
    productions = await MarvelProduction.find();
  } catch (err) {
    const error = new HttpError(
      "La collecte des productions Marvel a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  res.json({ productions });
};

const getProductionById = async (req, res, next) => {
  const prodId = req.params.pid;

  let prodById;
  try {
    prodById = await MarvelProduction.findById(prodId);
  } catch (err) {
    const error = new HttpError(
      "La collecte de la production Marvel a échoué, veuillez réessayer...",
      500
    );
    return next(error);
  }

  if (!prodById) {
    const error = new HttpError(
      "Impossible de trouver la production avec l'identifiant fourni.",
      404
    );
    return next(error);
  }

  // Rechercher les épisodes de la même saison si c'est une série
  if (prodById.serie) {
    // TO DO
  }

  res.status(200).json({ production: prodById });
};

const addProduction = async (req, res, next) => {
  const { title, episode, season, episode_title, length, poster, type } =
    req.body;

  let maxOrderProduction;

  try {
    maxOrderProduction = await MarvelProduction.findOne().sort({ order: -1 });
  } catch (err) {
    const error = new HttpError(
      "Erreur lors de la récupération de la valeur maximale de 'order'",
      422
    );
    next(error);
  }

  let order;
  if (maxOrderProduction) {
    order = maxOrderProduction.order + 1;
  } else {
    order = 1;
  }

  const prodModel = {
    title,
    episode,
    season,
    episode_title,
    length,
    poster,
    order,
    type: type || "Film",
  };

  const addedProduction = new MarvelProduction(prodModel);

  try {
    const result = await addedProduction.save();
    console.log("Production ajoutée avec succès:", result);
  } catch (error) {
    console.log(err);
    const errorSaving = new HttpError(
      "Creating production failed, please try again.",
      500
    );
    next(errorSaving);
  }

  res.status(201).json({ prodId: addedProduction.id });
};

const updateProduction = async (req, res, next) => {
  const prodId = req.params.pid;

  const { review, watch_date } = req.body;

  let production;
  try {
    production = await MarvelProduction.findById(prodId);
  } catch (err) {
    const error = new HttpError(
      "La production Marvel n'a pas été trouvé, veuillez réessayer.",
      500
    );
    return next(error);
  }

  if (review) production.review = review;
  if (watch_date) production.watch_dates.push(watch_date);

  try {
    await production.save();
  } catch (err) {
    const error = new HttpError(
      "La mise à jour de la production a échoué, veuillez réessayer.",
      500
    );
    return next(error);
  }
  res.status(200).json({ production: production.toObject({ getters: true }) });
};

exports.getAllProductions = getAllProductions;
exports.getProductionById = getProductionById;
exports.addProduction = addProduction;
exports.updateProduction = updateProduction;
