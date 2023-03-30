const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookSchema = new Schema({
  serie: { type: String, required: false },
  titre: { type: String, required: true },
  auteur: { type: String, required: true },
  editeur: { type: String, required: true },
  date_parution: { type: Date, required: false },
  tome: { type: Number, required: false },
  prix: { type: Number, required: true },
  image: { type: String, required: true },
  format: { type: String, required: false },
  genre: { type: String, required: false },
  dessinateur: { type: String, required: true },
  type: { type: String, required: true },
});

module.exports = mongoose.model("Book", bookSchema);
