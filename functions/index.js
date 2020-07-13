const functions = require('firebase-functions');
const admin = require("firebase-admin");
const app = require("express")();

admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyB8vU6CCJTykyml4QSzjDG2wYgfyiL9_GA",
  authDomain: "dating-site-e5be3.firebaseapp.com",
  databaseURL: "https://dating-site-e5be3.firebaseio.com",
  projectId: "dating-site-e5be3",
  storageBucket: "dating-site-e5be3.appspot.com",
  messagingSenderId: "606732221277",
  appId: "1:606732221277:web:6ac74a09f2fe395f9d86b4",
  measurementId: "G-F0NLQ4NTQR"
};

const firebase = require("firebase");
const { object } = require('firebase-functions/lib/providers/storage');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get("/snippets", (req,res) => {
  db
    .collection("snippets")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let snippets = []
      data.forEach(doc => {
         snippets.push({
           snippetId: doc.id,
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

  db
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

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
}

const isEmpty = (string) => {
  if(string.trim() === "") return true;
  else return false;
}

//Signup route
app.post("/signup", (req,res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  let errors ={};

  if(isEmpty(newUser.email)) errors.email = "Must not be empty"
   else if(!isEmail(newUser.email)) errors.email = "Must be a valid email adress"
  if(isEmpty(newUser.password)) errors.password = "Must not be empty"
  if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = "Passwords must match"
  if(isEmpty(newUser.handle)) errors.handle = "Must not be empty"

  if(Object.keys(errors).length > 0) return res.status(400).json(errors);

  // TODO: validate data 
  let token, userId;
  db.doc(`/users/${newUser.handle}`).get()
    .then(doc =>{
      if(doc.exists){
        return res.status(400).json({ handle: `This handle is already taken`});
      } else{
        return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data =>{
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken =>{
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({token});
    })
    .catch(err => {
      console.error(err);
      if(err.code === "auth/email-already-in-use"){
        return res.status(400).json({email: "Email is already in use"})
      } else{
        return res.status(500).json({error: err.code});
      }
    })
});

app.post("/login", (req, res) =>{
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  let errors= {};
  
  if(isEmpty(user.email)) errors.email = "Must not be empty "
  if(isEmpty(user.password)) errors.password = "Must not be empty "

  if(Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then (data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({token});
    })
    .catch(err => {
      console.error(err);
      if(err.code === "auth/wrong-password"){
        return res.status(403).json({general: "Wrong credentials, please try again"});
      } else {
        return res.status(500).json({error: err.code});  
       } 
    });
});

exports.api = functions.region("europe-west1").https.onRequest(app);