const express = require("express");
const session = require("express-session");
const multer = require("multer");
const dgram = require("dgram");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const SERVER_IP = process.env.SAMP_IP || "51.79.254.10";
const SERVER_PORT = Number(process.env.SAMP_PORT || 7774);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SOMD456H";
const SESSION_SECRET = process.env.SESSION_SECRET || "nexston-admin-secret";
const WHITELIST_WEBHOOK_URL = process.env.DISCORD_WHITELIST_WEBHOOK ||
  "https://discord.com/api/webhooks/1542130766459445339/89YXBCvRPyedKCuD0ExaPKSBwe6jtG07yh7qBfaKiTNyPJdk05IMoMDwZentHfI7WvA4";

async function postWhitelistResult({ name, result, reason }) {
  const isPass = result === "pass";
  const embed = {
    title: isPass ? "✅ Whitelist Application — PASSED" : "❌ Whitelist Application — FAILED",
    color: isPass ? 0x38d68c : 0xe2445c,
    fields: [
      { name: "Player", value: name || "—", inline: true },
      { name: "Result", value: isPass ? "PASS" : "FAIL", inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
  if (!isPass && reason) {
    embed.fields.push({ name: "Reason", value: reason });
  }
  const res = await fetch(WHITELIST_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) throw new Error(`Discord webhook responded ${res.status}`);
}

// ---------------------------------------------------------------------------
// Poster storage — uploaded files go to public/uploads, metadata to a
// small JSON file. Simple and dependency-free; fine for a handful of
// screenshots. NOTE: on hosts with an ephemeral filesystem (e.g. Railway
// without a mounted volume), uploaded files can be wiped on redeploy —
// attach a persistent volume at /data if you need them to survive that.
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
const POSTERS_FILE = path.join(__dirname, "posters.json");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadPosters() {
  try { return JSON.parse(fs.readFileSync(POSTERS_FILE, "utf8")); }
  catch { return []; }
}
function savePosters(list) {
  fs.writeFileSync(POSTERS_FILE, JSON.stringify(list, null, 2));
}

// ---------------------------------------------------------------------------
// Whitelist applications — players submit via the public website form,
// admins review + decide (pass/fail) from the admin panel; a decision
// posts an embed to the Discord webhook above.
// ---------------------------------------------------------------------------
const APPLICATIONS_FILE = path.join(__dirname, "applications.json");

function loadApplications() {
  try { return JSON.parse(fs.readFileSync(APPLICATIONS_FILE, "utf8")); }
  catch { return []; }
}
function saveApplications(list) {
  fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(list, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `poster-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed."), ok);
  },
});

// ---------------------------------------------------------------------------
// SA-MP server query — talks to the game server directly over UDP.
// No third-party service (SAMonitor / open.mp masterlist) involved, so
// there's nothing that can go stale, block your IP, or require your
// server to be pre-registered anywhere. If the game server itself is
// reachable, this works.
// ---------------------------------------------------------------------------
function stripSampColors(str) {
  if (!str) return str;
  return str.replace(/\{[0-9A-Fa-f]{6}\}/g, "").trim();
}

function sampQuery(ip, port, timeout = 2500) {
  return new Promise((resolve) => {
    let socket;
    try { socket = dgram.createSocket("udp4"); }
    catch { return resolve({ online: false, ip, port }); }

    const ipBytes = Buffer.from(ip.split(".").map(Number));
    const packet = Buffer.alloc(11);
    Buffer.from("SAMP").copy(packet, 0);
    ipBytes.copy(packet, 4);
    packet.writeUInt16LE(port, 8);
    packet.write("i", 10, "ascii"); // 'i' = server info

    let done = false;
    const finish = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      if (!data) return resolve({ online: false, ip, port });
      try {
        if (data.length < 12 || data.toString("ascii", 0, 4) !== "SAMP") {
          return resolve({ online: false, ip, port });
        }
        const type = data.readUInt8(10);
        if (type !== 0x69) return resolve({ online: false, ip, port });

        const passworded = data.readUInt8(11);
        const players = data.readUInt16LE(12);
        const maxplayers = data.readUInt16LE(14);
        let offset = 16;
        const readString = () => {
          if (offset + 4 > data.length) return "";
          const len = data.readUInt32LE(offset); offset += 4;
          const end = Math.min(offset + len, data.length);
          const value = data.toString("utf8", offset, end);
          offset += len;
          return value;
        };
        const hostname = stripSampColors(readString());
        const gamemode = stripSampColors(readString());
        const language = stripSampColors(readString());

        resolve({
          online: true, ip, port, players, maxplayers, hostname, gamemode, language,
          passworded: Boolean(passworded), checkedAt: new Date().toISOString()
        });
      } catch {
        resolve({ online: false, ip, port });
      }
    };

    const timer = setTimeout(() => finish(null), timeout);
    socket.on("message", finish);
    socket.on("error", () => finish(null));
    socket.send(packet, 0, packet.length, port, ip, (err) => { if (err) finish(null); });
  });
}

function sampPlayersQuery(ip, port, timeout = 2500) {
  return new Promise((resolve) => {
    let socket;
    try { socket = dgram.createSocket("udp4"); }
    catch { return resolve([]); }

    const ipBytes = Buffer.from(ip.split(".").map(Number));
    const packet = Buffer.alloc(11);
    Buffer.from("SAMP").copy(packet, 0);
    ipBytes.copy(packet, 4);
    packet.writeUInt16LE(port, 8);
    packet.write("d", 10, "ascii"); // 'd' = detailed player list (name, score, ping)

    let done = false;
    const finish = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      if (!data) return resolve([]);
      try {
        if (data.length < 12 || data.toString("ascii", 0, 4) !== "SAMP") return resolve([]);
        const count = data.readUInt16LE(11);
        let offset = 13;
        const players = [];
        for (let i = 0; i < count && offset < data.length; i++) {
          const nameLen = data.readUInt8(offset); offset += 1;
          const name = stripSampColors(data.toString("utf8", offset, offset + nameLen)); offset += nameLen;
          const score = data.readInt32LE(offset); offset += 4;
          const ping = data.readUInt32LE(offset); offset += 4;
          players.push({ name, score, ping });
        }
        resolve(players);
      } catch {
        resolve([]);
      }
    };

    const timer = setTimeout(() => finish(null), timeout);
    socket.on("message", finish);
    socket.on("error", () => finish(null));
    socket.send(packet, 0, packet.length, port, ip, (err) => { if (err) finish(null); });
  });
}

let cachedStatus = { online: false, ip: SERVER_IP, port: SERVER_PORT };
let cachedPlayers = [];

async function refreshStatus() {
  try { cachedStatus = await sampQuery(SERVER_IP, SERVER_PORT); }
  catch { cachedStatus = { online: false, ip: SERVER_IP, port: SERVER_PORT }; }

  if (cachedStatus.online) {
    try { cachedPlayers = await sampPlayersQuery(SERVER_IP, SERVER_PORT); }
    catch { cachedPlayers = []; }
  } else {
    cachedPlayers = [];
  }
}
refreshStatus();
setInterval(refreshStatus, 10000);

// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 },
}));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/server", (req, res) => res.json(cachedStatus));
app.get("/api/players", (req, res) => res.json({ players: cachedPlayers }));

// ---------------------------------------------------------------------------
// Public: poster gallery
// ---------------------------------------------------------------------------
app.get("/api/posters", (req, res) => {
  const posters = loadPosters()
    .slice()
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  res.json({ posters });
});

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ error: "Not logged in." });
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Incorrect password." });
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => {
  res.json({ isAdmin: Boolean(req.session.isAdmin) });
});

// ---------------------------------------------------------------------------
// Admin: manage posters
// ---------------------------------------------------------------------------
app.post("/api/admin/posters", requireAdmin, (req, res) => {
  upload.single("poster")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const posters = loadPosters();
    const entry = {
      id: Date.now().toString(36) + Math.round(Math.random() * 1e4).toString(36),
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      caption: (req.body.caption || "").trim(),
      uploadedAt: new Date().toISOString(),
    };
    posters.push(entry);
    savePosters(posters);
    res.json({ ok: true, poster: entry });
  });
});

app.delete("/api/admin/posters/:id", requireAdmin, (req, res) => {
  const posters = loadPosters();
  const entry = posters.find((p) => p.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found." });

  const filePath = path.join(UPLOAD_DIR, entry.filename);
  fs.unlink(filePath, () => {}); // best-effort; ignore if already gone

  savePosters(posters.filter((p) => p.id !== req.params.id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin: whitelist result -> Discord channel notification
// ---------------------------------------------------------------------------
app.post("/api/admin/whitelist", requireAdmin, async (req, res) => {
  const { name, result, reason } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Player name is required." });
  if (result !== "pass" && result !== "fail") return res.status(400).json({ error: "Result must be pass or fail." });
  if (result === "fail" && (!reason || !reason.trim())) {
    return res.status(400).json({ error: "A reason is required when marking a fail." });
  }

  try {
    await postWhitelistResult({ name: name.trim(), result, reason: (reason || "").trim() });
    res.json({ ok: true });
  } catch (err) {
    console.error("Discord webhook failed:", err.message);
    res.status(502).json({ error: "Could not post to Discord. Check the webhook URL." });
  }
});

// ---------------------------------------------------------------------------
// Whitelist applications — public submit + admin review/decide
// ---------------------------------------------------------------------------
app.post("/api/whitelist/apply", (req, res) => {
  const { name, discord, age, answer } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Character name is required." });
  if (!discord || !discord.trim()) return res.status(400).json({ error: "Discord username is required." });

  const applications = loadApplications();
  const entry = {
    id: Date.now().toString(36) + Math.round(Math.random() * 1e4).toString(36),
    name: name.trim(),
    discord: discord.trim(),
    age: (age || "").trim(),
    answer: (answer || "").trim(),
    status: "pending", // pending | pass | fail
    reason: "",
    submittedAt: new Date().toISOString(),
  };
  applications.push(entry);
  saveApplications(applications);
  res.json({ ok: true });
});

app.get("/api/admin/whitelist/applications", requireAdmin, (req, res) => {
  const applications = loadApplications()
    .slice()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  res.json({ applications });
});

app.post("/api/admin/whitelist/:id/decide", requireAdmin, async (req, res) => {
  const { result, reason } = req.body || {};
  if (result !== "pass" && result !== "fail") return res.status(400).json({ error: "Result must be pass or fail." });
  if (result === "fail" && (!reason || !reason.trim())) {
    return res.status(400).json({ error: "A reason is required when marking a fail." });
  }

  const applications = loadApplications();
  const entry = applications.find((a) => a.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Application not found." });

  try {
    await postWhitelistResult({ name: entry.name, result, reason: (reason || "").trim() });
  } catch (err) {
    console.error("Discord webhook failed:", err.message);
    return res.status(502).json({ error: "Could not post to Discord. Check the webhook URL." });
  }

  entry.status = result;
  entry.reason = (reason || "").trim();
  entry.decidedAt = new Date().toISOString();
  saveApplications(applications);
  res.json({ ok: true });
});

app.delete("/api/admin/whitelist/applications/:id", requireAdmin, (req, res) => {
  const applications = loadApplications();
  const next = applications.filter((a) => a.id !== req.params.id);
  saveApplications(next);
  res.json({ ok: true });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`NEXSTON CITY ROLEPLAY site running on port ${PORT}`);
  console.log(`SAMP server: ${SERVER_IP}:${SERVER_PORT}`);
});
