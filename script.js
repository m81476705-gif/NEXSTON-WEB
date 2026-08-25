/* =========================================================
   NEXSTON CITY ROLEPLAY — live server status
   Data source: https://api.open.mp/servers (public, no key needed)
   This endpoint only lists servers that are broadcasting to the
   open.mp / SA-MP masterlist (server.cfg -> announce 1). If your
   server isn't appearing, see the README for the fix.
   ========================================================= */

const SERVER_IP   = "51.79.254.10";
const SERVER_PORT = "7774";
const SERVER_KEY  = `${SERVER_IP}:${SERVER_PORT}`;
const API_URL     = "https://api.open.mp/servers";
const POLL_MS     = 30000; // 30s

const els = {
  headerPill: document.getElementById("header-pill"),
  headerDot: document.getElementById("header-dot"),
  headerPillText: document.getElementById("header-pill-text"),
  statStatus: document.getElementById("stat-status"),
  statusDot: document.getElementById("status-dot"),
  statPlayers: document.getElementById("stat-players"),
  statGamemode: document.getElementById("stat-gamemode"),
  statHostname: document.getElementById("stat-hostname"),
  lastChecked: document.getElementById("last-checked"),
  copyBtn: document.getElementById("copy-btn"),
  ipCode: document.getElementById("ip-code"),
  year: document.getElementById("year"),
};

function setOnline(server) {
  els.headerPill.classList.remove("is-offline");
  els.headerPill.classList.add("is-online");
  els.headerPillText.textContent = `LIVE · ${server.pc}/${server.pm}`;

  els.statStatus.classList.remove("offline");
  els.statStatus.classList.add("online");
  els.statStatus.innerHTML = `<span class="dot" id="status-dot"></span> ONLINE`;

  els.statPlayers.textContent = `${server.pc} / ${server.pm}`;
  els.statGamemode.textContent = server.gm || "—";
  els.statHostname.textContent = server.hn || "NEXSTON CITY ROLEPLAY";
}

function setOffline() {
  els.headerPill.classList.remove("is-online");
  els.headerPill.classList.add("is-offline");
  els.headerPillText.textContent = "OFFLINE";

  els.statStatus.classList.remove("online");
  els.statStatus.classList.add("offline");
  els.statStatus.innerHTML = `<span class="dot" id="status-dot"></span> OFFLINE`;

  els.statPlayers.textContent = "0 / 0";
  els.statGamemode.textContent = "—";
  els.statHostname.textContent = "Server not reachable right now";
}

function setChecking() {
  els.headerPillText.textContent = "Checking...";
}

async function refreshStatus() {
  setChecking();
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("bad response");
    const servers = await res.json();
    const match = servers.find(s => s.ip === SERVER_KEY);
    if (match) {
      setOnline(match);
    } else {
      setOffline();
    }
  } catch (err) {
    console.error("Status check failed:", err);
    setOffline();
  } finally {
    const now = new Date();
    els.lastChecked.textContent = `updated ${now.toLocaleTimeString()}`;
  }
}

refreshStatus();
setInterval(refreshStatus, POLL_MS);

/* ---- copy IP button ---- */
els.copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(SERVER_KEY);
    els.copyBtn.textContent = "Copied!";
    setTimeout(() => (els.copyBtn.textContent = "Copy"), 1500);
  } catch {
    els.copyBtn.textContent = "Copy failed";
  }
});

/* ---- footer year ---- */
els.year.textContent = new Date().getFullYear();

/* ---- ambient skyline window flicker ---- */
(function buildWindows() {
  const container = document.getElementById("windows");
  const count = window.innerWidth < 640 ? 60 : 140;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const w = document.createElement("span");
    w.className = "window";
    w.style.left = Math.random() * 100 + "%";
    w.style.bottom = 20 + Math.random() * 220 + "px";
    w.style.animationDelay = Math.random() * 5 + "s";
    w.style.animationDuration = 3 + Math.random() * 5 + "s";
    frag.appendChild(w);
  }
  container.appendChild(frag);
})();
