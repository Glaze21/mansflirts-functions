const { admin, db } = require("../util/admin");
const config = require("../util/config");
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
  let m = today.getMonth() - month + 1;
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
        coins: 0,
        dob: `${newUser.day}/${newUser.month}/${newUser.year}`,
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
  let parts = req.body.dob.split("/");
  const newUser = {
    email: req.body.email,
    handle: req.body.handle,
    userId: req.body.userId,
    gender: req.body.gender,
    month: parts[0],
    day: parts[1],
    year: parts[2],
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
        coins: 0,
        dob: `${newUser.day}/${newUser.month}/${newUser.year}`,
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
        return res.json({ message: "Viss OK" });
      } else {
        return res.status(400).json({ error: "Kļūme" });
      }
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
        .limit(req.body.limit)
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
  const { v4: uuidv4 } = require("uuid");
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });
  let oldImageLink;
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
      .then(async () => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}_512x512.${imageExtension}?alt=media&token=${generatedToken}`;
        const docRef = db.doc(`/users/${req.user.userId}`);
        const doc = await docRef.get();
        oldImageLink = doc.data().imageUrl;
        return docRef.update({ imageUrl });
      })
      .then(() => {
        return res.json({
          oldImageLink,
        });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Kaut kas nogāja greizi" });
      });
  });
  busboy.end(req.rawBody);
};

exports.addPhotos = (req, res) => {
  // Add user photos v2.0
  const { v4: uuidv4 } = require("uuid");
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const FieldValue = admin.firestore.FieldValue;

  let fields = {};

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName = {};
  let imagesToUpload = [];
  let imageToAdd = {};
  let imageUrl = "";
  let generatedToken = uuidv4();

  busboy.on("field", (fieldname, fieldvalue) => {
    fields[fieldname] = fieldvalue;
  });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Iesniegts nepareizs faila tips" });
    }

    // Getting extension of any image
    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    // Setting filename
    imageFileName = `${Math.round(
      Math.random() * 100000000000000
    ).toString()}.${imageExtension}`;

    // Creating path
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToAdd = {
      imageFileName,
      filepath,
      mimetype,
      imageExtension,
    };

    file.pipe(fs.createWriteStream(filepath));
    //Add the image to the array
    imagesToUpload.push(imageToAdd);
  });

  busboy.on("finish", async () => {
    let promises = [];

    imagesToUpload.forEach((imageToBeUploaded) => {
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
        config.storageBucket
      }/o/${imageToBeUploaded.imageFileName.replace(
        "." + imageToBeUploaded.imageExtension,
        ""
      )}_512x512.${imageToBeUploaded.imageExtension}?alt=media`;
      db.doc(`users/${req.user.userId}`).update({
        userImages: FieldValue.arrayUnion(imageUrl),
      });
      promises.push(
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
      );
    });

    try {
      await Promise.all(promises);

      return res.json({ message: "Attēls veiksmīgi augšupielādēts" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Kaut kas nogāja greizi" });
    }
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
      return res.json({ message: "Photo removed successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.createSession = async (req, res) => {
  const functions = require("firebase-functions");
  const stripe = require("stripe")(functions.config().stripe.token);
  const domain = "https://dating-site-e5be3.firebaseapp.com/checkout";
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer: req.body.customerId,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: req.body.desc,
          },
          unit_amount: req.body.unit_amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${domain}?success=true`,
    cancel_url: `${domain}?canceled=true`,
    metadata: {
      uid: req.body.uid,
      coin_amount: req.body.desc.replace("Monētas", ""),
    },
  });
  res.json({ id: session.id });
};

const fulfillOrder = (session) => {
  const increment = admin.firestore.FieldValue.increment(
    parseInt(session.coin_amount, 10)
  );
  db.doc(`/users/${session.uid}`).set(
    {
      coins: increment,
    },
    { merge: true }
  );
  return;
};

exports.onSuccessPayment = (req, res) => {
  const functions = require("firebase-functions");
  const stripe = require("stripe")(functions.config().stripe.token);
  const endpointSecret = "whsec_rqOP5f9uabO00q1y3I3PLoTCWb6osiKk";
  const payload = req.rawBody;

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const returnObj = {
      customer: session.customer,
      coin_amount: session.metadata.coin_amount,
      uid: session.metadata.uid,
    };
    fulfillOrder(returnObj);
    return res.status(200).json(returnObj);
  }
};
