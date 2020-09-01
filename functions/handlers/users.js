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

function getAge(day, month, year) {
  let today = new Date();
  let age = today.getFullYear() - year;
  let m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

// Validate newUser
exports.validUser = (req, res) => {
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

  const { valid, errors } = validateSignupData(
    newUser,
    getAge(newUser.day, newUser.month, newUser.year)
  );

  if (!valid) return res.status(400).json(errors);

  return res.status(201).json({ message: "Viss OK" });
};
//Signup user
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    gender: req.body.gender,
    lookingFor: req.body.lookingFor,
    checkedB: req.body.checkedB,
    day: req.body.day,
    month: req.body.month,
    year: req.body.year,
    userId: req.body.userId,
  };
  const noImg = "no-img.png";

  db.collection("users")
    .get()
    .then(() => {
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: newUser.gender,
        lookingFor: newUser.lookingFor,
        dob: new Date(newUser.year, newUser.month, newUser.day).toISOString(),
        age: getAge(newUser.day, newUser.month, newUser.year),
        userId: newUser.userId,
      };
      return db
        .collection("users")
        .doc(`${newUser.userId}`)
        .set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ message: "Viss OK" });
    })
    .catch(() => {
      return res
        .status(500)
        .json({ general: "Kaut kas nogāja greizi, lūdzu, mēģiniet vēlreiz" });
    });
};
// Google Facebook signup
exports.signupGoogleFB = (req, res) => {
  const newUser = {
    email: req.body.email,
    handle: req.body.handle,
    userId: req.body.userId,
  };
  const noImg = "no-img.png";
  db.collection("users")
    .get()
    .then(() => {
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: "gender_",
        dob: "dob_",
        age: "age_",
        userId: newUser.userId,
        lookingFor: "any",
      };
      return db
        .collection("users")
        .doc(`${newUser.userId}`)
        .set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ message: "Viss OK" });
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

  if (!valid) {
    return res.status(400).json(errors);
  } else {
    res.json({ message: "Viss OK" });
  }
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
  db.doc(`/users/${req.body.uid}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc.data().lookingFor;
      }
    })
    .then((lookingFor) => {
      let query;
      if (lookingFor !== "any") {
        query = db.collection("users").where("gender", "==", lookingFor);
      } else {
        query = db.collection("users");
      }
      let userData = [];
      query
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
          data.forEach((doc) => {
            userData.push({
              userId: doc.id,
              imageUrl: doc.data().imageUrl,
              handle: doc.data().handle,
              age: doc.data().age,
              location: doc.data().location,
              state: doc.data().state,
            });
          });
          return res.json(userData);
        });
    });
};
// Display all open chats
exports.getAllOpenChats = (req, res) => {
  db.collection("openChats")
    .doc(`${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        returnOpenChats(doc.data().users2, function (response) {
          return res.json(response);
        });
      } else {
        return res.json();
      }
    });
};
returnOpenChats = (users2, callback) => {
  let query = db.collection("users");
  if (users2.length !== 0) {
    query
      .where("userId", "in", users2)
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
            state: doc.data().state,
          });
        });
        console.log(userData);
        callback(userData);
        return;
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });
  } else {
    return callback();
  }
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
          state: doc.data().state,
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
