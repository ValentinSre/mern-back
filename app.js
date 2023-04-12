const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const HttpError = require("./models/http-error");
const usersRoutes = require("./routes/users-routes");
const collectionRoutes = require("./routes/collection-routes");
const bookRoutes = require("./routes/book-routes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept-Header, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/users", usersRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/api/book", bookRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    return next(error);
  }

  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occured!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.asoq9vn.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(PORT);
    console.log("Connected to MongoDB and listening on port" + PORT);
  })
  .catch((err) => console.log(err));
