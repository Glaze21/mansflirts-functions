const { db } = require("../util/admin");

exports.getAllSnippets = (req, res) => {
  db.collection("snippets")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let snippets = [];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          ...doc.data(),
        });
      });
      return res.json(snippets);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postOneSnippet = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newSnippet = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };

  db.collection("snippets")
    .add(newSnippet)
    .then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
};
