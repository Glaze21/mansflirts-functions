const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
} = require("./handlers/users");

// Users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);

exports.api = functions.region("europe-west1").https.onRequest(app);
