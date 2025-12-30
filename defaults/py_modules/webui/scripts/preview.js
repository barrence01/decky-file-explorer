import { hideSidePanel, selectedItems} from './app.js';
import { downloadSelected } from './upload.js';

window['closePreview'] = closePreview;
window['downloadPreviewFile'] = downloadPreviewFile;

let currentPreviewFile = null;
let previewMedia = null;

/* ---------- INTERNAL HELPERS ---------- */

function getPreviewElements() {
  return {
    modal: document.getElementById("previewModal"),
    body: document.getElementById("previewBody"),
    title: document.getElementById("previewFilename"),
  };
}

function openModal() {
  const { modal, body, title } = getPreviewElements();
  modal.classList.remove("hidden");
  hideSidePanel();
  document.addEventListener("keydown", previewKeyHandler);
}

function clearPreview() {
  const { modal, body, title } = getPreviewElements();

  if (previewMedia?.tagName === "VIDEO") {
    previewMedia.pause();
    previewMedia.src = "";
  }

  body.innerHTML = "";
  previewMedia = null;
}

/* ---------- PUBLIC API ---------- */

export function openPreview(file) {
  currentPreviewFile = file;

  const { modal, body, title } = getPreviewElements();
  clearPreview();

  title.textContent = file.name || file.path.split("/").pop();
  body.innerHTML = "";
  
  const url = `/api/file/view?path=${encodeURIComponent(file.path)}`;

  if (file.type === "image") {
    previewMedia = document.createElement("img");
  } else if (file.type === "video") {
    previewMedia = document.createElement("video");
    previewMedia.controls = true;
    previewMedia.autoplay = true;
    previewMedia.playsInline = true;
  } else {
    return;
  }

  previewMedia.src = url;
  previewMedia.className = "preview-media-item";

  body.appendChild(previewMedia);
  openModal();
}

export function openGameRecordingPreview(file) {
  currentPreviewFile = null; // preview-only

  const { modal, body, title } = getPreviewElements();
  clearPreview();

  title.textContent =
    file.name ||
    file.title ||
    `Steam Clip ${file.clipId}`;

  previewMedia = document.createElement("img");
  previewMedia.src = `/api/steam/clips/thumbnail/${encodeURIComponent(file.clipId)}`;
  previewMedia.alt = title.textContent;
  previewMedia.className = "preview-media-item";

  body.appendChild(previewMedia);
  openModal();
}

export function closePreview() {
  const { modal, body, title } = getPreviewElements();

  clearPreview();
  modal.classList.add("hidden");

  document.removeEventListener("keydown", previewKeyHandler);

  currentPreviewFile = null;
  previewMedia = null;
}

export function previewKeyHandler(e) {
  if (e.key === "Escape") {
    closePreview();
  }
}

export function downloadPreviewFile() {
  if (!currentPreviewFile) return;

  const prevSelection = [...selectedItems];

  selectedItems.length = 0;
  selectedItems.push(currentPreviewFile);

  downloadSelected();

  selectedItems.length = 0;
  selectedItems.push(...prevSelection);
}
