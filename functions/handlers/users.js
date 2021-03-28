const { admin, db, rtdb } = require("../util/admin");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");
var config = require("../util/config");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");

function getAge(day, month, year) {
  let today = new Date();
  let age = today.getFullYear() - year;
  let m = today.getMonth() - month + 1;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

exports.SendMail = async (uid, msg) => {
  const doc = await db.doc(`/users/${uid}`).get();
  const handle = doc.data().handle;
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "mansflirts@gmail.com",
      pass: "flirts2020",
    },
  });
  const mailOptions = await transporter.sendMail({
    from: '"mansflirts" <mansflirts@gmail.com>',
    to: "thelovepearl@gmail.com",
    subject: `Jauna ziņa no ${handle}`, // email subject
    html: `<p style="font-size: 16px;">${msg}</p>
            <br />
        `, // email content in HTML
  });
};

exports.buyGift = async (req, res) => {
  const FieldValue = admin.firestore.FieldValue;
  let uid = req.user.userId;
  let value = req.body.value;

  const docRef = db.doc(`users/${uid}`);
  const doc = await docRef.get();

  if (doc.data().coins >= value) {
    await docRef.update({
      coins: FieldValue.increment(-value),
    });
    res.status(200).json();
  } else {
    res.status(400).json({ message: "Nepietiek monētu!" });
  }
};

exports.updateAge = (req, res) => {
  let dob = req.body.dob;
  let uid = req.user.uid;

  let parts = dob.split("/");

  let day = parts[0];
  let month = parts[1];
  let year = parts[2];

  let age = getAge(day, month, year);
  if (day === "" || month === "" || year === "") {
    return res
      .status(400)
      .json({ error: "Izvēlies pareizu dzimšanas datumu!" });
  } else if (age < 18) {
    return res.status(400).json({ error: "Jums jābūt vismaz 18 gadus vecam!" });
  } else {
    db.doc(`users/${uid}`).update({
      age: age,
      dob: dob,
    });
    return res.json({ age: age, dob: dob });
  }
};
//Signup user
exports.signup = async (req, res) => {
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
  };

  const { valid, errors } = validateSignupData(
    newUser,
    getAge(newUser.day, newUser.month, newUser.year)
  );

  if (!valid) return res.status(400).json(errors);

  // Signup user
  const noImg = "no-img_512x512.png";

  admin
    .auth()
    .createUser({
      email: newUser.email,
      emailVerified: false,
      password: newUser.password,
      displayName: newUser.handle,
      photoURL: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
    })
    .then((userData) => {
      const userCredentials = {
        admin: false,
        handle: newUser.handle,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        gender: newUser.gender,
        lookingFor: newUser.lookingFor,
        minAge: "18",
        maxAge: "65",
        coins: 120,
        dob: `${newUser.day}/${newUser.month}/${newUser.year}`,
        age: getAge(newUser.day, newUser.month, newUser.year),
        userId: userData.uid,
        userImages: [],
        blockedUsers: [],
        amsgs: 0,
      };
      return db.collection("users").doc(`${userData.uid}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ message: "Viss OK" });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-exists") {
        return res.status(400).json({ email: "E-pasts jau tiek izmantots" });
      } else {
        return res.status(400).json(err);
      }
    });
};
// Google Facebook signup
exports.signupGoogleFB = (req, res) => {
  let parts = req.body.dob.split("/");
  const newUser = {
    handle: req.body.handle,
    userId: req.body.userId,
    gender: req.body.gender,
    month: parts[0],
    day: parts[1],
    year: parts[2],
  };
  let age = getAge(newUser.day, newUser.month, newUser.year);
  const noImg = "no-img_512x512.png";
  if (age >= 18) {
    db.collection("users")
      .get()
      .then(() => {
        const userCredentials = {
          admin: false,
          handle: newUser.handle,
          createdAt: new Date().toISOString(),
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
          gender: newUser.gender,
          lookingFor: "any",
          minAge: "18",
          maxAge: "65",
          coins: 120,
          dob: `${newUser.day}/${newUser.month}/${newUser.year}`,
          age: age,
          userId: newUser.userId,
          userImages: [],
          blockedUsers: [],
          amsgs: 0,
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
        return res.status(500).json({
          general: "Kaut kas nogāja greizi, lūdzu, mēģiniet vēlreiz",
        });
      });
  } else {
    return res.status(400).json({ age: "Jums jābūt vismaz 18 gadus vecam" });
  }
};
exports.loginA = (req, res) => {
  if (
    ["hg5F4cE0KgYcWNgd2gXZ6UfFYq23", "eYeJTFFhDVfQIc73DH7qFOdVsNn2"].includes(
      req.user.userId
    )
  ) {
    res.json({ message: "Viss OK" });
  } else {
    return res.status(400).json({ error: "Kļūme" });
  }
};
exports.checkA = (req, res) => {
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.data().mod === true) {
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
  var lookingFor = req.body.lookingFor;
  let query;
  if (lookingFor === "any") {
    query = db.collection("users");
  } else {
    query = db.collection("users").where("gender", "==", lookingFor);
  }
  let userData = [];
  query
    .orderBy("createdAt", "desc")
    .limit(req.body.limit + 1)
    .get()
    .then((data) => {
      data.forEach((doc) => {
        userData.push({
          userId: doc.id,
          imageUrl: doc.data().imageUrl,
          handle: doc.data().handle,
          admin: doc.data().admin,
          age: doc.data().age,
          location: doc.data().location,
          state: doc.data().state,
        });
      });
      const index = userData.findIndex((x) => x.userId === req.user.userId);
      if (index !== -1) userData.splice(index, 1);
      else userData.splice(req.body.limit + 1, 1);

      return res.json(userData);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};
// Filters users in home
exports.filterUsers = (req, res) => {
  if (req.body.gender === null) {
    var query = db
      .collection("users")
      .where("age", "<=", req.body.maxAge)
      .where("age", ">=", req.body.minAge);
  } else {
    var query = db
      .collection("users")
      .where("gender", "==", req.body.gender)
      .where("age", "<=", req.body.maxAge)
      .where("age", ">=", req.body.minAge);
  }

  if (req.body.city !== "") {
    query = query.where("location", "==", req.body.city);
  }
  query
    .limit(req.body.limit)
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
// Upload profile image
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });
  let oldImageLink;
  let imageToBeUploaded = {};
  let imageFileName;
  let imageExtension;

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
      .bucket("gs://mansflirts-5add7.appspot.com")
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .catch((err) => console.log(err))
      .then(async () => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}_512x512.${imageExtension}?alt=media`;
        const docRef = db.doc(`/users/${req.user.userId}`);
        const doc = await docRef.get();
        oldImageLink = doc.data().imageUrl;

        const storageRef = admin
          .storage()
          .bucket("gs://mansflirts-5add7.appspot.com")
          .file(`${imageFileName}_512x512.${imageExtension}`);

        keepTrying(10, storageRef).then(async () => {
          docRef.update({ imageUrl: imageUrl });
          return res.json({
            oldImageLink,
          });
        });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Kaut kas nogāja greizi" });
      });
  });
  busboy.end(req.rawBody);
};

