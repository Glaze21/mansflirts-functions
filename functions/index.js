const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");

const cors = require("cors");
app.use(cors());

const {
  signup,
  signupGoogleFB,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  getAllUsers,
  filterUsers,
  removeImage,
  addPhotos,
  validUser,
  getAllOpenChats,
} = require("./handlers/users");

// Users routes
app.post("/validUser", validUser);
app.post("/signup", signup);
app.post("/signupGoogleFB", signupGoogleFB);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user/addPhotos", FBAuth, addPhotos);
app.post("/user/removeImage", FBAuth, removeImage);
app.post("/filterUsers", filterUsers);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:userId", getUserDetails);
app.post("/getAllUsers", getAllUsers);
app.get("/getAllOpenChats", FBAuth, getAllOpenChats);

exports.api = functions.region("europe-west3").https.onRequest(app);
