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

checkAdmin();
