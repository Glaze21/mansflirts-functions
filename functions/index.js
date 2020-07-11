const functions = require('firebase-functions');
const admin = require("firebase-admin") 

admin.initializeApp();

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello World!");
});

exports.getSnippets = functions.https.onRequest((req, res) => {
  admin.firestore().collection("snippets").get()
    .then(data => {
      let snippets = []
      data.forEach(doc => {
         snippets.push(doc.data());
      });
      return res.json(snippets);
    })
    .catch(err => console.error(err));
})

exports.createSnippet = functions.https.onRequest((req, res) => {
  const newSnippet = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
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