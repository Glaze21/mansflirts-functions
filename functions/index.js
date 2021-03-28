const { admin, db, rtdb } = require("./util/admin");
const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth");

const cors = require("cors");
app.use(
  cors({
    origin: ["https://admin.mansflirts.lv", "https://mansflirts.lv"],
  })
);

const {
  signup,
  signupGoogleFB,
  loginA,
  checkA,
  uploadImage,
  addUserDetails,
  getUserDetails,
  getAllUsers,
  filterUsers,
  removeImage,
  addPhotos,
  createSession,
  onSuccessPayment,
  updateAge,
  buyGift,
  deleteProfile,
  SendMail,
} = require("./handlers/users");

// Users routes
app.post("/signup", signup);
app.post("/signupGoogleFB", signupGoogleFB);
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
app.get("/user/:userId", getUserDetails);

exports.api = functions.region("europe-west3").https.onRequest(app);

function sendMsgs(tokens, uid2, msg, uid) {
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
            db.doc(`/usersNotif/${uid}`).update({
              tokens: admin.firestore.FieldValue.arrayRemove(token),
            });
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
    const uid2 = "El7ym9Y566fNgRCRcvaZQWkucAl2";
    await createCustomerRecord({ email, uid });

    setTimeout(() => {
      rtdb
        .ref(`chats/${uid < uid2 ? uid + "_" + uid2 : uid2 + "_" + uid}`)
        .push({
          text:
            "Laipni lūgts un lieliski, ka esi kopā ar mums! Lai palielinātu iespēju satikt jaunus cilvēkus, ieteicams aizpildīt profila informāciju. Attēli ir tūkstoš vārdu vērta. Mēs vēlam tev daudz jautrības!",
          timestamp: Date.now(),
          uid: uid2,
          type: "text",
        })
        .then(() => {
          return db.doc(`/openChats/${uid}/notifications/${uid2}`).set({
            read: false,
            msg:
              "Laipni lūgts un lieliski, ka esi kopā ar mums! Lai palielinātu iespēju satikt jaunus cilvēkus, ieteicams aizpildīt profila informāciju. Attēli ir tūkstoš vārdu vērta. Mēs vēlam tev daudz jautrības!",
            type: "text",
            ref: db.doc(`users/${uid2}`),
            date: Date.now(),
          });
        });
    }, 10000);
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
      db.doc(`/adminMessages/${msgId}`).set({
        msg: msgData.text,
        type: msgData.type,
        read: false,
        uid: uid2,
        recipient: uid,
        ref: db.doc(`users/${uid2}`),
      });
      return SendMail(uid2, msgData.text);
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
  .pubsub.schedule("every 5 minutes")
  .onRun(async (context) => {
    var msgs = [
      "Sveiki! Tavs profils bez bildēm neizskatās diez ko labi, vai ne? :) Dari man zināmu, ja tev nepieciešama palīdzība ielikt bildi ;)",
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
      "Laipni lūgts un lieliski, ka esi kopā ar mums! Lai palielinātu iespēju satikt jaunus cilvēkus, ieteicams aizpildīt profila informāciju. Attēli ir tūkstoš vārdu vērta. Mēs vēlam tev daudz jautrības!",
      "Oho!!! Tas darbojas! Beidzot mans tips - ļoti seksīgs vīrietis :) vai mums vajadzētu nedaudz patērzēt?",
      "Pārāk kautrīgs? Kāpēc vēl nav ielikta bilde? Uz priekšu, runčuk!",
      "Vai tiešām esi brīvs?Top of Form",
      "Pastāsti man visas savas slēptākās fantāzijas",
      "Ņu pasaki man, ko tu vari piedāvāt? :p",
      "Laba diena kungs :)",
      "Pastāstīšu tev knock knock joku, bet es tevi brīdinu, atverot durvis, man nekas nebūs mugurā ;)",
      "Sveiks, jaunais puisi! Tātad, tu jau esat veicis pirmo soli (tu esi pieteicies), un 2. solis būtu tērzēt ar mani ;) Es tiešām vēlos ar tevi iepazīties... xo",
      "Sveiks, vai tev ir nepieciešama sieviete, kura beidzot piepildīs tavas slēptākās fantāzijas? Bez problēmam. Tā esmu es :) Es zinu, kā apmierināt vīrieti ;)",
      "Hei, es redzu, ka tu šeit esi jauniņais. Vai vēlies pavadīt laiku kopā un stāstīt viens otram stāstus? Nē, ne pasakas :D Es domāju jaukus, neķītrus stāstus :) Vai tu piedalies?",
      "Redzu pie tava profila zaļo ikonu. Vai esi online?",
      "Čau! Kādēļ tāda noslēpumainība, kur ir bilde? Tu mani padarīji ziņkārīgu ;-)",
      "Sveiks, kā tev gājis šodien? Pastāsti un man būs ko pastāstīt tev!",
      "Sveiks, varbūt tieši es esmu tā ko tu meklē? :*",
      "Sveiks, ceru ka drīzumā pievienosi vēl daudz foto, lai kārtīgo varu tevi apskatīt.",
      "Čau, uzraksti man! Man šķiet, ka mums varētu būt kas kopīgs.",
      "Vai jau pieliki informāciju par savām interesēm? Varbūt mums ir kas kopīgs?",
      "Vai šī arī ir tava pirmā reize šādā portālā?",
      "Hei, tu esi šeit pirmo reizi?",
      "Sveiks, no kurienes esi? Varbūt esam pazīstami?",
      "Sveiks mincīt! Mrrrrr… varu būt tava kaķenīte",
      "Beidzot kāds ar īpašu lietotājvārdu! Kāds ir tavs īstais vārds?",
      "Sveiks, vai gadījumā neesam tikušies dzīvē?",
      "Hei! Tu arī pirmo reizi esi te?",
      "Sveiks, gan jau esi izskatīgs vai ne? 🥰",
      "Halo! Es ceru ka vismaz es varu pievērst tavu uzmanību!",
      "Sveicināts pulciņā, es meklēju izklaides! Ko tu?",
      "Sveicināts! Vai vēlies lai es tev ko pastāstu?",
      "Čau! Es teikšu godīgi- meklēju kaut ko intīmu, kā būtu ar tevi?",
      "Sveiks, ceru ka esi bez sievas!",
      "Sveiks, mani nesen pameta un meklēju sev kārtīgu vīrieti 🙁",
      "Laba diena! Vai tu tiešām esi šeit un vēl neesi man uzrakstījis? Pastāsti no kurienes esi un gan atradīsim par ko parunāt!",
      "Sveiks, pirms sākam kārtīgu sarunu, vēlos tev pajautāt svarīgu jautājumu: Ko tu meklē? Tavā profilā par to nav ne miņas ",
      "Sveiks :) Vēlētos ar Tevi iepazīties, ja tas ir iespējams… Ja vien, protams, neesi jau laimīgi kopā ar kādu citu… tad gan nemaisīšos.",
      "čaviņāaa :D =)",
      "Tev šeit īpaši neveiksies ar tukšu profilu. Vai tev ir vajadzīgs kāds padoms? Es varu palīdzēt ;)",
      "Sveiks... kad es gribu kaut ko, es esmu patiešām ātra! Man ir jāizmanto sava iespēja, kamēr tu esi tiešsaistē... Es nevaru ļaut tik jaukam puisim kā tu aizbēgt.",
      "Čau, kā tev šodien gājis?",
      "Sveiks, vai varu tev ko pajautāt?",
      "Sveiks, man tev ir jautājums!! 🙂",
      "Ak mans Dievs, skiet ka zinu tevi! Atceries mani?",
      "Čau! No kura Latvijas gala esi tu?",
      "No kuries esi?",
      "Hei, atsūti man ziņu! :)",
      "Ko Tu vēlētos šobrīd darīt? Ko tu vari iedomāties darām ar mani? Man ir dažas idejas… Vēlies tās dzirdēt?",
      "Čau, kā iet?",
      "Sveiks :) Vēlētos ar Tevi iepazīties, ja tas ir iespējams… Ja vien, protams, neesi jau laimīgi kopā ar kādu citu… tad gan nemaisīšos.",
      "Meklēju šeit izklaides… Man ļoti patīks tavs profils :)",
      "Sveiks, man tev ir ko pastāstīt, vai gribi to dzirdēt?",
    ];
    var adminUids = [];

    const admins = await db
      .collection("users")
      .where("admin", "==", true)
      .where("state", "==", "online")
      .where("userId", "!=", "El7ym9Y566fNgRCRcvaZQWkucAl2")
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
      const amsgs = onlineUser.data().amsgs;
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
                text: msgs[amsgs],
                timestamp: Date.now(),
                uid: uid2,
                type: "text",
              });
            } else {
              return null;
            }
          })
          .then(() => {
            onlineUser.ref.update({
              amsgs: admin.firestore.FieldValue.increment(1),
            });
          });
      }
    });
    return null;
  });
