const { admin, db } = require("./admin");

// Authentication so we know the request comes from a user in our website via a token
module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      if (data.docs[0].data().mod && req.headers.userid) {
        req.user.userId = req.headers.userid;
        return next();
      } else {
        req.user.userId = data.docs[0].data().userId;
        return next();
      }
    })
    .catch((err) => {
      console.error("Error while verifying token", err);
      return res.status(403).json(err);
    });
};
