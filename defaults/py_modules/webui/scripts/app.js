import { scanRecorgings } from "./gamerecording.js";
import { downloadSelected, uploadFiles } from './upload.js';
import { addMobileRenderInteractions, addMobileToolbarButtons } from "./mobile.js";
import { checkLogin, doLogin, doLogoff } from "./login.js";

/* ---------- Exposing functions to DOM ---------- */
window.doLogin = doLogin;
window.closePreview = closePreview;
window.doLogoff = doLogoff;
window.loadDir = loadDir;
window.closePropertiesModal = closePropertiesModal;
window.scanRecorgings = scanRecorgings;

export let currentPath = null;
export let selectedItems = [];
export let selectedDir = null;
export let errorTimeout = null;
export let successTimeout = null;
export let clipboardItems = [];
export let clipboardMode = null; // "copy" | "move"
export let showHidden = false;

export const HIGHLIGHT_FOLDERS = [
  "Downloads",
  "Pictures",
  "Videos",
  "Music",
  "Desktop",
  "Documents",
  "Homebrew",
  "Emudeck",
  "Plugins",
  "Emulation",
  "Applications",
  "Logs",
  "Data",
  "Settings"
].map(n => n.toLowerCase());

export function showLoading() {
  document.body.classList.add("loading");
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

export function hideLoading() {
  document.body.classList.remove("loading");
  document.getElementById("loadingOverlay").classList.add("hidden");
}

export function hideSidePanel() {
  sidePanel.classList.remove("visible");
  mainContent.classList.remove("shifted");
}

export async function withLoading(callback) {
  showLoading();
  try {
    return await callback();
  } finally {
    hideLoading();
  }
}

export function showError(message) {
  const bar = document.getElementById("error-bar");
  if (!bar) return;

  bar.textContent = message;
  bar.classList.remove("hidden");

  if (errorTimeout) {
    clearTimeout(errorTimeout);
  }

  errorTimeout = setTimeout(() => {
    bar.classList.add("hidden");
  }, 5000);
}

export function showSuccess(message) {
  const bar = document.getElementById("success-bar");
  if (!bar) return;

  bar.textContent = message;
  bar.classList.remove("hidden");

  if (successTimeout) {
    clearTimeout(successTimeout);
  }

  successTimeout = setTimeout(() => {
    bar.classList.add("hidden");
  }, 5000);
}

export function setSelectedItems(value) {
  selectedItems = value;
}

export function setClipboardItems(value) {
  clipboardItems = value;
}

export function setClipboardMode(value) {
  clipboardMode = value;
}

export function setCurrentPath(value) {
  currentPath = value;
}

// function isMobile() {
//   const ua = navigator.userAgent.toLowerCase();
//   return ['android', 'iphone', 'ipad', 'ipod', 'mobile'].some(x => ua.includes(x));
// }

function isMobile() {
  return window.matchMedia('(pointer: coarse)').matches;
}


/* ---------- FILE VIEW ---------- */

function getParentPath(path) {
  if (!path) return null;
  
  const parts = path.replaceAll("\\","/").replace(/\/+$/, "").split("/");

  if(path.includes(":")) {
    if (parts.length <= 2) return null;
  } else {
    if (parts.length <= 3) return null;
  }

  parts.pop();
  return parts.join("/") || "/";
}

export function showFileView() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("fileView").style.display = "block";
  loadDir();
}

export async function loadDir(path = null) {
  return withLoading(async () => {
    hideSidePanel();
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
  });
}

function renderFiles(files) {
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  files.filter(f => showHidden || !f.isHidden).forEach((f) => {
    const div = document.createElement("div");
    
    div.className = "file-item";

    if (shouldHighlightFolder(f)) {
      div.classList.add("highlight-folder");
      div.title = "Important folder";
    }

    if (f.isHidden) {
      div.classList.add("hidden-file");
    }

    if (f.isProtected) {
      div.classList.add("protected-file");
    }

    const icon = document.createElement("i");

    if (f.isDir) icon.className = "fas fa-folder";
    else if (f.type === "audio") icon.className = "fas fa-compact-disc";
    else if (f.type === "image") icon.className = "fas fa-image";
    else icon.className = "fas fa-file";

    const name = document.createElement("div");

    // For non linux path
    if(f.path?.includes("\\\\")) {
      name.className = "file-name";
      name.innerText = f.isDir ? f.path.split("\\").pop() : f.name;
    } else {
      name.className = "file-name";
      name.innerText = f.isDir ? f.path.split("/").pop() : f.name;
    }


    div.appendChild(icon);
    div.appendChild(name);

    if (isMobile()) {
      addMobileRenderInteractions(div, f);
    } else {
      addDesktopRenderInteractions(div, f);
    }

    list.appendChild(div);
  });
}

function shouldHighlightFolder(file) {
  if (!file.isDir) return false;

  const name = file.path.split("/").pop().toLowerCase();
  return HIGHLIGHT_FOLDERS.includes(name);
  //return HIGHLIGHT_FOLDERS.some(n => name.includes(n));
  //const HIGHLIGHT_PATTERNS = [/^steam/i, /^game/i];
  //return HIGHLIGHT_PATTERNS.some(rx => rx.test(name));
}

function addDesktopRenderInteractions(div, f) {
  div.onclick = () => toggleSelect(div, f);

  div.ondblclick = () => {
    if (f.isDir) {
      loadDir(f.path);
    } else if (f.type === "image" || f.type === "video") {
      openPreview(f);
    }
  };
}


