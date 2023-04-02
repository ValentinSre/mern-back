const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const artistSchema = new Schema({
  nom: { type: String, required: false },
  auteur: { type: Boolean, required: false },
  dessinateur: { type: Boolean, required: false },
  books: [{ type: mongoose.Types.ObjectId, required: true, ref: "Book" }],
});

module.exports = mongoose.model("Artist", artistSchema);
