function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])) }

async function post(url, data){
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(data || {}) });
  let body = {};
  try { body = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data: body };
}

const loginView = document.getElementById("loginView");
const dashView = document.getElementById("dashView");

function showDash(){ loginView.classList.add("hidden"); dashView.classList.remove("hidden"); loadApplications(); loadStaff(); }
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

const STAFF_ROLES = [
  { key: "owner", label: "👑 Owner" },
  { key: "developer", label: "💻 Developer" },
  { key: "administrator", label: "🛡️ Administrator" }
];

function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

async function loadStaff(){
  const r = await fetch("/api/admin/staff");
  if (r.status === 401){ showLogin(); return; }
  const x = await r.json();
  const grid = document.getElementById("staffEditGrid");
  grid.innerHTML = "";

  for (const role of STAFF_ROLES){
    const s = (x.staff && x.staff[role.key]) || { name: "", photo: "" };
    const card = document.createElement("div");
    card.style.cssText = "border:1px dashed var(--line);border-radius:6px;padding:16px";
    card.innerHTML = `
      <p style="font-family:var(--mono);color:var(--gold);font-size:13px;margin:0 0 10px">${role.label}</p>
      <img class="staff-preview" src="${s.photo || ""}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:50%;border:2px solid var(--gold);display:${s.photo ? "block" : "none"};margin-bottom:10px">
      <label style="display:block;font-size:13px;margin-bottom:8px">Name
        <input type="text" class="staff-name" value="${escapeHtml(s.name)}" placeholder="Staff member name" style="width:100%;margin-top:4px">
      </label>
      <label style="display:block;font-size:13px;margin-bottom:10px">Photo
        <input type="file" class="staff-photo-input" accept="image/*" style="width:100%;margin-top:4px">
      </label>
      <button class="mini-btn approve staff-save-btn" type="button">SAVE</button>
      <span class="staff-msg" style="display:block;margin-top:8px;font-size:13px"></span>`;
    grid.appendChild(card);

    const img = card.querySelector(".staff-preview");
    const fileInput = card.querySelector(".staff-photo-input");
    let pendingPhoto = s.photo || "";

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      pendingPhoto = await fileToDataUrl(file);
      img.src = pendingPhoto;
      img.style.display = "block";
    };

    card.querySelector(".staff-save-btn").onclick = async () => {
      const msg = card.querySelector(".staff-msg");
      const name = card.querySelector(".staff-name").value;
      const body = { name };
      if (pendingPhoto) body.photo = pendingPhoto;
      const x = await post(`/api/admin/staff/${role.key}`, body);
      msg.textContent = x.ok ? "Saved." : (x.data.error || "Save failed.");
      msg.style.color = x.ok ? "var(--gold)" : "#c0392b";
    };
  }
}

checkSession();
