async function serverStatus(){
  try{
    const r = await fetch("/api/server",{cache:"no-store"});
    const s = await r.json();
    const online = !!s.online;
    const stamp = document.getElementById("permitStamp");
    stamp.textContent = online ? "ACTIVE" : "OFFLINE";
    stamp.className = "permit-stamp " + (online ? "on" : "off");
    document.getElementById("players").textContent = online ? s.players : "0";
    document.getElementById("maxPlayers").textContent = online ? s.maxplayers : "--";
    document.getElementById("checked").textContent = online
      ? `${s.hostname || "NEXSTON"} · ${s.gamemode || "ROLEPLAY"}`
      : "No response logged from the wire.";
  }catch(e){
    document.getElementById("checked").textContent = "Could not reach the precinct desk.";
  }
}
serverStatus();
setInterval(serverStatus, 10000);

function formData(form){ return Object.fromEntries(new FormData(form).entries()) }

async function post(url, data){
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(data) });
  let body = {};
  try { body = await r.json(); } catch {}
  return { ok: r.ok, data: body };
}

function setMsg(el, text, isError){
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(isError));
}

document.getElementById("registerForm").onsubmit = async e => {
  e.preventDefault();
  const msg = document.getElementById("registerMsg");
  const x = await post("/api/register", formData(e.target));
  setMsg(msg, x.data.error || "Record opened.", !x.ok);
  if (x.ok){ e.target.reset(); loadMe(); }
};

document.getElementById("loginForm").onsubmit = async e => {
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  const x = await post("/api/login", formData(e.target));
  setMsg(msg, x.data.error || "Record retrieved.", !x.ok);
  if (x.ok){ e.target.reset(); loadMe(); }
};

document.getElementById("whitelistForm").onsubmit = async e => {
  e.preventDefault();
  const msg = document.getElementById("wlMsg");
  const x = await post("/api/whitelist", formData(e.target));
  setMsg(msg, x.data.error || "Application filed.", !x.ok);
  if (x.ok) e.target.reset();
};

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])) }

async function loadMe(){
  const r = await fetch("/api/me");
  const x = await r.json();
  const card = document.getElementById("accountCard");
  const wlHint = document.getElementById("wlHint");

  if (!x.loggedIn){
    card.classList.add("hidden");
    wlHint.textContent = "Log a Records account first, then file your application below.";
    return;
  }
  wlHint.textContent = `Filing as ${x.user.username}. Submit your application below.`;
  card.classList.remove("hidden");
  const apps = x.applications.length
    ? x.applications.map(a => `<li>${escapeHtml(a.samp_name)} — <strong>${a.status.toUpperCase()}</strong></li>`).join("")
    : "<li>No applications on file yet.</li>";
  card.innerHTML = `
    <h3>${escapeHtml(x.user.username)}'s Record</h3>
    <p>${escapeHtml(x.user.email)}</p>
    <p>Whitelist filings:</p>
    <ul>${apps}</ul>
    <button class="stamp-btn outline" id="logoutBtn">LOGOUT</button>`;
  document.getElementById("logoutBtn").onclick = logout;
}

async function logout(){
  await fetch("/api/logout", { method:"POST" });
  loadMe();
}

loadMe();
