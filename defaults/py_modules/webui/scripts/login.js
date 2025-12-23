/* ---------- AUTH ---------- */
async function checkLogin() {
  return withLoading(async () => {
    const res = await fetch("/api/login/is-logged");

    if (res.ok) {
      document.getElementById("logoffBtn").style.display = "block";
      showFileView();
    } else {
      document.getElementById("logoffBtn").style.display = "none";
      document.getElementById("loginView").style.display = "flex";
    }
  });
}


async function doLogin() {
  return withLoading(async () => {
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;

    const res = await fetch("api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });

    if(!res.ok) {
      showError("Check your credentials and try again.");
    }
    checkLogin();
  });
}

async function doLogoff() {
  const res = await fetch("/api/logoff", { method: "GET" });

  if (!res.ok) {
    showError("Failed to log off");
    return;
  }

  // Clear UI state
  selectedItems = [];
  clipboardItems = [];
  clipboardMode = null;
  currentPath = null;

  // Hide file view, show login, logoff
  document.getElementById("fileView").style.display = "none";
  document.getElementById("loginView").style.display = "flex";
  document.getElementById("logoffBtn").style.display = "none";

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