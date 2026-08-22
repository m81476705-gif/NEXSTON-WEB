const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const dgram = require("dgram");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_IP = process.env.SAMP_IP || "51.79.254.10";
const SERVER_PORT = Number(process.env.SAMP_PORT || 7774);

const db = new Database(path.join(__dirname, "data.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    samp_name TEXT NOT NULL,
    age INTEGER,
    discord TEXT,
    experience TEXT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "CHANGE_THIS_SESSION_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(express.static(path.join(__dirname, "public")));

function sampQuery(ip, port, timeout = 2500) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
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

        const hostname = readString();
        const gamemode = readString();
        const language = readString();

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
  cachedStatus = await sampQuery(SERVER_IP, SERVER_PORT);
}
refreshStatus();
setInterval(refreshStatus, 5000);

app.get("/api/server", (req, res) => res.json(cachedStatus));

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = db.prepare("SELECT id, username, email, created_at FROM users WHERE id=?").get(req.session.userId);
  const applications = db.prepare("SELECT id, samp_name, status, created_at FROM whitelist WHERE user_id=? ORDER BY id DESC").all(req.session.userId);
  res.json({ loggedIn: true, user, applications });
});

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Username, email and a password of at least 6 characters are required." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (username,email,password_hash) VALUES (?,?,?)")
      .run(username.trim(), email.trim().toLowerCase(), hash);
    req.session.userId = result.lastInsertRowid;
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: "Username or email is already registered." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
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
  db.prepare(`
    INSERT INTO whitelist (user_id,samp_name,age,discord,experience,reason)
    VALUES (?,?,?,?,?,?)
  `).run(req.session.userId, sampName.trim(), Number(age) || null, discord || "", experience || "", reason.trim());
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`NEXSTON website running on http://localhost:${PORT}`);
  console.log(`SAMP server: ${SERVER_IP}:${SERVER_PORT}`);
});
  
