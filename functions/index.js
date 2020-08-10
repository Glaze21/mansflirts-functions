const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");

const cors = require("cors");
app.use(cors());

const {
  signup,
  signupGoogle,
  signupFB,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  getAllUsers,
} = require("./handlers/users");

// Users routes
app.post("/signup", signup);
app.post("/signupGoogle", signupGoogle);
app.post("/signupFB", signupFB);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:userId", getUserDetails);
app.get("/getAllUsers", getAllUsers);

exports.api = functions.region("europe-west3").https.onRequest(app);
