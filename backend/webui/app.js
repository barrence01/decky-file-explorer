let currentPath = "/";

async function loadDirectory(path) {
  const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
  const data = await res.json();

  currentPath = data.path;
  document.getElementById("path").textContent = currentPath;

  const list = document.getElementById("file-list");
  list.innerHTML = "";

  for (const item of data.items) {
    const li = document.createElement("li");

    li.textContent = item.name;

    if (item.isDir) {
      li.onclick = () => loadDirectory(item.path);
    } else {
      const btn = document.createElement("button");
      btn.textContent = "⬇";
      btn.onclick = (e) => {
        e.stopPropagation();
        window.location = `/api/download?path=${encodeURIComponent(item.path)}`;
      };
      li.appendChild(btn);
    }

    list.appendChild(li);
  }
}

function goUp() {
  if (currentPath === "/") return;
  const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
  loadDirectory(parent);
}

loadDirectory("/");
