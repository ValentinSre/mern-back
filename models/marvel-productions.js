const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const marvelProductionSchema = new Schema(
  {
    title: { type: String, required: true },
    poster: { type: String, required: true },
    length: { type: Number, required: true },
    type: { type: String, required: true },
    season: { type: Number, required: false },
    episode: { type: Number, required: false },
    episode_title: { type: String, required: false },
    watch_dates: [{ type: Date, required: false }],
    review: { type: String, required: false },
    order: { type: Number, required: true },
  },
  { collection: "marvel-productions" }
);

module.exports = mongoose.model("MarvelProduction", marvelProductionSchema);
