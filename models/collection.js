const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const collectionSchema = new Schema({
    owner: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    book: { type: mongoose.Types.ObjectId, required: true, ref: "Book" },
    possede: { type: Boolean, required: true },
    lu: { type: Boolean, required: true },
    critique: { type: Boolean, required: true },
    souhaite: { type: Boolean, required: true },
    date_achat: { type: Date, required: true },
    critique: { type: String, required: true },
    lien: { type: String, required: true },
    note: { type: Number, required: true },
});

module.exports = mongoose.model("Collection", collectionSchema);
