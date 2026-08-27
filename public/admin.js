const loginView = document.getElementById("loginView");
const panelView = document.getElementById("panelView");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");
const uploadForm = document.getElementById("uploadForm");
const uploadMsg = document.getElementById("uploadMsg");
const posterGrid = document.getElementById("posterGrid");
const logoutBtn = document.getElementById("logoutBtn");

function setMsg(el, text, isError) {
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(isError));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

async function checkAdmin() {
  const r = await fetch("/api/admin/me");
  const { isAdmin } = await r.json();
  if (isAdmin) {
    loginView.classList.add("hidden");
    panelView.classList.remove("hidden");
    loadPosters();
    loadApplications();
  } else {
    loginView.classList.remove("hidden");
    panelView.classList.add("hidden");
  }
}

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const password = new FormData(e.target).get("password");
  const r = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    setMsg(loginMsg, data.error || "Login failed.", true);
    return;
  }
  setMsg(loginMsg, "", false);
  e.target.reset();
  checkAdmin();
};

logoutBtn.onclick = async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  checkAdmin();
};

uploadForm.onsubmit = async (e) => {
  e.preventDefault();
  setMsg(uploadMsg, "Uploading...", false);
  const fd = new FormData(e.target);
  const r = await fetch("/api/admin/posters", { method: "POST", body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    setMsg(uploadMsg, data.error || "Upload failed.", true);
    return;
  }
  setMsg(uploadMsg, "Uploaded!", false);
  e.target.reset();
  loadPosters();
};

async function loadPosters() {
  const r = await fetch("/api/posters");
  const { posters } = await r.json();
  if (!posters.length) {
    posterGrid.innerHTML = `<p style="color:#9aa1b0;font-size:13px">තවම posters නෑ.</p>`;
    return;
  }
  posterGrid.innerHTML = posters
    .map(
      (p) => `
      <div class="poster-item" data-id="${p.id}">
        <button class="poster-del" title="Delete">✕</button>
        <img src="${p.url}" alt="${escapeHtml(p.caption || "poster")}">
        ${p.caption ? `<div class="poster-caption">${escapeHtml(p.caption)}</div>` : ""}
      </div>`
    )
    .join("");

  posterGrid.querySelectorAll(".poster-del").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.closest(".poster-item").dataset.id;
      if (!confirm("Delete this poster?")) return;
      await fetch(`/api/admin/posters/${id}`, { method: "DELETE" });
      loadPosters();
    };
  });
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

async function loadApplications() {
  const wrap = document.getElementById("applicationsList");
  if (!wrap) return;
  try {
    const r = await fetch("/api/admin/whitelist/applications");
    const { applications } = await r.json();
    if (!applications.length) {
      wrap.innerHTML = `<p style="color:#9aa1b0;font-size:13px">Applications නෑ තවම.</p>`;
      return;
    }
    wrap.innerHTML = applications
      .map((a) => {
        const when = new Date(a.submittedAt).toLocaleString();
        const decided = a.status !== "pending";
        return `
        <div class="app-card" data-id="${a.id}">
          <div class="app-top">
            <span class="app-name">${escapeHtml(a.name)}</span>
            <span class="app-time">${when}</span>
          </div>
          <div class="app-row"><b>Discord:</b> ${escapeHtml(a.discord)}</div>
          ${a.realName ? `<div class="app-row"><b>Real Name:</b> ${escapeHtml(a.realName)}</div>` : ""}
          ${a.age ? `<div class="app-row"><b>Age:</b> ${escapeHtml(a.age)}</div>` : ""}
          ${a.heardFrom ? `<div class="app-row"><b>Heard from:</b> ${escapeHtml(a.heardFrom)}${a.heardLink ? ` — <a href="${escapeAttr(a.heardLink)}" target="_blank" rel="noopener" style="color:#f2a93b">${escapeHtml(a.heardLink)}</a>` : ""}</div>` : ""}
          ${a.priorRP ? `<div class="app-row"><b>Prior RP experience:</b> ${a.priorRP === "yes" ? "Yes" : "No"}</div>` : ""}
          ${
            decided
              ? `<div class="app-row"><span class="app-badge ${a.status}">${a.status === "pass" ? "✅ PASS" : "❌ FAIL"}</span>${a.reason ? ` — ${escapeHtml(a.reason)}` : ""}</div>`
              : `<div class="app-actions">
                  <button class="admin-btn" data-action="pass">✅ Pass</button>
                  <button class="admin-btn danger" data-action="fail">❌ Fail</button>
                  <button class="admin-btn ghost" data-action="delete">Delete</button>
                </div>`
          }
        </div>`;
      })
      .join("");

    wrap.querySelectorAll(".app-card").forEach((card) => {
      const id = card.dataset.id;

      const passBtn = card.querySelector('[data-action="pass"]');
      const failBtn = card.querySelector('[data-action="fail"]');
      const delBtn = card.querySelector('[data-action="delete"]');

      if (passBtn) passBtn.onclick = () => decideApplication(id, "pass");
      if (failBtn) failBtn.onclick = () => {
        const reason = prompt("Fail reason (Discord එකට යනවා):");
        if (reason === null) return; // cancelled
        if (!reason.trim()) return alert("Reason එකක් type කරන්න ඕන.");
        decideApplication(id, "fail", reason.trim());
      };
      if (delBtn) delBtn.onclick = async () => {
        if (!confirm("Delete this application?")) return;
        await fetch(`/api/admin/whitelist/applications/${id}`, { method: "DELETE" });
        loadApplications();
      };
    });
  } catch {
    wrap.innerHTML = `<p style="color:#e5484d;font-size:13px">Applications load කරගන්න බැරි උනා.</p>`;
  }
}

async function decideApplication(id, result, reason) {
  const r = await fetch(`/api/admin/whitelist/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result, reason }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    alert(data.error || "Failed to send decision.");
    return;
  }
  loadApplications();
}

checkAdmin();
