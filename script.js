/* =========================================================
   NEXSTON CITY ROLEPLAY — live server status
   Primary source: SAMonitor (sam.markski.ar) — does a DIRECT
   live query to your server every time, no masterlist/announce
   setting required. Also gives real player names.
   Fallback source: api.open.mp/servers (masterlist based).
   ========================================================= */

const SERVER_IP   = "51.79.254.10";
const SERVER_PORT = "7774";
const SERVER_KEY  = `${SERVER_IP}:${SERVER_PORT}`;
const POLL_MS     = 20000; // 20s

const SAMONITOR_INFO    = `https://sam.markski.ar/api/GetServerByIP?ip_addr=${SERVER_KEY}`;
const SAMONITOR_PLAYERS = `https://sam.markski.ar/api/GetServerPlayers?ip_addr=${SERVER_KEY}`;
const OPENMP_LIST       = "https://api.open.mp/servers";

const els = {
  headerPill: document.getElementById("header-pill"),
  headerPillText: document.getElementById("header-pill-text"),
  statStatus: document.getElementById("stat-status"),
  statPlayers: document.getElementById("stat-players"),
  statGamemode: document.getElementById("stat-gamemode"),
  statHostname: document.getElementById("stat-hostname"),
  lastChecked: document.getElementById("last-checked"),
  copyBtn: document.getElementById("copy-btn"),
  year: document.getElementById("year"),
  rosterList: document.getElementById("roster-list"),
  rosterCount: document.getElementById("roster-count"),
};

function setOnline({ pc, pm, gm, hn }) {
  els.headerPill.classList.remove("is-offline");
  els.headerPill.classList.add("is-online");
  els.headerPillText.textContent = `LIVE · ${pc}/${pm}`;

  els.statStatus.classList.remove("offline");
  els.statStatus.classList.add("online");
  els.statStatus.innerHTML = `<span class="dot" id="status-dot"></span> ONLINE`;

  els.statPlayers.textContent = `${pc} / ${pm}`;
  els.statGamemode.textContent = gm || "—";
  els.statHostname.textContent = hn || "NEXSTON CITY ROLEPLAY";
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

  els.rosterCount.textContent = "—";
  els.rosterList.innerHTML = `<li class="roster-empty">Server offline — no one connected</li>`;
}

function renderRoster(players) {
  if (!players || players.length === 0) {
    els.rosterCount.textContent = "0 online";
    els.rosterList.innerHTML = `<li class="roster-empty">City is quiet right now — be the first in</li>`;
    return;
  }
  els.rosterCount.textContent = `${players.length} online`;
  els.rosterList.innerHTML = players
    .map(
      (p) =>
        `<li><span class="p-name">${escapeHtml(p.name)}</span><span class="p-score">score ${p.score}</span></li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---- Primary: SAMonitor direct live query ---- */
async function trySAMonitor() {
  const res = await fetch(SAMONITOR_INFO, { cache: "no-store" });
  if (!res.ok) throw new Error("samonitor bad response");
  const data = await res.json();
  if (!data.success) throw new Error("samonitor: server not reachable");

  setOnline({
    pc: data.playersOnline,
    pm: data.maxPlayers,
    gm: data.gameMode,
    hn: data.name,
  });

  try {
    const pRes = await fetch(SAMONITOR_PLAYERS, { cache: "no-store" });
    const players = pRes.ok ? await pRes.json() : [];
    renderRoster(players);
  } catch {
    els.rosterCount.textContent = "—";
    els.rosterList.innerHTML = `<li class="roster-empty">Player list temporarily unavailable</li>`;
  }
  return true;
}

/* ---- Fallback: open.mp masterlist ---- */
async function tryOpenMp() {
  const res = await fetch(OPENMP_LIST, { cache: "no-store" });
  if (!res.ok) throw new Error("open.mp bad response");
  const servers = await res.json();
  const match = servers.find((s) => s.ip === SERVER_KEY);
  if (!match) throw new Error("open.mp: server not in masterlist");

  setOnline({ pc: match.pc, pm: match.pm, gm: match.gm, hn: match.hn });
  els.rosterCount.textContent = "—";
  els.rosterList.innerHTML = `<li class="roster-empty">Player names unavailable from this source</li>`;
  return true;
}

async function refreshStatus() {
  els.headerPillText.textContent = "Checking...";
  try {
    await trySAMonitor();
  } catch (err1) {
    console.warn("SAMonitor check failed, trying open.mp:", err1.message);
    try {
      await tryOpenMp();
    } catch (err2) {
      console.warn("open.mp check failed too:", err2.message);
      setOffline();
    }
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
