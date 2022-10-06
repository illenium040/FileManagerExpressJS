"use strict";
import { init, subscribeToContextMenu } from "./contextmenu.js";
const host = "http://localhost:3000";

//map folders and files to get real values when trigger from context menu
const elementToFolder = new Map();
const elementToFile = new Map();
///////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////API////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
const customFetch = (url, method, body) => {
  return fetch(`${host}/${url ?? ""}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    method: method ?? "GET",
  })
    .then((response) => response.json())
    .catch((error) => console.error(error));
};

const download = (id) => {
  document.getElementById(
    "download_frame"
  ).src = `${host}/files/download/${id}`;
};

const getRoot = () => {
  const foldersQuery = customFetch("folders");
  const filesQuery = customFetch("files");
  return Promise.all([foldersQuery, filesQuery]).then((values) => ({
    folders: values[0],
    files: values[1],
  }));
};

const getNestedFolders = (id) => customFetch(`folders/nested/${id}`);
const getFilesByFolderId = (folderId) => customFetch(`files/${folderId}`);

const addFolder = (body) => customFetch(`folders`, "POST", body);
const addFile = (body) => customFetch("files", "POST", body);

const renameFolder = (name, id) =>
  customFetch(`folders/rename/${id}`, "PUT", { name: name });

const renameFile = (name, type, id) =>
  customFetch(`files/rename/${id}`, "PUT", { name: name, type: type });

const deleteFolder = (id) => customFetch(`folders/${id}`, "DELETE");
const deleteFile = (id) => customFetch(`files/${id}`, "DELETE");
///////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////API////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//context target element, may cause some troubles, but its easy to work with context menu like this
let fileTarget, folderTarget;

//get context menu elements to subscribe to them later
const getFileContextMenu = () => document.getElementById("context-menu-file");
const getFolderContextMenu = () =>
  document.getElementById("context-menu-folder");
const getRootContextMenu = () => document.getElementById("context-menu-root");

//some processing before fetch
const addFolderHandler = (folderElement, name) => {
  const folder = elementToFolder.get(folderElement);
  if (!folder) return addFolder({ name: name, parentId: undefined });
  return addFolder({ name: name, parentId: folder["id"] });
};
const renameFolderHandler = (folderElement, name) => {
  const folder = elementToFolder.get(folderElement);
  return renameFolder(name, folder["id"]);
};
const renameFileHandler = (fileElement, txt) => {
  const file = elementToFile.get(fileElement);
  const prevType = file["type"];
  const splitted = txt.split(".");
  const type =
    splitted.length > 1
      ? splitted.splice(splitted.length - 1, 1).at(0)
      : prevType;
  const name = splitted.join(".");

  return renameFile(name, type, file["id"]);
};

//app initialization
window.onload = async () => {
  const rootTarget = document.getElementById("root");
  const rootCtx = getRootContextMenu();
  const fileCtx = getFileContextMenu();
  const folderCtx = getFolderContextMenu();
  //here just set up event to close context menus
  init([rootCtx, fileCtx, folderCtx]);
  //add actions to invoke when context menu button is clicked
  addFileActions(fileCtx);
  addFolderActions(folderCtx);
  addRootActions(rootCtx, rootTarget);
  //load root folders and files
  const root = await getRoot();
  renderNestedContent(
    rootTarget.querySelector(".nested"),
    root.folders,
    root.files
  );
  //show this context menu only for element with this id
  subscribeToContextMenu(
    document.getElementById("root-context"),
    getRootContextMenu()
  );
};

//////////////////////////////////RENDERS////////////////////////////////////////

//create 2 queries to load files and folders
//it can be better but i could waste some time here -_-
function loadNestedFilesAndFolders(folderId) {
  return Promise.all([
    getNestedFolders(folderId),
    getFilesByFolderId(folderId),
  ]).then((values) => ({
    folders: values[0],
    files: values[1],
  }));
}
//render label for folder
//there is fetch when its become active
function renderFolderLabel(text) {
  const label = document.createElement("span");
  label.className = "folder";
  label.addEventListener("click", function () {
    const isActive = this.parentElement
      .querySelector(".nested")
      .classList.toggle("active");
    this.classList.toggle("caret-down");
    if (isActive) {
      //reload data for this folder on every click
      const folder = elementToFolder.get(this.parentElement);
      const container = this.parentElement.querySelector(".nested");
      loadNestedFilesAndFolders(folder["id"]).then((x) =>
        renderNestedContent(container, x.folders, x.files)
      );
    }
  });
  label.textContent = text ?? "";
  return label;
}

//render files and folders
function renderNestedContent(container, folders, files) {
  container.innerHTML = "";
  for (const folder of folders) {
    container.appendChild(renderFolder(folder));
  }
  for (const file of files) {
    container.appendChild(renderFile(file));
  }
}

//render folder view
function renderFolder(folder) {
  const container = document.createElement("li");
  container.appendChild(renderFolderLabel(folder["name"]));
  const nested = document.createElement("ul");
  nested.className = "nested";
  container.appendChild(nested);
  elementToFolder.set(container, folder);
  subscribeToContextMenu(container, getFolderContextMenu(), (e) => {
    e.stopPropagation();
    folderTarget = e.currentTarget;
  });
  console.table(folder);
  return container;
}
//render file view
function renderFile(file) {
  const container = document.createElement("li");
  container.className = "file";
  container.textContent = `${file["name"]}.${file["type"]}`;
  elementToFile.set(container, file);
  subscribeToContextMenu(container, getFileContextMenu(), (e) => {
    e.stopPropagation();
    fileTarget = e.currentTarget;
  });
  return container;
}
//render form, for example to add or rename file or folder
function renderInputTextForm(onSave) {
  const container = document.createElement("div");
  const text = document.createElement("input");
  const save = document.createElement("input");
  const cancel = document.createElement("input");
  container.appendChild(text);
  container.appendChild(save);
  container.appendChild(cancel);
  text.type = "text";
  save.type = "button";
  cancel.type = "button";
  save.value = "save";
  cancel.value = "cancel";
  cancel.onclick = (e) => container.remove();
  save.onclick = (e) => {
    container.remove();
    onSave(text.value);
  };
  return container;
}
//render form to upload a file
function renderUploadForm(folderItem) {
  const container = document.createElement("div");
  const fileInput = document.createElement("input");
  const save = document.createElement("input");
  const cancel = document.createElement("input");
  container.appendChild(fileInput);
  container.appendChild(save);
  container.appendChild(cancel);
  fileInput.type = "file";
  save.type = "button";
  cancel.type = "button";
  save.value = "save";
  cancel.value = "cancel";
  cancel.onclick = (e) => container.remove();
  save.onclick = (e) => {
    container.remove();
    if (fileInput.files && fileInput.files.length > 0) {
      const splitted = fileInput.files[0].name.split(".");
      var reader = new FileReader();
      reader.readAsText(fileInput.files[0], "UTF-8");
      reader.onload = (e) => {
        const file = {
          name: splitted[0],
          type: splitted[1],
          content: e.target.result,
          folderId: elementToFolder.has(folderItem)
            ? elementToFolder.get(folderItem)["id"]
            : null,
        };
        addFile(file).then((x) => {
          if (!x) return;
          file["id"] = x["id"];
          container.remove();
          folderItem.querySelector(".nested").appendChild(renderFile(file));
        });
      };
    }
  };
  return container;
}
//////////////////////////////////RENDERS////////////////////////////////////////

/////////////////////////////////ACTIONS////////////////////////////////////
//actions only for root folder
function addRootActions(rootContext, rootTarget) {
  rootContext.querySelector(".add-folder").addEventListener("click", (e) => {
    rootTarget.appendChild(
      renderInputTextForm((txt) => {
        addFolderHandler(rootTarget, txt).then((value) => {
          rootTarget.appendChild(
            renderFolder({
              id: value[0]["id"],
              name: txt,
            })
          );
        });
      })
    );
  });
  rootContext.querySelector(".add-file").addEventListener("click", (e) => {
    rootTarget.appendChild(renderUploadForm(rootTarget));
  });
}
//actions for each folder
function addFolderActions(folderContext) {
  folderContext.querySelector(".add-folder").addEventListener("click", (e) => {
    const target = folderTarget;
    target.appendChild(
      renderInputTextForm((txt) => {
        addFolderHandler(target, txt).then((value) => {
          target.querySelector(".nested").appendChild(
            renderFolder({
              id: value[0]["child_id"],
              name: txt,
            })
          );
        });
      })
    );
  });
  folderContext.querySelector(".add-file").addEventListener("click", (e) => {
    folderTarget.appendChild(renderUploadForm(folderTarget));
  });
  folderContext.querySelector(".delete").addEventListener("click", (e) => {
    const target = folderTarget;
    const folder = elementToFolder.get(target);
    deleteFolder(folder).then((x) => {
      if (!x) return;
      elementToFolder.delete(target);
      target.innerHTML = "";
    });
  });
  folderContext.querySelector(".rename").addEventListener("click", (x) => {
    const target = folderTarget;
    target.appendChild(
      renderInputTextForm((txt) => {
        renameFolderHandler(target, txt).then((x) => {
          if (!x) return;
          target.querySelector(".folder").textContent = x["name"];
        });
      })
    );
  });
}
//actions for each file
function addFileActions(fileContext) {
  fileContext.querySelector(".delete").addEventListener("click", (e) => {
    const target = fileTarget;
    const file = elementToFile.get(target);
    deleteFile(file["id"]).then((x) => {
      if (!x) return;
      elementToFile.delete(target);
      target.remove();
    });
  });
  fileContext.querySelector(".rename").addEventListener("click", (x) => {
    const target = fileTarget;
    target.appendChild(
      renderInputTextForm((txt) => {
        renameFileHandler(target, txt).then((x) => {
          if (!x) return;
          target.textContent = `${x["name"]}.${x["type"]}`;
        });
      })
    );
  });
  fileContext.querySelector(".download").addEventListener("click", (x) => {
    const file = elementToFile.get(fileTarget);
    download(file["id"]);
  });
}
/////////////////////////////////ACTIONS////////////////////////////////////
