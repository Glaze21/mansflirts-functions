const functions = require("firebase-functions");
const app = require("express")();

const FBAuth = require("./util/fbAuth");

const { getAllSnippets, postOneSnippet } = require("./handlers/snippets");
const { signup, login } = require("./handlers/users");

// Snippet routes
app.get("/snippets", getAllSnippets);
app.post("/snippet", FBAuth, postOneSnippet);

// Users routes
app.post("/signup", signup);
app.post("/login", login);

exports.api = functions.region("europe-west1").https.onRequest(app);
