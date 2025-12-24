import { hideSidePanel, toolbarButton, withLoading, showSuccess, showError, selectedItems, setSelectedItems } from './app.js';

export async function scanRecordings() {
  return withLoading(async () => {
    hideSidePanel();
    setSelectedItems([]);

    const res = await fetch("/api/steam/clips", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    document.getElementById("breadcrumb").innerText = "/steam/clips";

    updateGameRecordingToolbar();
    renderGameRecordingFiles(data.clips);
  });
}

function updateGameRecordingToolbar() {
  const bar = document.getElementById("toolbar");
  bar.innerHTML = "";

  const selectionCount = selectedItems.length;

  // ---- Navigation ----
  bar.appendChild(
    toolbarButton(
      "Refresh",
      "fas fa-rotate-right",
      () => scanRecordings()
    )
  );

  // ---- Primary actions ----
    if (selectionCount == 1) {
    bar.appendChild(
      toolbarButton(
        "Assemble",
        "fas fa-cogs",
        assembleVideo
      )
    )};
}

async function assembleVideo() {
  return withLoading(async () => {
    const item = selectedItems[0];

    const res = await fetch("/api/steam/clips/assemble", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mpd: item.mpd
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Assemble failed");
      return;
    }
    showSuccess("The video has been assembled. You can find it in the 'Videos' folder.")
  });
}

function renderGameRecordingFiles(files) {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    
    files.forEach((f) => {
        const div = document.createElement("div");
        div.className = "file-item";

        const icon = document.createElement("img");
        icon.className = "clip-thumbnail";
        icon.src = `/api/steam/clips/thumbnail/${encodeURIComponent(f.clipId)}`;
        icon.alt = "Thumbnail";

        icon.onerror = () => {
            icon.src = "";
            icon.className = "fas fa-image"
        };

        const name = document.createElement("div");

        // For non linux path
        if(f.path?.includes("\\\\")) {
            name.className = "file-name";
            name.innerText = f.clipId
        } else {
            name.className = "file-name";
            name.innerText = f.clipId
        }

        div.appendChild(icon);
        div.appendChild(name);

        div.onclick = () => toggleGameRecordingSelect(div, f);

        div.ondblclick = () => {
            openGameRecordingPreview(f);
        };

        list.appendChild(div);
    });
}

function toggleGameRecordingSelect(el, file) {
  if (selectedItems.length === 1 && selectedItems[0] === file) {
    setSelectedItems([]);
    el.classList.remove("selected");
    updateGameRecordingToolbar();
    return;
  }

  document.querySelectorAll(".selected")
          .forEach(e => e.classList.remove("selected"));

  setSelectedItems([file]);
  el.classList.add("selected");

  updateGameRecordingToolbar();
}

function openGameRecordingPreview(file) {
    const body = document.getElementById("previewBody");
    body.innerHTML = "";

    const url = `/api/steam/clips/thumbnail/${encodeURIComponent(file.clipId)}`;

    const img = document.createElement("img");
    img.src = url;
    body.appendChild(img);

    document.getElementById("previewModal").classList.remove("hidden");
    hideSidePanel();
}