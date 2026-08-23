function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])) }

async function post(url, data){
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(data || {}) });
  let body = {};
  try { body = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data: body };
}

const loginView = document.getElementById("loginView");
const dashView = document.getElementById("dashView");

function showDash(){ loginView.classList.add("hidden"); dashView.classList.remove("hidden"); loadApplications(); }
function showLogin(){ dashView.classList.add("hidden"); loginView.classList.remove("hidden"); }

async function checkSession(){
  const r = await fetch("/api/admin/me");
  const x = await r.json();
  if (x.isAdmin) showDash(); else showLogin();
}

document.getElementById("adminLoginForm").onsubmit = async e => {
  e.preventDefault();
  const password = e.target.password.value;
  const msg = document.getElementById("adminLoginMsg");
  const x = await post("/api/admin/login", { password });
  if (x.ok){ e.target.reset(); msg.textContent = ""; showDash(); }
  else { msg.textContent = x.data.error || "Login failed."; msg.classList.add("error"); }
};

document.getElementById("adminLogoutBtn").onclick = async () => {
  await post("/api/admin/logout");
  showLogin();
};

async function loadApplications(){
  const r = await fetch("/api/admin/applications");
  if (r.status === 401){ showLogin(); return; }
  const x = await r.json();
  const tbody = document.querySelector("#appsTable tbody");
  const empty = document.getElementById("appsEmpty");
  tbody.innerHTML = "";

  if (!x.applications.length){ empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");

  for (const a of x.applications){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(a.samp_name)}</td>
      <td>${escapeHtml(a.username)}<br><small style="color:var(--muted)">${escapeHtml(a.email)}</small></td>
      <td>${escapeHtml(a.age ?? "-")}</td>
      <td>${escapeHtml(a.discord || "-")}</td>
      <td>${escapeHtml(a.experience || "-")}</td>
      <td>${escapeHtml(a.reason)}</td>
      <td><span class="badge ${a.status}">${a.status.toUpperCase()}</span></td>
      <td class="row-actions">
        <button class="mini-btn approve approve-btn" data-id="${a.id}">APPROVE</button>
        <button class="mini-btn reject reject-btn" data-id="${a.id}">REJECT</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".approve-btn").forEach(b => b.onclick = () => setStatus(b.dataset.id, "approved"));
  tbody.querySelectorAll(".reject-btn").forEach(b => b.onclick = () => setStatus(b.dataset.id, "rejected"));
}

async function setStatus(id, status){
  await post(`/api/admin/applications/${id}`, { status });
  loadApplications();
}

checkSession();
