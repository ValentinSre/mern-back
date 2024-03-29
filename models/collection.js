const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const collectionSchema = new Schema({
  owner: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  book: { type: mongoose.Types.ObjectId, required: true, ref: "Book" },
  possede: { type: Boolean, required: true },
  lu: { type: Boolean, required: false },
  critique: { type: Boolean, required: false },
  souhaite: { type: Boolean, required: true },
  date_achat: { type: Date, required: false },
  read_dates: [{ type: Date, required: false }],
  review: { type: String, required: false },
  lien: { type: String, required: false },
  note: { type: Number, required: false },
  revendu: { type: Boolean, required: false },
});

module.exports = mongoose.model("Collection", collectionSchema);
