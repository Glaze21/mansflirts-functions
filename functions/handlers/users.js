const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

firebase.initializeApp(config);

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
        });
      });
      return res.json(userData);
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

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }
    // image.png
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 123456789.png
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtension}`;
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
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${userId}`).update({ imageUrl });
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
