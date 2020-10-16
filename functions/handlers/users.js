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
  const noImg = "no-img_512x512.png";

  db.collection("users")
    .get()
    .then(() => {
      const userCredentials = {
        admin: true,
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: newUser.gender,
        lookingFor: newUser.lookingFor,
        dob: new Date(newUser.year, newUser.month, newUser.day).toISOString(),
        age: getAge(newUser.day, newUser.month, newUser.year),
        userId: newUser.userId,
        userImages: [],
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
    gender: req.body.gender,
    day: req.body.day,
    month: req.body.month,
    year: req.body.year,
  };
  const noImg = "no-img_512x512.png";
  db.collection("users")
    .get()
    .then(() => {
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: newUser.gender,
        lookingFor: "any",
        dob: new Date(newUser.year, newUser.month, newUser.day).toISOString(),
        age: getAge(newUser.day, newUser.month, newUser.year),
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
exports.loginA = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  if (
    user.email !== "jurnieks1577@epasts.com" &&
    user.email !== "zeltaZivtiņa_3266"
  ) {
    return res.status(400).json({ error: "Kļūme" });
  } else {
    res.json({ message: "Viss OK" });
  }
};
exports.checkA = (req, res) => {
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        if (doc.data().admin) {
          res.json({ message: "Viss OK" });
        } else {
          return res.status(400).json({ error: "Kļūme" });
        }
      }
    })
    .catch((error) => {
      console.log("Error getting document:", error);
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
  const docRef = db.doc(`/users/${req.user.userId}`);
  docRef
    .get()
    .then((doc) => {
      return doc.data().lookingFor;
    })
    .then((lookingFor) => {
      let query;
      if (lookingFor === "any") {
        query = db.collection("users");
      } else {
        query = db.collection("users").where("gender", "==", lookingFor);
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
          const index = userData.findIndex((x) => x.userId === req.user.userId);
          if (index !== -1) userData.splice(index, 1);
          return res.json(userData);
        });
    });
};
// Display all open chats
exports.getAllOpenChats = (req, res) => {
  let users2 = [];
  db.collection(`/openChats/${req.user.userId}/users2`)
    .get()
    .then((collection) => {
      if (!collection.empty) {
        collection.forEach((doc) => {
          users2.push({ uid: doc.id, msg: doc.data().msg });
        });
        returnOpenChats(users2, (response) => {
          return res.json(response);
        });
      } else {
        return res.json();
      }
    });
};
exports.getAllNotifications = (req, res) => {
  let users2 = [];
  db.collection(`/openChats/${req.user.userId}/notifications`)
    .get()
    .then((collection) => {
      if (!collection.empty) {
        collection.forEach((doc) => {
          users2.push({
            uid: doc.id,
            msg: doc.data().msg,
            read: doc.data().read,
          });
        });
        returnOpenChats(users2, (response) => {
          return res.json(response);
        });
      } else {
        return res.json();
      }
    });
};
returnOpenChats = (users2, callback) => {
  let users2Ids = [];
  users2.forEach((item) => {
    users2Ids.push(item.uid);
  });
  let query = db.collection("users");
  query
    .where("userId", "in", users2Ids)
    .get()
    .then((data) => {
      let userData = [];
      i = 0;
      data.forEach((doc) => {
        userData.push({
          userId: doc.id,
          imageUrl: doc.data().imageUrl,
          handle: doc.data().handle,
          state: doc.data().state,
          msg: users2[i].msg,
          read: users2[i].read,
        });
        i++;
      });
      callback(userData);
      return;
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
};
exports.getAllNotificationsA = (req, res) => {
  let notifications = [];
  db.collectionGroup("notifications")
    .get()
    .then((data) => {
      data.forEach((doc) => {
        notifications.push({
          uid: doc.id,
          recipient: doc.data().recipient,
          msg: doc.data().msg,
          read: doc.data().read,
        });
      });
      return res.json(notifications);
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
          state: doc.data().state,
        });
      });
      const index = userData.findIndex((x) => x.userId === req.user.uid);
      if (index !== -1) userData.splice(index, 1);
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
  let imageExtension;
  // String for image token
  let generatedToken = uuidv4();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }
    // my.image.png => ['my', 'image', 'png']
    imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(Math.random() * 1000000000000).toString()}`;
    const filepath = path.join(
      os.tmpdir(),
      imageFileName + "." + imageExtension
    );
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
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}_512x512.${imageExtension}?alt=media&token=${generatedToken}`;
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
  let imageExtension;
  // String for image token
  let generatedToken = uuidv4();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }
    // my.image.png => ['my', 'image', 'png']
    imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(Math.random() * 1000000000000).toString()}`;
    const filepath = path.join(
      os.tmpdir(),
      imageFileName + "." + imageExtension
    );
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
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}_512x512.${imageExtension}?alt=media&token=${generatedToken}`;
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
  var { Storage } = require("@google-cloud/storage");
  const storage = new Storage();
  const link = req.body.link;
  const bucketName = "gs://dating-site-e5be3.appspot.com";
  var imageName = "";
  var i = 76;
  while (link.charAt(i) !== "?") {
    imageName += link.charAt(i);
    i++;
  }
  db.doc(`/users/${req.user.userId}`)
    .update({
      userImages: FieldValue.arrayRemove(link),
    })
    .then(() => {
      storage.bucket(bucketName).file(imageName).delete();
      console.log(`${bucketName}/${imageName} deleted.`);
      return res.json({ message: "Photo removed successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
