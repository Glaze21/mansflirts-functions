const { admin, db, rtdb } = require("./util/admin");
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
  createSession,
  onSuccessPayment,
  updateAge,
  buyGift,
  deleteProfile,
  test,
} = require("./handlers/users");

// Users routes
app.post("/validUser", validUser);
app.post("/signup", signup);
app.post("/signupGoogleFB", signupGoogleFB);
app.post("/login", login);
app.post("/loginA", FBAuth, loginA);
app.post("/checkA", FBAuth, checkA);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user/addPhotos", FBAuth, addPhotos);
app.post("/user/removeImage", FBAuth, removeImage);
app.post("/create-session", FBAuth, createSession);
app.post("/webhook", onSuccessPayment);
app.post("/getAllUsers", FBAuth, getAllUsers);
app.post("/filterUsers", FBAuth, filterUsers);
app.post("/user", FBAuth, addUserDetails);
app.post("/updateAge", FBAuth, updateAge);
app.post("/buyGift", FBAuth, buyGift);
app.delete("/deleteProfile", FBAuth, deleteProfile);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:userId", getUserDetails);
app.post("/test", test);

exports.api = functions.region("europe-west3").https.onRequest(app);

function sendMsgs(tokens, uid2, msg, uid, trigger) {
  tokens.forEach((token) => {
    db.doc(`/users/${uid2}`)
      .get()
      .then((doc) => {
        var message = {
          data: {
            title: doc.data().handle,
            body: msg,
          },
          token: token,
        };
        admin
          .messaging()
          .send(message)
          .catch(() => {
            console.log(
              "error sending notification to token, deleting token: ",
              token
            );
            if (trigger) {
              db.doc(`/usersNotif/8s5WMBOoj9MRNyyIGC3SVnRcAJ13`).update({
                tokens: admin.firestore.FieldValue.arrayRemove(token),
              });
              db.doc(`/usersNotif/tBwiHDv4NKfLQn77tKo8Ul5vM4h2`).update({
                tokens: admin.firestore.FieldValue.arrayRemove(token),
              });
            } else {
              db.doc(`/usersNotif/${uid}`).update({
                tokens: admin.firestore.FieldValue.arrayRemove(token),
              });
            }
          });
      });
  });
}