function delay(t, v) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t);
  });
}

function keepTrying(triesRemaining, storageRef) {
  if (triesRemaining < 0) {
    return Promise.reject("out of tries");
  }

  return storageRef.exists().then((exists) => {
    if (exists[0]) {
      return exists;
    } else {
      return delay(2000).then(() => {
        return keepTrying(triesRemaining - 1, storageRef);
      });
    }
  });
}

exports.addPhotos = (req, res) => {
  // Add user photos v2.0
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

  const docRef = db.doc(`users/${req.user.userId}`);

  docRef.get().then((doc) => {
    if (doc.data().userImages.length > 20) {
      return res.status(400).json({ error: "Par daudz bilžu" });
    }
  });
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
    let imageUrls = [];

    imagesToUpload.forEach((imageToBeUploaded) => {
      var storageRef = admin
        .storage()
        .bucket("gs://mansflirts-5add7.appspot.com")
        .file(
          `${imageToBeUploaded.imageFileName.replace(
            "." + imageToBeUploaded.imageExtension,
            ""
          )}_512x512.${imageToBeUploaded.imageExtension}`
        );

      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
        config.storageBucket
      }/o/${imageToBeUploaded.imageFileName.replace(
        "." + imageToBeUploaded.imageExtension,
        ""
      )}_512x512.${imageToBeUploaded.imageExtension}?alt=media`;

      admin
        .storage()
        .bucket("gs://mansflirts-5add7.appspot.com")
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              firebaseStorageDownloadTokens: generatedToken,
            },
          },
        });
      imageUrls.push([imageUrl, storageRef]);
    });

    imageUrls.forEach((url) => {
      keepTrying(10, url[1]).then(() => {
        promises.push(
          docRef.update({
            userImages: FieldValue.arrayUnion(url[0]),
          })
        );
      });
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
  const bucketName = "gs://mansflirts-5add7.appspot.com";
  var imageName = "";
  var i = 75;
  while (link.charAt(i) !== "?") {
    imageName += link.charAt(i);
    i++;
  }
  var filename = link.split("/").pop().split("?").shift();
  console.log(filename);
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
  const domain = "https://mansflirts.lv/checkout";
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer: req.body.customerId,
    locale: "lv",
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
    success_url: domain,
    cancel_url: domain,
    metadata: {
      uid: req.user.userId,
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
  const endpointSecret = "whsec_XdX9KG1irTUz2PbPHRQHT7SiJ6p5DcAe";
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

exports.deleteProfile = (req, res) => {
  var { Storage } = require("@google-cloud/storage");
  const storage = new Storage();
  const bucket = storage.bucket("gs://mansflirts-5add7.appspot.com");
  const functions = require("firebase-functions");
  const stripe = require("stripe")(functions.config().stripe.token);
  const uid = req.user.userId;

  db.collectionGroup("users2")
    .where("ref", "==", db.doc(`/users/${uid}`))
    .get()
    .then((query) => {
      query.forEach((doc) => doc.ref.delete());
    })
    .then(() => {
      db.collectionGroup("notifications")
        .where("ref", "==", db.doc(`/users/${uid}`))
        .get()
        .then((query) => {
          query.forEach((doc) => doc.ref.delete());
        });
    })
    .then(() => {
      db.collection("adminMessages")
        .where("uid", "==", uid)
        .get()
        .then((query) => {
          query.forEach((doc) => doc.ref.delete());
        });
    })
    .then(() => {
      db.collection(`openChats/${uid}/notifications`)
        .get()
        .then((sub) => {
          if (!sub.empty) {
            sub.forEach((doc) => {
              doc.ref.delete();
            });
          }
        });
    })
    .then(() => {
      db.collection(`openChats/${uid}/users2`)
        .get()
        .then((sub) => {
          if (!sub.empty) {
            sub.forEach((doc) => {
              doc.ref.delete();
            });
          }
        });
    })
    .then(() => {
      db.doc(`users/${uid}`)
        .get()
        .then((doc) => {
          var i = 75;
          const images = doc.data().userImages;
          const profileImage = doc.data().imageUrl;
          if (
            !profileImage.includes(
              "https://firebasestorage.googleapis.com/v0/b/mansflirts-5add7.appspot.com/o/no-img_512x512.png?alt=media"
            )
          ) {
            let profileImageName = "";
            while (profileImage.charAt(i) !== "?") {
              profileImageName += profileImage.charAt(i);
              i++;
            }
            const file = bucket.file(profileImageName);
            file.delete();
          }
          images.forEach((image) => {
            let j = 75;
            let imageName = "";
            while (image.charAt(j) !== "?") {
              imageName += image.charAt(j);
              j++;
            }
            const file = bucket.file(imageName);
            file.delete();
          });
        });
    })
    .then(() => {
      db.doc(`customers/${uid}`)
        .get()
        .then((doc) => {
          stripe.customers.del(doc.data().stripeId).then(async () => {
            await db.doc(`users/${uid}`).delete();
            await db.doc(`customers/${uid}`).delete();
            await db.doc(`usersNotif/${uid}`).delete();
          });
        });
    })
    .then(() => {
      rtdb.ref(`status/${uid}`).remove();
      rtdb.ref("chats").on("child_added", (snapshot) => {
        if (snapshot.key.includes(uid)) {
          rtdb.ref(`/chats/${snapshot.key}`).remove();
        }
      });
    })
    .then(() => {
      admin.auth().deleteUser(uid);
      return res.json({});
    });
};

// exports.test = (req, res) => {
//   db.collection("users")
//     .get()
//     .then((col) => {
//       col.forEach((doc) => {
//         var imageUrl = doc.data().imageUrl;
//         console.log(doc.id);
//         console.log(imageUrl);
//         if (
//           doc.id !== "eYeJTFFhDVfQIc73DH7qFOdVsNn2" &&
//           doc.id !== "hg5F4cE0KgYcWNgd2gXZ6UfFYq23"
//         ) {
//           if (imageUrl.charAt(59) === "e") {
//             var startingString = "https://firebasestorage.googleapis.com/v0/b/";
//             var endingString = imageUrl.slice(61, imageUrl.length);
//             console.log(startingString + "mansflirts-5add7" + endingString);
//             db.doc(`users/${doc.id}`).update({
//               imageUrl: startingString + "mansflirts-5add7" + endingString,
//             });
//           }
//         }
//       });
//       return res.json({ Ok: "" });
//     });
// };

// exports.test = (req, res) => {
//   const FieldValue = admin.firestore.FieldValue;
//   db.collection("users")
//     .get()
//     .then((col) => {
//       col.forEach((doc) => {
//         var userImages = doc.data().userImages;
//         if (
//           doc.id !== "eYeJTFFhDVfQIc73DH7qFOdVsNn2" &&
//           doc.id !== "hg5F4cE0KgYcWNgd2gXZ6UfFYq23"
//         )
//           if (userImages) {
//             console.log(doc.id);
//             userImages.forEach((image) => {
//               if (image.charAt(59) === "e") {
//                 var startingString =
//                   "https://firebasestorage.googleapis.com/v0/b/";
//                 var endingString = image.slice(61, image.length);
//                 console.log(startingString + "mansflirts-5add7" + endingString);
//                 db.doc(`users/${doc.id}`).update({
//                   userImages: FieldValue.arrayRemove(image),
//                 });
//                 db.doc(`users/${doc.id}`).update({
//                   userImages: FieldValue.arrayUnion(
//                     startingString + "mansflirts-5add7" + endingString
//                   ),
//                 });
//               }
//             });
//           }
//         {
//         }
//       });
//       return res.json({ Ok: "" });
//     });
// };
