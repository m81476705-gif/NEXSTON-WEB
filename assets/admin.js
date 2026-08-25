// NEXSTON CITY ROLEPLAY — front-end logic
// Reads /data/config.json (edited via the Admin Panel) to render live status.

const CONFIG_URL = "data/config.json";
const LS_KEY = "nexston_live_config"; // written instantly by admin.js on this same browser
let CONFIG = null;

async function loadConfig() {
  let fileConfig = null;
  let localConfig = null;

  try {
    const res = await fetch(CONFIG_URL + "?t=" + Date.now());
    fileConfig = await res.json();
  } catch (e) {
    // config.json couldn't be fetched (e.g. opened as a local file:// page)
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) localConfig = JSON.parse(raw);
  } catch (e) {
    // ignore bad/missing local override
  }

  // Whichever was updated most recently wins. This means: on the admin's own
  // browser, flipping the toggle shows up here instantly (no re-upload needed
  // to preview). On every other visitor's browser there is no local override,
  // so they always see whatever is published in data/config.json.
  if (fileConfig && localConfig) {
    CONFIG = new Date(localConfig.lastUpdated || 0) > new Date(fileConfig.lastUpdated || 0)
      ? localConfig
      : fileConfig;
  } else {
    CONFIG = fileConfig || localConfig || {
      serverName: "NEXSTON CITY ROLEPLAY",
      serverIp: "51.79.254.10:7774",
      serverOnline: false,
      playersOnline: 0,
      maxPlayers: 150,
      launchCountdownISO: "2050-01-01T00:00:00Z"
    };
  }

  renderStatus();
}

// keep this tab in sync if the admin panel is open in another tab of the same browser
window.addEventListener("storage", (e) => {
  if (e.key === LS_KEY) loadConfig();
});

function renderStatus() {
  const nameEl = document.getElementById("t-name");
  const statusEl = document.getElementById("t-status");
  const ipEl = document.getElementById("t-ip");
  const playersEl = document.getElementById("t-players");
  const ipText = document.getElementById("ip-text");
  const footIp = document.getElementById("foot-ip");

  if (nameEl) nameEl.textContent = CONFIG.serverName;
  if (ipEl) ipEl.textContent = CONFIG.serverIp;
  if (ipText) ipText.textContent = CONFIG.serverIp;
  if (footIp) footIp.textContent = CONFIG.serverIp;
  if (playersEl) playersEl.textContent = `${CONFIG.playersOnline} / ${CONFIG.maxPlayers}`;

  if (statusEl) {
    if (CONFIG.serverOnline) {
      statusEl.className = "status-pill mono on";
      statusEl.innerHTML = `<span class="sdot"></span> ONLINE`;
    } else {
      statusEl.className = "status-pill mono off";
      statusEl.innerHTML = `<span class="sdot"></span> OFFLINE`;
    }
  }
}

// live Sri Lanka clock in the terminal
function tickClock() {
  const el = document.getElementById("t-clock");
  if (!el) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).format(now);
  el.textContent = fmt + " LK";
}
setInterval(tickClock, 1000);
tickClock();

// countdown to launchCountdownISO
function tickCountdown() {
  if (!CONFIG || !CONFIG.launchCountdownISO) return;
  const target = new Date(CONFIG.launchCountdownISO).getTime();
  const now = Date.now();
  let diff = Math.max(0, target - now);

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const pad = (n) => String(n).padStart(2, "0");
  const dEl = document.getElementById("cd-days");
  const hEl = document.getElementById("cd-hours");
  const mEl = document.getElementById("cd-mins");
  const sEl = document.getElementById("cd-secs");
  if (dEl) dEl.textContent = pad(d);
  if (hEl) hEl.textContent = pad(h);
  if (mEl) mEl.textContent = pad(m);
  if (sEl) sEl.textContent = pad(s);
}
setInterval(tickCountdown, 1000);

// copy IP button
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(CONFIG ? CONFIG.serverIp : "51.79.254.10:7774");
        showToast("IP copied ✅");
      } catch (e) {
        showToast("Copy failed — select manually");
      }
    });
  }
});

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

loadConfig();
  
