const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");

const cors = require("cors");
app.use(cors());

const {
  signup,
  signupGoogleFB,
  login,
  loginA,
  checkA,
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
  getAllNotifications,
  getAllNotificationsA,
} = require("./handlers/users");

// Users routes
app.post("/validUser", validUser);
app.post("/signup", signup);
app.post("/signupGoogleFB", signupGoogleFB);
app.post("/login", login);
app.post("/loginA", loginA);
app.post("/checkA", FBAuth, checkA);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user/addPhotos", FBAuth, addPhotos);
app.post("/user/removeImage", FBAuth, removeImage);
app.get("/getAllUsers", FBAuth, getAllUsers);
app.post("/filterUsers", FBAuth, filterUsers);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:userId", getUserDetails);
app.get("/getAllOpenChats", FBAuth, getAllOpenChats);
app.get("/getAllNotifications", FBAuth, getAllNotifications);
app.get("/getAllNotificationsA", FBAuth, getAllNotificationsA);

exports.api = functions.region("europe-west3").https.onRequest(app);
