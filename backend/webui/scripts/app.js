let currentPath = null;
let selectedItems = [];
let selectedDir = null;
let errorTimeout = null;

/* ---------- AUTH ---------- */
async function checkLogin() {
  const res = await fetch("/api/login/is-logged");

  if (res.ok) {
    showFileView();
  } else {
    document.getElementById("loginView").style.display = "flex";
  }
}

async function doLogin() {
  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  await fetch("api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  checkLogin();
}

/* ---------- FILE VIEW ---------- */

function getParentPath(path) {
  if (!path) return null;

  const parts = path.replace(/\/+$/, "").split("/");

  if (parts.length <= 2) return null;

  parts.pop();
  return parts.join("/") || "/";
}


function showFileView() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("fileView").style.display = "block";
  loadDir();
}

async function loadDir(path = null) {
  selectedItems = [];

  const res = await fetch("/api/dir/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });

  const data = await res.json();

  selectedDir = data.selectedDir; 
  currentPath = data.selectedDir.path;

  document.getElementById("breadcrumb").innerText = currentPath;

  updateToolbar();
  renderFiles(data.dirContent);
}

function renderFiles(files) {
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  files.forEach((f) => {
    const div = document.createElement("div");
    div.className = "file-item";

    const icon = document.createElement("i");

    if (f.isDir) icon.className = "fas fa-folder";
    else if (f.type === "audio") icon.className = "fas fa-compact-disc";
    else if (f.type === "image") icon.className = "fas fa-image";
    else icon.className = "fas fa-file";

    const name = document.createElement("div");
    name.className = "file-name";
    name.innerText = f.isDir
      ? f.path.split("/").pop()
      : f.name;

    div.appendChild(icon);
    div.appendChild(name);

    div.onclick = () => toggleSelect(div, f);
    div.ondblclick = () => {
      if (f.isDir) loadDir(f.path);
    };

    list.appendChild(div);
  });
}

function showError(message) {
  const bar = document.getElementById("error-bar");
  if (!bar) return;

  bar.textContent = message;
  bar.classList.remove("hidden");

  if (errorTimeout) {
    clearTimeout(errorTimeout);
  }

  errorTimeout = setTimeout(() => {
    bar.classList.add("hidden");
  }, 10000);
}

/* ---------- SELECTION / TOOLBAR ---------- */
function toggleSelect(el, file) {
  const idx = selectedItems.indexOf(file);

  if (idx >= 0) {
    selectedItems.splice(idx, 1);
    el.classList.remove("selected");
  } else {
    selectedItems.push(file);
    el.classList.add("selected");
  }

  updateToolbar();
}

function updateToolbar() {
  const bar = document.getElementById("toolbar");
  bar.innerHTML = "";

  const parentPath = getParentPath(currentPath);
  const selectionCount = selectedItems.length;

  // ---- Navigation ----
  bar.appendChild(
    toolbarButton(
      "Up",
      "fas fa-arrow-left",
      () => loadDir(parentPath),
      !parentPath
    )
  );

  // ---- Primary actions ----
  if (selectionCount === 0) {
    bar.appendChild(
      toolbarButton("Upload", "fas fa-upload", uploadFiles)
    );
  } else {
    bar.appendChild(toolbarButton("Move", "fas fa-arrows-alt"));
    bar.appendChild(toolbarButton("Copy", "fas fa-copy"));
  }

  // ---- Context actions ----
  if (selectionCount <= 1) {
    bar.appendChild(
      toolbarButton(
        "Properties",
        "fas fa-circle-info",
        showPropertiesModal
      )
    );
  }

  if (selectionCount > 0) {
    bar.appendChild(
      toolbarButton(
        "Download",
        "fas fa-download",
        downloadSelected
      )
    );

    bar.appendChild(
      toolbarButton(
        "Delete",
        "fas fa-trash",
        deleteSelected
      )
    );
  }

  if (selectionCount === 1) {
    bar.appendChild(
      toolbarButton(
        "Rename",
        "fas fa-i-cursor",
        renameSelected
      )
    );
  }
}

function toolbarButton(label, iconClass, onClick, disabled = false) {
  const btn = document.createElement("button");

  if (iconClass) {
    const icon = document.createElement("i");
    icon.className = iconClass;
    btn.appendChild(icon);
  }

  const span = document.createElement("span");
  span.innerText = label;
  btn.appendChild(span);

  if (onClick) btn.onclick = onClick;
  if (disabled) btn.disabled = true;

  return btn;
}

async function deleteSelected() {
  if (!selectedItems.length) return;

  if (!confirm(`Delete ${selectedItems.length} item(s)?`)) return;

  const paths = selectedItems.map(i => i.path);

  const res = await fetch("/api/dir/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths })
  });

  const data = await res.json();

  if (!res.ok) {
    showError(data.error || "Delete failed");
    return;
  }

  loadDir(currentPath);
}

async function renameSelected() {
  const item = selectedItems[0];
  const newName = prompt("New name:", item.name || item.path.split("/").pop());

  if (!newName) return;

  const res = await fetch("/api/file/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: item.path,
      newName
    })
  });

  const data = await res.json();

  if (!res.ok) {
    showError(data.error || "Rename failed");
    return;
  }

  loadDir(currentPath);
}

/* Properties Modal */
function showPropertiesModal() {
  let target = null;

  if (selectedItems.length === 1) {
    target = selectedItems[0];
  } else if (selectedItems.length === 0 && selectedDir) {
    target = selectedDir;
  }

  if (!target) return;

  const body = document.getElementById("propertiesBody");

  let html = `
    <div><strong>Path:</strong> ${target.path}</div>
    <div><strong>Type:</strong> ${target.isDir ? "Directory" : "File"}</div>
    <div><strong>Directory:</strong> ${target.directory}</div>
  `;

  if (target.isDir) {
    html += `
      <div><strong>Items:</strong> ${target.itemsCount}</div>
    `;
  }

  if (target.isFile) {
    html += `
      <div><strong>Name:</strong> ${target.name}</div>
      <div><strong>Extension:</strong> ${target.extension}</div>
      <div><strong>Size:</strong> ${formatSize(target.size)}</div>
      <div><strong>File Type:</strong> ${target.type}</div>
    `;
  }

  body.innerHTML = html;

  document
    .getElementById("propertiesModal")
    .classList.remove("hidden");
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;

  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }

  return bytes.toFixed(2) + " " + units[i];
}


function closePropertiesModal() {
  document
    .getElementById("propertiesModal")
    .classList.add("hidden");
}

/* ---------- INIT ---------- */
checkLogin();
