const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookSchema = new Schema({
  serie: { type: String, required: false },
  titre: { type: String, required: true },
  auteurs: [{ type: mongoose.Types.ObjectId, required: true, ref: "Artist" }],
  editeur: { type: String, required: true },
  date_parution: { type: Date, required: false },
  tome: { type: Number, required: false },
  prix: { type: Number, required: true },
  poids: { type: Number, required: false },
  planches: { type: Number, required: false },
  image: { type: String, required: true },
  format: { type: String, required: false },
  genre: { type: String, required: false },
  dessinateurs: [
    { type: mongoose.Types.ObjectId, required: false, ref: "Artist" },
  ],
  type: { type: String, required: true },
  version: { type: Number, required: false },
});

module.exports = mongoose.model("Book", bookSchema);
