const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const dgram = require("dgram");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const SERVER_IP = process.env.SAMP_IP || "51.79.254.10";
const SERVER_PORT = Number(process.env.SAMP_PORT || 7774);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SOMD234";
const SESSION_SECRET = process.env.SESSION_SECRET || "nexston-city-roleplay-secret";

// ---------------------------------------------------------------------------
// Storage: a plain JSON file instead of a native database module.
// better-sqlite3 needs to be compiled for the host platform on install, and
// that native build step is the single most common cause of a Node app
// failing to boot on a fresh host. A JSON file has zero native dependencies,
// so there is nothing platform-specific to fail here.
// ---------------------------------------------------------------------------
const DB_FILE = path.join(__dirname, "data.json");

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { users: [], whitelist: [], nextUserId: 1, nextWhitelistId: 1 };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// ---------------------------------------------------------------------------
// SA-MP server query
// ---------------------------------------------------------------------------
function stripSampColors(str) {
  if (!str) return str;
  return str.replace(/\{[0-9A-Fa-f]{6}\}/g, "").trim();
}

function sampQuery(ip, port, timeout = 2500) {
  return new Promise((resolve) => {
    let socket;
    try {
      socket = dgram.createSocket("udp4");
    } catch {
      return resolve({ online: false, ip, port });
    }
    const ipBytes = Buffer.from(ip.split(".").map(Number));
    const packet = Buffer.alloc(11);
    Buffer.from("SAMP").copy(packet, 0);
    ipBytes.copy(packet, 4);
    packet.writeUInt16LE(port, 8);
    packet.write("i", 10, "ascii");

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
          online: true,
          ip, port, players, maxplayers, hostname, gamemode, language,
          passworded: Boolean(passworded),
          checkedAt: new Date().toISOString()
        });
      } catch {
        resolve({ online: false, ip, port });
      }
    };

    const timer = setTimeout(() => finish(null), timeout);
    socket.on("message", finish);
    socket.on("error", () => finish(null));
    socket.send(packet, 0, packet.length, port, ip, (err) => {
      if (err) finish(null);
    });
  });
}

let cachedStatus = { online: false, ip: SERVER_IP, port: SERVER_PORT };

async function refreshStatus() {
  try {
    cachedStatus = await sampQuery(SERVER_IP, SERVER_PORT);
  } catch {
    cachedStatus = { online: false, ip: SERVER_IP, port: SERVER_PORT };
  }
}
refreshStatus();
setInterval(refreshStatus, 10000);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
app.get("/api/server", (req, res) => res.json(cachedStatus));

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.json({ loggedIn: false });
  const applications = db.whitelist
    .filter(w => w.userId === user.id)
    .map(w => ({ id: w.id, samp_name: w.sampName, status: w.status, created_at: w.createdAt }))
    .sort((a, b) => b.id - a.id);
  res.json({ loggedIn: true, user: { id: user.id, username: user.username, email: user.email }, applications });
});

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Username, email and a password of at least 6 characters are required." });

  const normEmail = email.trim().toLowerCase();
  const exists = db.users.some(u => u.username === username.trim() || u.email === normEmail);
  if (exists) return res.status(409).json({ error: "Username or email is already registered." });

  const hash = await bcrypt.hash(password, 10);
  const user = { id: db.nextUserId++, username: username.trim(), email: normEmail, passwordHash: hash, createdAt: new Date().toISOString() };
  db.users.push(user);
  saveDB(db);
  req.session.userId = user.id;
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === (email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash)))
    return res.status(401).json({ error: "Invalid email or password." });
  req.session.userId = user.id;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post("/api/whitelist", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Please login first." });
  const { sampName, age, discord, experience, reason } = req.body;
  if (!sampName || !reason) return res.status(400).json({ error: "SAMP name and reason are required." });

  const entry = {
    id: db.nextWhitelistId++,
    userId: req.session.userId,
    sampName: sampName.trim(),
    age: Number(age) || null,
    discord: discord || "",
    experience: experience || "",
    reason: reason.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  };
  db.whitelist.push(entry);
  saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ error: "Not logged in as admin." });
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Incorrect admin password." });
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

app.get("/api/admin/applications", requireAdmin, (req, res) => {
  const rows = db.whitelist
    .map(w => {
      const user = db.users.find(u => u.id === w.userId) || {};
      return {
        id: w.id,
        samp_name: w.sampName,
        age: w.age,
        discord: w.discord,
        experience: w.experience,
        reason: w.reason,
        status: w.status,
        created_at: w.createdAt,
        username: user.username || "(deleted user)",
        email: user.email || "-"
      };
    })
    .sort((a, b) => b.id - a.id);
  res.json({ applications: rows });
});

app.post("/api/admin/applications/:id", requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status))
    return res.status(400).json({ error: "Invalid status." });
  const entry = db.whitelist.find(w => w.id === Number(req.params.id));
  if (!entry) return res.status(404).json({ error: "Application not found." });
  entry.status = status;
  saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------------------------------------------------------------
// Startup — never let an unexpected error silently kill the process without
// a message, and keep the process alive on non-fatal async errors.
// ---------------------------------------------------------------------------
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

app.listen(PORT, () => {
  console.log(`NEXSTON website running on port ${PORT}`);
  console.log(`SAMP server: ${SERVER_IP}:${SERVER_PORT}`);
});
