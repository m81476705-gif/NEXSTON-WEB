async function serverStatus(){
  try{
    const r = await fetch("/api/server",{cache:"no-store"});
    const s = await r.json();
    const online = !!s.online;
    document.getElementById("statusDot").className = "dot " + (online ? "on" : "off");
    document.getElementById("statusText").textContent = online ? "SERVER ONLINE" : "SERVER OFFLINE";
    document.getElementById("players").textContent = online ? s.players : "0";
    document.getElementById("maxPlayers").textContent = online ? s.maxplayers : "--";
    document.getElementById("serverStatus").textContent = online ? "ONLINE" : "OFFLINE";
    document.getElementById("checked").textContent = online
      ? `${s.hostname || "NEXSTON"} · ${s.gamemode || "ROLEPLAY"}`
      : "No response from server";
  }catch(e){
    document.getElementById("checked").textContent = "Could not reach status service.";
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
  setMsg(msg, x.data.error || "Account created!", !x.ok);
  if (x.ok){ e.target.reset(); loadMe(); }
};

document.getElementById("loginForm").onsubmit = async e => {
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  const x = await post("/api/login", formData(e.target));
  setMsg(msg, x.data.error || "Logged in!", !x.ok);
  if (x.ok){ e.target.reset(); loadMe(); }
};

document.getElementById("whitelistForm").onsubmit = async e => {
  e.preventDefault();
  const msg = document.getElementById("wlMsg");
  const x = await post("/api/whitelist", formData(e.target));
  setMsg(msg, x.data.error || "Application submitted!", !x.ok);
  if (x.ok) e.target.reset();
};

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])) }

async function loadMe(){
  const r = await fetch("/api/me");
  const x = await r.json();
  const account = document.getElementById("account");
  const wlHint = document.getElementById("wlHint");

  if (!x.loggedIn){
    account.classList.add("hidden");
    wlHint.textContent = "Login first, then submit your application.";
    return;
  }
  wlHint.textContent = `Logged in as ${x.user.username}. You can submit your application below.`;
  account.classList.remove("hidden");
  const apps = x.applications.length
    ? x.applications.map(a => `<li>${escapeHtml(a.samp_name)} — <b>${a.status.toUpperCase()}</b></li>`).join("")
    : "<li>No applications yet.</li>";
  account.innerHTML = `
    <h3>Welcome, ${escapeHtml(x.user.username)}</h3>
    <p>${escapeHtml(x.user.email)}</p>
    <p>Your whitelist applications:</p>
    <ul>${apps}</ul>
    <button class="btn" id="logoutBtn">LOGOUT</button>`;
  document.getElementById("logoutBtn").onclick = logout;
}

async function logout(){
  await fetch("/api/logout", { method:"POST" });
  loadMe();
}

loadMe();
