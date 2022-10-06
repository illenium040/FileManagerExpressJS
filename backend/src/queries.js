const fs = require("fs");
const Pool = require("pg").Pool;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const addFile = (request, response) => {
  const { name, type, content, folderId } = request.body;
  pool.query(
    "INSERT INTO files(name, type, content, folder_id) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, type, content, folderId],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).send(result.rows[0]);
    }
  );
};
const deleteFile = (request, response) => {
  const id = parseInt(request.params.id);
  pool.query("DELETE FROM files WHERE files.id = $1", [id], (error, result) => {
    if (error) {
      console.error(error);
      response.status(404);
      return;
    }
    response.status(200).send({ id });
  });
};
const addFolder = (request, response) => {
  const { name, parentId } = request.body;
  let query = `INSERT INTO folders(name, parent_id) VALUES ($1, $2) RETURNING id`;
  //there is nested folder, so create new query
  if (parentId) {
    query = `WITH rows AS (${query}) INSERT INTO nestingfolders SELECT $2, id from rows RETURNING child_id`;
  }
  pool.query(query, [name, parentId], (error, result) => {
    if (error) {
      console.error(error);
      response.status(404);
      return;
    }
    response.status(201).send(result.rows);
  });
};
const deleteFolder = (request, response) => {
  const id = parseInt(request.params.id);
  pool.query(
    "DELETE FROM folders WHERE folders.id = $1",
    [id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).send({ id });
    }
  );
};
const renameFile = (request, response) => {
  const id = parseInt(request.params.id);
  const { name, type } = request.body;
  pool.query(
    "UPDATE files SET name = $1, type = $2 WHERE id = $3 RETURNING name, type",
    [name, type, id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).send(result.rows[0]);
    }
  );
};
const renameFolder = (request, response) => {
  const id = parseInt(request.params.id);
  const { name } = request.body;
  pool.query(
    "UPDATE folders SET name = $1 WHERE id = $2 RETURNING name",
    [name, id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).send(result.rows[0]);
    }
  );
};

const getRootFiles = (request, response) => {
  pool.query(
    `select * from files
    where folder_id is null`,
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).json(result.rows);
    }
  );
};

const getRootFolders = (request, response) => {
  pool.query(
    `select * from folders
    where parent_id is null`,
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).json(result.rows);
    }
  );
};

const getNestedFoldersById = (request, response) => {
  const id = parseInt(request.params.id);
  if (!id) return;
  pool.query(
    `select * from folders
    where folders.id in (select child_id from folders
    JOIN nestingfolders ON nestingfolders.parent_id = folders.id
    where nestingfolders.parent_id = $1)
    order by folders.id`,
    [id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).json(result.rows);
    }
  );
};

const getFolderFilesById = (request, response) => {
  const id = parseInt(request.params.id);
  if (!id) return;
  pool.query(
    `SELECT
    files.id as id,
    files.name as name, 
    files.type as type, 
    files.content as content 
    FROM folders JOIN files ON files.folder_id = folders.id
    WHERE folders.id = $1`,
    [id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      response.status(200).json(result.rows);
    }
  );
};

const downloadFile = (request, response) => {
  const id = parseInt(request.params.id);
  if (!id) return;
  pool.query(
    `SELECT name, content, type from files WHERE id = $1`,
    [id],
    (error, result) => {
      if (error) {
        console.error(error);
        response.status(404);
        return;
      }
      if (!fs.existsSync("files")) {
        fs.mkdirSync("files");
      }
      const file = result.rows[0];
      const fileName = `files/${id}_${file["name"]}.${file["type"]}`;
      fs.writeFile(fileName, file["content"], (err) => {
        if (err) throw err;
        response.status(200).download(fileName);
      });
    }
  );
};

module.exports = {
  addFolder,
  addFile,
  deleteFolder,
  deleteFile,
  renameFolder,
  renameFile,
  getFolderFilesById,
  getNestedFoldersById,
  getRootFolders,
  getRootFiles,
  downloadFile,
};
