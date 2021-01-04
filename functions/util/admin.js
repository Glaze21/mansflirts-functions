const admin = require("firebase-admin");
var config = require("../util/config");

admin.initializeApp(config);

const db = admin.firestore();
var rtdb = admin.database();

db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db, rtdb };
