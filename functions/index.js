const functions = require('firebase-functions');
const admin = require("firebase-admin");

admin.initializeApp();

const express = require("express");
const app = express();

app.get("/snippets", (req,res) => {
  admin
    .firestore()
    .collection("snippets")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let snippets = []
      data.forEach(doc => {
         snippets.push({
           screamId: doc.id,
           ...doc.data()
         });
      });
      return res.json(snippets);
    })
    .catch(err => console.error(err));
})

app.post("/snippet", (req, res) => {
  const newSnippet = {
  body: req.body.body,
  userHandle: req.body.userHandle,
  createdAt: new Date().toISOString()
  };

  admin
    .firestore()
    .collection("snippets")
    .add(newSnippet)
    .then((doc) => {
        res.json({ message: `document ${doc.id} created successfully`})
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong"})
      console.error(err); 
    });
});

exports.api = functions.region("europe-west1").https.onRequest(app);