/* ---------- SELECTION / TOOLBAR ---------- */
export function toggleSelect(el, file) {
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
  bar.appendChild(toolbarButton("Up", "fas fa-arrow-left",() => loadDir(parentPath),!parentPath));

  bar.appendChild(toolbarButton("Refresh","fas fa-rotate-right",() => loadDir(currentPath)));

  // ---- COPY / MOVE ----
  if (clipboardItems.length > 0) {
    bar.appendChild(toolbarButton(`${clipboardItems.length} item(s)`, "fas fa-clipboard", null, true));
    bar.appendChild(toolbarButton("Paste", "fas fa-paste", () => pasteClipboard(false)));
    bar.appendChild(toolbarButton("Cancel", "fas fa-times", clearClipboard));

    return;
  }

  if(isMobile()) {
    addMobileToolbarButtons(bar, selectionCount);
  } else {
    addDesktopToolbarButtons(bar, selectionCount);
  }

  return;
}

function addDesktopToolbarButtons(bar, selectionCount) {
    // ---- Primary actions ----
  if (selectionCount === 0) {
    bar.appendChild(toolbarButton("Upload", "fas fa-upload", uploadFiles));
  } else {
    bar.appendChild(toolbarButton("Move", "fas fa-arrows-alt", startMove));
    bar.appendChild(toolbarButton("Copy", "fas fa-copy", startCopy));
  }

  // ---- Context actions ----
  if (selectionCount > 0) {
    bar.appendChild(toolbarButton("Download", "fas fa-download", downloadSelected));

    bar.appendChild(toolbarButton("Delete", "fas fa-trash", deleteSelected));
  }

  if (selectionCount === 1) {
    bar.appendChild(toolbarButton("Rename", "fas fa-i-cursor", renameSelected));
  }

  bar.appendChild(toolbarButton("New Folder", "fas fa-folder-plus", createNewFolder));

  if (selectionCount <= 1) {
    bar.appendChild(toolbarButton("Properties", "fas fa-circle-info", showPropertiesModal));
  }

  // ---- Show hidden toggle ----
  const hiddenToggle = document.createElement("label");
  hiddenToggle.style.display = "flex";
  hiddenToggle.style.alignItems = "center";
  hiddenToggle.style.gap = "6px";
  hiddenToggle.style.marginLeft = "auto";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = showHidden;

  checkbox.onchange = () => {
    showHidden = checkbox.checked;
    loadDir(currentPath);
  };

  const text = document.createElement("span");
  text.innerText = "Show hidden";

  hiddenToggle.appendChild(checkbox);
  hiddenToggle.appendChild(text);

  bar.appendChild(hiddenToggle);
}

export function toolbarButton(label, iconClass, onClick, disabled = false) {
  const btn = document.createElement("button");

  if (iconClass) {
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.style.paddingRight = "2px";
    btn.appendChild(icon);
  }
  btn.classList.add("btn-interactive")

  const span = document.createElement("span");
  span.innerText = label;
  btn.appendChild(span);

  if (onClick) btn.onclick = onClick;
  if (disabled) btn.disabled = true;

  return btn;
}

export async function deleteSelected() {
  if (!selectedItems.length) return;

  if (!confirm(`Delete ${selectedItems.length} item(s)?`)) return;

  return withLoading(async () => {
    const paths = selectedItems.map((i) => i.path);

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
  });
}

export async function renameSelected() {
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

/* ---------- PROPERTIES ---------- */
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

  document.getElementById("propertiesModal").classList.remove("hidden");
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

export function closePropertiesModal() {
  document.getElementById("propertiesModal").classList.add("hidden");
}

/* ---------- COPY / MOVE ACTIONS ---------- */
export function startCopy() {
  clipboardItems = [...selectedItems];
  clipboardMode = "copy";
  selectedItems = [];
  updateToolbar();
}

export function startMove() {
  clipboardItems = [...selectedItems];
  clipboardMode = "move";
  selectedItems = [];
  updateToolbar();
}

function clearClipboard() {
  clipboardItems = [];
  clipboardMode = null;
  updateToolbar();
}

async function pasteClipboard(overwrite = false) {
  if (!clipboardItems.length) return;

  const res = await fetch("/api/dir/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: clipboardMode,
      targetDir: currentPath,
      paths: clipboardItems.map(i => i.path),
      overwrite:overwrite
    })
  });

  const data = await res.json();

  if (res.status === 409 && data.files) {
    const list = data.files.join("\n");
    const confirmOverwrite = confirm(
      `The following files already exist:\n\n${list}\n\nOverwrite them?`
    );

    if (confirmOverwrite) {
      return pasteClipboard(true);
    }
    return;
  }

  if (!res.ok) {
    showError(data.error || "Paste failed");
    return;
  }

  clearClipboard();
  loadDir(currentPath);
}

/* ---------- NEW FOLDER ---------- */
export async function createNewFolder() {
  const folderName = prompt("Enter folder name:");
  if (!folderName) return;

  const targetPath = currentPath + "/" + folderName;

  const res = await fetch("/api/dir/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: targetPath })
  });

  const data = await res.json();

  if (!res.ok) {
    showError(data.error || "Failed to create folder");
    return;
  }

  loadDir(currentPath);
}

/* ---------- PREVIEW ---------- */
export function openPreview(file) {
  const body = document.getElementById("previewBody");
  body.innerHTML = "";

  const url = `/api/file/view?path=${encodeURIComponent(file.path)}`;

  if (file.type === "image") {
    const img = document.createElement("img");
    img.src = url;
    body.appendChild(img);
  }

  if (file.type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    body.appendChild(video);
  }

  document.getElementById("previewModal").classList.remove("hidden");
  hideSidePanel();
}

function closePreview() {
  document.getElementById("previewModal").classList.add("hidden");
  document.getElementById("previewBody").innerHTML = "";
}