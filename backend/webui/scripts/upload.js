/* ---------- UPLOAD ---------- */

async function uploadFiles() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;

  input.onchange = async () => {
    if (!input.files.length) return;

    showUploadModal();

    for (const file of input.files) {
      try {
        await uploadSingleFile(file);
      } catch (err) {
        showError(`Upload failed for "${file.name}": ${err}`);
        break;
      }
    }

    hideUploadModal();
    loadDir(currentPath);
  };

  input.click();
}

function uploadSingleFile(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();

    form.append("path", currentPath);
    form.append("file", file);

    xhr.open("POST", "/api/dir/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        updateUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      let response = null;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        updateUploadProgress(100);
        resolve();
      } else {
        reject(
          response?.error ||
          response?.message ||
          xhr.statusText ||
          "Upload failed"
        );
      }
    };

    xhr.onerror = () => reject("Network error");

    xhr.send(form);
  });
}

function showUploadModal() {
  updateUploadProgress(0);
  document.getElementById("uploadModal").classList.remove("hidden");
}

function hideUploadModal() {
  document.getElementById("uploadModal").classList.add("hidden");
}

function updateUploadProgress(percent) {
  document.getElementById("uploadProgress").style.width = percent + "%";
  document.getElementById("uploadStatus").innerText = percent + "%";
}

/* ---------- DOWNLOAD ---------- */

async function downloadSelected() {
  if (!selectedItems.length) return;

  const paths = selectedItems.map(i => i.path);

  const res = await fetch("/api/dir/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths })
  });

  if (!res.ok) {
    const err = await res.json();
    showError(err.error || "Download failed");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  // Name handling
  if (paths.length === 1) {
    a.download = paths[0].split("/").pop();
  } else {
    a.download = "download.zip";
  }

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
