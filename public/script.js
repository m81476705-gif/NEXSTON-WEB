/* =========================================================
   NEXSTON CITY ROLEPLAY — live server status
   Source: our own backend (server.js), which does a direct
   UDP query straight to the SA-MP server. No third-party
   status API involved, so nothing to go stale or block us.
   ========================================================= */

const SERVER_KEY = "51.79.254.10:7774";
const POLL_MS = 10000; // 10s, matches backend refresh interval

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

function setOffline(reason) {
  els.headerPill.classList.remove("is-online");
  els.headerPill.classList.add("is-offline");
  els.headerPillText.textContent = "OFFLINE";

  els.statStatus.classList.remove("online");
  els.statStatus.classList.add("offline");
  els.statStatus.innerHTML = `<span class="dot" id="status-dot"></span> OFFLINE`;

  els.statPlayers.textContent = "0 / 0";
  els.statGamemode.textContent = "—";
  els.statHostname.textContent = reason ? `Not reachable (${reason})` : "Server not reachable right now";

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
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(
      (p) =>
        `<li><span class="p-name">${escapeHtml(p.name)}</span><span class="p-score">score ${p.score} · ${p.ping}ms</span></li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function refreshStatus() {
  els.headerPillText.textContent = "Checking...";
  try {
    const res = await fetch("/api/server", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.online) {
      setOffline();
    } else {
      setOnline({ pc: data.players, pm: data.maxplayers, gm: data.gamemode, hn: data.hostname });
      try {
        const pRes = await fetch("/api/players", { cache: "no-store" });
        const { players } = pRes.ok ? await pRes.json() : { players: [] };
        renderRoster(players);
      } catch {
        els.rosterCount.textContent = "—";
        els.rosterList.innerHTML = `<li class="roster-empty">Player list temporarily unavailable</li>`;
      }
    }
  } catch (err) {
    console.warn("Status check failed:", err.message);
    setOffline(err.message);
  } finally {
    const now = new Date();
    els.lastChecked.textContent = `updated ${now.toLocaleTimeString()}`;
  }
}

refreshStatus();
setInterval(refreshStatus, POLL_MS);

/* ---- screenshot / poster gallery ---- */
async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  try {
    const res = await fetch("/api/posters", { cache: "no-store" });
    const { posters } = await res.json();
    if (!posters || posters.length === 0) {
      grid.innerHTML = `<p class="gallery-empty">තවම screenshots දාලා නෑ — ඉක්මනින් එකතු වෙනවා!</p>`;
      return;
    }
    grid.innerHTML = posters
      .map(
        (p) => `
        <div class="gallery-item">
          <img src="${p.url}" alt="${escapeHtml(p.caption || "screenshot")}" loading="lazy">
          ${p.caption ? `<div class="gallery-caption">${escapeHtml(p.caption)}</div>` : ""}
        </div>`
      )
      .join("");
  } catch {
    grid.innerHTML = `<p class="gallery-empty">Screenshots load කරගන්න බැරි උනා.</p>`;
  }
}
loadGallery();

/* ---- background music (autoplay with browser-policy fallback) ---- */
(function bgMusic() {
  const audio = document.getElementById("bg-music");
  const btn = document.getElementById("music-toggle");
  if (!audio || !btn) return;

  audio.volume = 0.18; // low background volume, as requested

  audio.addEventListener("error", () => {
    console.warn("Background music failed on:", audio.currentSrc || "(no source loaded)");
  });

  function setIcon(playing) {
    btn.textContent = playing ? "🔊" : "🔇";
    btn.classList.toggle("muted", !playing);
  }

  // Try to autoplay immediately. Most mobile/desktop browsers block
  // audio-with-sound autoplay until the user has interacted with the
  // page — if that happens, fall back to starting on first tap/click.
  audio.play().then(() => setIcon(true)).catch(() => {
    setIcon(false);
    const startOnInteraction = () => {
      audio.play().then(() => setIcon(true)).catch(() => {});
      document.removeEventListener("click", startOnInteraction);
      document.removeEventListener("touchstart", startOnInteraction);
    };
    document.addEventListener("click", startOnInteraction, { once: true });
    document.addEventListener("touchstart", startOnInteraction, { once: true });
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (audio.paused) {
      audio.play().then(() => setIcon(true)).catch((err) => {
        console.warn("Music failed to play:", err.name, err.message, "src:", audio.currentSrc);
        btn.textContent = "⚠️";
        btn.title = "Music load failed — check console";
        setTimeout(() => setIcon(false), 1500);
      });
    } else {
      audio.pause();
      setIcon(false);
    }
  });
})();

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
