const { admin, db } = require("../util/admin");
const config = require("../util/config");
const { v4: uuidv4 } = require("uuid");
const firebase = require("firebase");

firebase.initializeApp(config);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

let userId;

//Signup user
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    gender: req.body.gender,
    checkedB: req.body.checkedB,
    day: req.body.day,
    month: req.body.month,
    year: req.body.year,
  };

  function getAge() {
    let today = new Date();
    let age = today.getFullYear() - newUser.year;
    let m = today.getMonth() - newUser.month;
    if (m < 0 || (m === 0 && today.getDate() < newUser.day)) {
      age--;
    }
    return age;
  }

  const { valid, errors } = validateSignupData(newUser, getAge());

  if (!valid) return res.status(400).json(errors);

  const noImg = "no-img.png";

  let token;

  db.collection("users")
    .get()
    .then(() => {
      return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: newUser.gender,
        day: newUser.day,
        month: newUser.month,
        year: newUser.year,
        dob: new Date(
          newUser.year,
          newUser.month - 1,
          newUser.day
        ).toISOString(),
        age: getAge(),
        userId,
      };
      return db.collection("users").doc(`${userId}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "E-pasts jau tiek izmantots" });
      } else {
        return res
          .status(500)
          .json({ general: "Kaut kas nogāja greizi, lūdzu, mēģiniet vēlreiz" });
      }
    });
};
// Google signup
exports.signupGoogle = (req, res) => {
  var credential = firebase.auth.GoogleAuthProvider.credential(
    req.body.id_token
  );
  const newUser = {
    email: req.body.email,
    handle: req.body.handle,
  };
  const noImg = "no-img.png";
  let token;
  db.collection("users")
    .get()
    .then(() => {
      return firebase.auth().signInWithCredential(credential);
    })
    .then((data) => {
      userId = firebase.auth().currentUser.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: "gender_",
        dob: "dob_",
        age: "age_",
        userId,
      };
      return db.collection("users").doc(`${userId}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "E-pasts jau tiek izmantots" });
      } else {
        return res
          .status(500)
          .json({ general: "Kaut kas nogāja greizi, lūdzu, mēģiniet vēlreiz" });
      }
    });
};
// Facebook signup
exports.signupFB = (req, res) => {
  var credential = firebase.auth.FacebookAuthProvider.credential(
    req.body.id_token
  );
  const newUser = {
    email: req.body.email,
    handle: req.body.handle,
  };
  const noImg = "no-img.png";
  let token;
  db.collection("users")
    .get()
    .then(() => {
      return firebase.auth().signInWithCredential(credential);
    })
    .then((data) => {
      userId = firebase.auth().currentUser.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: "gender_",
        dob: "dob_",
        age: "age_",
        userId,
      };
      return db.collection("users").doc(`${userId}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "E-pasts jau tiek izmantots" });
      } else {
        return res
          .status(500)
          .json({ general: "Kaut kas nogāja greizi, lūdzu, mēģiniet vēlreiz" });
      }
    });
};
// Login user
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ general: "Nepareizi dati, lūdzu, mēģiniet vēlreiz" });
    });
};
// Add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.userId}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Informācija veiksmīgi pievienota" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
      } else {
        return res.status(404).json({ errror: "Lietotājs nav atrasts" });
      }
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Display all users in home
exports.getAllUsers = (req, res) => {
  db.collection("users")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let userData = [];
      data.forEach((doc) => {
        userData.push({
          userId: doc.id,
          imageUrl: doc.data().imageUrl,
          handle: doc.data().handle,
          age: doc.data().age,
          location: doc.data().location,
          isLoggedIn: doc.data().isLoggedIn,
        });
      });
      return res.json(userData);
    });
};
// Filters users in home
exports.filterUsers = (req, res) => {
  let query = db
    .collection("users")
    .where("gender", "==", req.body.gender)
    .where("age", "<=", req.body.maxAge)
    .where("age", ">=", req.body.minAge);

  if (req.body.city !== "") {
    query = query.where("location", "==", req.body.city);
  }
  query
    .get()
    .then((data) => {
      let userData = [];
      data.forEach((doc) => {
        userData.push({
          userId: doc.id,
          imageUrl: doc.data().imageUrl,
          handle: doc.data().handle,
          age: doc.data().age,
          location: doc.data().location,
          isLoggedIn: doc.data().isLoggedIn,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
      }
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Upload profile image
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // String for image token
  let generatedToken = uuidv4();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.userId}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Attēls veiksmīgi augšupielādēts" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Kaut kas nogāja greizi" });
      });
  });
  busboy.end(req.rawBody);
};
// Add user photos
exports.addPhotos = (req, res) => {
  const FieldValue = admin.firestore.FieldValue;
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // String for image token
  let generatedToken = uuidv4();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.userId}`).update({
          userImages: FieldValue.arrayUnion(imageUrl),
        });
      })
      .then(() => {
        return res.json({ message: "Attēls veiksmīgi augšupielādēts" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Kaut kas nogāja greizi" });
      });
  });
  busboy.end(req.rawBody);
};
exports.removeImage = (req, res) => {
  const FieldValue = admin.firestore.FieldValue;
  const link = req.body.link;
  db.doc(`/users/${req.user.userId}`)
    .update({
      userImages: FieldValue.arrayRemove(link),
    })
    .then(() => {
      return res.json({ message: "Photo removed successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Logs the user out the clean way
exports.logout = (req, res) => {
  var uid = firebase.auth().currentUser.uid;

  var userStatusDatabaseRef = firebase.database().ref("/status/" + uid);
  var isOfflineForDatabase = {
    state: "offline",
    last_active: firebase.database.ServerValue.TIMESTAMP,
  };

  var userStatusFirestoreRef = firebase.firestore().doc("/status/" + uid);
  var isOfflineForFirestore = {
    state: "offline",
    last_active: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // userStatusDatabaseRef.onDisconnect().cancel();

  userStatusFirestoreRef.set(isOfflineForFirestore);
  userStatusDatabaseRef.set(isOfflineForDatabase);

  return res.json({ message: "Izrakstijāties veiksmīgi!" });
};
