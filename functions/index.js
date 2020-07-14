const functions = require("firebase-functions");
const app = require("express")();

const FBAuth = require("./util/fbAuth");

const { getAllSnippets, postOneSnippet } = require("./handlers/snippets");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
} = require("./handlers/users");

// Snippet routes
app.get("/snippets", getAllSnippets);
app.post("/snippet", FBAuth, postOneSnippet);

// Users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);

exports.api = functions.region("europe-west1").https.onRequest(app);
