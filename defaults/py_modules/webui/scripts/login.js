import { withLoading, showFileView, showError, showSuccess, 
         setSelectedItems, setClipboardItems, setClipboardMode, setCurrentPath,
         selectedItems, clipboardItems, clipboardMode, currentPath } from './app.js';

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const sidePanel = document.getElementById("sidePanel");
  const mainContent = document.getElementById("mainContent");

  hamburger.addEventListener("click", () => {
    sidePanel.classList.toggle("visible");
    mainContent.classList.toggle("shifted");
  });
  passwordEnterEvent();
  checkLogin();
});

/* ---------- AUTH ---------- */
export async function checkLogin() {
  return withLoading(async () => {
    const res = await fetch("/api/login/is-logged");

    if (res.ok) {
      document.getElementById("side-panel-content").style.display = "block";
      showFileView();
    } else {
      document.getElementById("side-panel-content").style.display = "none";
    }
  });
}


export async function doLogin() {
  return withLoading(async () => {
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;

    const res = await fetch("api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if(!res.ok) {
      try {
        const data = await res.json();
        if(data && data.error) {
          showError(data.error)
        } else {
          showError("Check your credentials and try again.");
        }
      } catch(jsonError) {
        showError("Check your credentials and try again.");
      }
    }
    checkLogin();
  });
}

export async function doLogoff() {
  const res = await fetch("/api/logoff", { method: "GET" });

  if (!res.ok) {
    showError("Failed to log off");
    return;
  }

  // Clear UI state
  setSelectedItems([]);
  setClipboardItems([]);
  setClipboardMode(null);
  setCurrentPath(null);

  // Hide file view, show login, logoff
  document.getElementById("fileView").style.display = "none";
  document.getElementById("loginView").style.display = "flex";
  document.getElementById("side-panel-content").style.display = "none";

  // Hide hamburger menu
  const hamburger = document.querySelector(".hamburger");
  hamburger.click();
}

async function passwordEnterEvent() {
  const passwordInput = document.getElementById('password');

  passwordInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      doLogin();
    }
  });
}