const createCustomerRecord = async ({ email, uid }) => {
  const stripe = require("stripe")(functions.config().stripe.token);
  try {
    const customerData = {
      metadata: {
        firebaseUID: uid,
      },
    };
    if (email) customerData.email = email;
    const customer = await stripe.customers.create(customerData);
    // Add a mapping record in Cloud Firestore.
    const customerRecord = {
      stripeId: customer.id,
      stripeLink: `https://dashboard.stripe.com${
        customer.livemode ? "" : "/test"
      }/customers/${customer.id}`,
    };
    await db.doc(`customers/${uid}`).set(customerRecord, { merge: true });
    return customerRecord;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// RTDB Triggers
exports.userSignup = functions
  .region("europe-west3")
  .auth.user()
  .onCreate(async (user) => {
    const { email, uid } = user;
    await createCustomerRecord({ email, uid });

    const userNotifDoc = await db
      .doc(`usersNotif/8s5WMBOoj9MRNyyIGC3SVnRcAJ13`)
      .get();
    const userNotifDoc2 = await db
      .doc(`usersNotif/tBwiHDv4NKfLQn77tKo8Ul5vM4h2`)
      .get();

    var tokens = [];
    if (userNotifDoc.exists) {
      userNotifDoc.data().tokens.forEach((token) => {
        tokens.push(token);
      });
    }
    if (userNotifDoc2.exists) {
      userNotifDoc2.data().tokens.forEach((token) => {
        tokens.push(token);
      });
    }
    return sendMsgs(tokens, user.uid, "Jauns lietotājs", null, true);
  });

exports.onUserStatusChanged = functions
  .region("europe-west3")
  .database.ref("/status/{uid}")
  .onUpdate(async (change, context) => {
    const eventStatus = change.after.val();

    const userStatusFirestoreRef = db.doc(`/users/${context.params.uid}`);

    const statusSnapshot = await change.after.ref.once("value");
    const status = statusSnapshot.val();
    if (status.last_active > eventStatus.last_active) {
      return null;
    }

    // eventStatus.last_active = new Date(eventStatus.last_active);

    return userStatusFirestoreRef.update(eventStatus);
  });

exports.onRecieveMessage = functions
  .region("europe-west3")
  .database.ref("/chats/{uids}/{msgId}")
  .onCreate(async (snapshot, context) => {
    const uids = context.params.uids;
    const msgId = context.params.msgId;

    const msgData = snapshot.val();
    const uid2 = msgData.uid;

    let uid = uids.replace(uid2, "");
    uid = uid.replace("_", "");

    const doc = await db.doc(`/users/${uid}`).get();

    //admin
    if (doc.data().admin) {
      const userNotifDoc = await db
        .doc(`usersNotif/8s5WMBOoj9MRNyyIGC3SVnRcAJ13`)
        .get();
      const userNotifDoc2 = await db
        .doc(`usersNotif/tBwiHDv4NKfLQn77tKo8Ul5vM4h2`)
        .get();
      db.doc(`/adminMessages/${msgId}`).set({
        msg: msgData.text,
        type: msgData.type,
        read: false,
        uid: uid2,
        recipient: uid,
        ref: db.doc(`users/${uid2}`),
      });
      var tokens = [];
      if (userNotifDoc.exists) {
        userNotifDoc.data().tokens.forEach((token) => {
          tokens.push(token);
        });
      }
      if (userNotifDoc2.exists) {
        userNotifDoc2.data().tokens.forEach((token) => {
          tokens.push(token);
        });
      }
      return sendMsgs(
        tokens,
        uid2,
        msgData.type === "gift" ? "Dāvana" : msgData.text,
        null,
        true
      );
      //blocked
    } else if (doc.data().blockedUsers.includes(uid2)) {
      return null;
      //standard
    } else {
      const userNotifDoc = await db.doc(`usersNotif/${uid}`).get();
      const users2 = await db.doc(`/openChats/${uid}/users2/${uid2}`).get();
      const notificationsRef = db.doc(
        `/openChats/${uid}/notifications/${uid2}`
      );
      //users2
      if (users2.exists) {
        users2.ref.set({
          read: false,
          msg: msgData.text,
          type: msgData.type,
          ref: db.doc(`users/${uid2}`),
          date: Date.now(),
        });
        if (userNotifDoc.exists) {
          return sendMsgs(
            userNotifDoc.data().tokens,
            uid2,
            msgData.type === "gift" ? "Dāvana" : msgData.text,
            uid
          );
        } else {
          return null;
        }
      } else {
        //notif
        notificationsRef.set({
          read: false,
          msg: msgData.text,
          type: msgData.type,
          ref: db.doc(`users/${uid2}`),
          date: Date.now(),
        });
        if (userNotifDoc.exists) {
          return sendMsgs(
            userNotifDoc.data().tokens,
            uid2,
            msgData.type === "gift" ? "Dāvana" : msgData.text,
            uid
          );
        } else {
          return null;
        }
      }
    }
  });

exports.scheduledMessages = functions
  .region("europe-west3")
  .pubsub.schedule("every 25 minutes")
  .onRun(async (context) => {
    var msgs = [
      "Čau, tu te jauniņais esi? Neesmu tevi redzējusi šeit vēl 😀",
      "Klau, negribu uzmākties, bet ļoti iepatikies, varbūt vēlies pačatot?",
      "Ko tad tāds vīrietis kā tu šeit dara, haha? īslaicīgu romānu, vai kaut ko nopietnāku meklē?",
      "Čau, kādi vēji tevi uz šejieni atpūtuši? ",
      "Zinu, ka parasti sievietes neraksta pirmās, bet šeit izlēmu uztaisīt izņēmumu.. čau! 😜",
      "Tieši un uzreiz..-Nekad nav par vēlu jaunai pieredzei,ne?",
      "Tici tam, ka cilvēks var iemīlēties no pirmā acu skatiena? 😄",
      "Sveiks, vai tu jau atradi kādu? Vai arī tevi interesē uzrakstīt man?",
      "Čau.. gribi pačatot? 🥰",
      "Čau, kādi tev plāni karantīnai, negribi parunāties?",
    ];
    var adminUids = [];

    const admins = await db
      .collection("users")
      .where("admin", "==", true)
      .where("state", "==", "online")
      .get();
    const onlineUsers = await db
      .collection("users")
      .where("admin", "==", false)
      .where("state", "==", "online")
      .get();

    if (onlineUsers.empty) {
      return null;
    }
    admins.forEach((admin) => {
      adminUids.push(admin.id);
    });
    onlineUsers.forEach(async (onlineUser) => {
      var uidsInContacts = [];
      const uid = onlineUser.data().userId;
      const users2 = await db.collection(`openChats/${uid}/users2`).get();
      const notifications = await db
        .collection(`openChats/${uid}/notifications`)
        .get();

      users2.forEach((user2) => {
        uidsInContacts.push(user2.id);
      });
      notifications.forEach((notif) => {
        uidsInContacts.push(notif.id);
      });
      uidsInContacts.forEach((uid) => {
        const index = adminUids.indexOf(uid);
        if (index !== -1) {
          adminUids.splice(index, 1);
        }
      });
      if (adminUids.length !== 0) {
        const uid2 = adminUids[Math.floor(Math.random() * adminUids.length)];

        rtdb
          .ref("/chats/" + (uid < uid2 ? uid + "_" + uid2 : uid2 + "_" + uid))
          .once("value")
          .then((snap) => {
            if (snap.val() === null) {
              snap.ref.push({
                text: msgs[Math.floor(Math.random() * msgs.length)],
                timestamp: Date.now(),
                uid: uid2,
                type: "text",
              });
            } else {
              return null;
            }
          });
      }
    });
    return null;
  });
