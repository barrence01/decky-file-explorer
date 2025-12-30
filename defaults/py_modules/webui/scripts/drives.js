import { showError, currentPath, loadDir } from "./app.js";

export function showDrivePicker(drives) {
  const old = document.getElementById("drivePicker");
  if (old) {
    old.remove();
  }

  const picker = document.createElement("div");
  picker.id = "drivePicker";
  picker.className = "drive-picker";

  drives.forEach(d => {
    if(d.path == "/") {
      return;
    }
    console.log(d)
    const item = document.createElement("div");
    item.className = "drive-item";
    item.textContent = `${d.path} ${d.removable ? "(USB)" : ""}`;

    item.onclick = (e) => {
        e.stopPropagation();
        document.getElementById("drivePicker").remove();
        updateDriveIndicator(d.path)
        loadDir(d.path); 
    };

    picker.appendChild(item);
  });

  document.getElementById("driveIndicator").appendChild(picker);
}

export async function updateDriveIndicator(path) {
  try {
    const res = await fetch("/api/drives/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: path
      })
    });

    const data = await res.json();

    document.getElementById("currentDrive").innerText =
      data.currentDrive || "Unknown";

  } catch (err) {
    showError("Failed to load drive info")
    console.error("Failed to load drive info", err);
  }
}