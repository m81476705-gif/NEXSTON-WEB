// NEXSTON CITY ROLEPLAY â€” Admin Panel logic
// NOTE: This is a static, client-side-only site (GitHub Pages has no server/database).
// The access code below is checked in the browser, which means anyone who reads
// this file can find it. It is fine for a friendly staff gate, but do not rely on
// it to protect anything truly sensitive.

const ACCESS_CODE = "SOMD456";
const CONFIG_URL = "data/config.json";

let CONFIG = null;

// ---------- LOGIN ----------
const loginScreen = document.getElementById("login-screen");
const dashScreen = document.getElementById("dash-screen");
const pwInput = document.getElementById("pw");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

function showDashboard() {
  loginScreen.style.display = "none";
  dashScreen.classList.add("active");
  loadConfig();
}

function tryLogin() {
  if (pwInput.value === ACCESS_CODE) {
    sessionStorage.setItem("nexston_admin", "1");
    loginError.style.display = "none";
    showDashboard();
  } else {
    loginError.style.display = "block";
  }
}

loginBtn.addEventListener("click", tryLogin);
pwInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

if (sessionStorage.getItem("nexston_admin") === "1") {
  showDashboard();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem("nexston_admin");
  location.reload();
});

// ---------- TABS ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ---------- LOAD CONFIG ----------
async function loadConfig() {
  try {
    const res = await fetch(CONFIG_URL + "?t=" + Date.now());
    CONFIG = await res.json();
  } catch (e) {
    CONFIG = {
      serverName: "NEXSTON CITY ROLEPLAY",
      serverIp: "51.79.254.10:7774",
      serverOnline: true,
      playersOnline: 0,
      maxPlayers: 150,
      launchCountdownISO: "2050-01-01T00:00:00Z",
      whitelist: []
    };
  }
  populateForm();
}

function populateForm() {
  document.getElementById("status-toggle").checked = !!CONFIG.serverOnline;
  updateStatusLabel();
  document.getElementById("players-online").value = CONFIG.playersOnline ?? 0;
  document.getElementById("max-players").value = CONFIG.maxPlayers ?? 150;

  document.getElementById("cfg-name").value = CONFIG.serverName || "";
  document.getElementById("cfg-ip").value = CONFIG.serverIp || "";
  if (CONFIG.launchCountdownISO) {
    const d = new Date(CONFIG.launchCountdownISO);
    document.getElementById("cfg-launch").value = d.toISOString().slice(0, 16);
  }

  renderWhitelist();
}

function updateStatusLabel() {
  const checked = document.getElementById("status-toggle").checked;
  document.getElementById("status-label").textContent = checked ? "ONLINE ðŸŸ¢" : "OFFLINE ðŸ”´";
}
document.getElementById("status-toggle").addEventListener("change", updateStatusLabel);

// ---------- WHITELIST ----------
function renderWhitelist() {
  const body = document.getElementById("wl-body");
  const list = CONFIG.whitelist || [];
  document.getElementById("wl-count").textContent = list.length;
  body.innerHTML = "";
  list.forEach((name, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(name)}</td><td><span class="remove-x" data-i="${i}">âœ•</span></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll(".remove-x").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.i, 10);
      CONFIG.whitelist.splice(idx, 1);
      renderWhitelist();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("wl-add-btn").addEventListener("click", () => {
  const input = document.getElementById("wl-name");
  const name = input.value.trim();
  if (!name) return;
  if (!CONFIG.whitelist) CONFIG.whitelist = [];
  CONFIG.whitelist.push(name);
  input.value = "";
  renderWhitelist();
});

// ---------- SAVE / EXPORT ----------
function collectFormIntoConfig() {
  CONFIG.serverOnline = document.getElementById("status-toggle").checked;
  CONFIG.playersOnline = parseInt(document.getElementById("players-online").value, 10) || 0;
  CONFIG.maxPlayers = parseInt(document.getElementById("max-players").value, 10) || 1;
  CONFIG.serverName = document.getElementById("cfg-name").value.trim();
  CONFIG.serverIp = document.getElementById("cfg-ip").value.trim();
  const launchVal = document.getElementById("cfg-launch").value;
  if (launchVal) CONFIG.launchCountdownISO = new Date(launchVal).toISOString();
  CONFIG.lastUpdated = new Date().toISOString();
}

function exportConfig() {
  collectFormIntoConfig();
  const blob = new Blob([JSON.stringify(CONFIG, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "config.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Exported config.json âœ… â€” upload it to /data/ on GitHub to go live");
}

document.getElementById("save-status-btn").addEventListener("click", exportConfig);
document.getElementById("save-wl-btn").addEventListener("click", exportConfig);
document.getElementById("save-config-btn").addEventListener("click", exportConfig);

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
  }
      
