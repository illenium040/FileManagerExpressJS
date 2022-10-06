require("dotenv").config();
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

const db = require("./queries");

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//get queries
app.get("/files/download/:id", db.downloadFile);
app.get("/folders", db.getRootFolders);
app.get("/files", db.getRootFiles);
app.get("/files/:id", db.getFolderFilesById);
app.get("/folders/nested/:id", db.getNestedFoldersById);
//post queries
app.post("/folders", db.addFolder);
app.post("/files", db.addFile);
//put queries
app.put("/folders/rename/:id", db.renameFolder);
app.put("/files/rename/:id", db.renameFile);
//delete queries
app.delete("/folders/:id", db.deleteFolder);
app.delete("/files/:id", db.deleteFile);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
