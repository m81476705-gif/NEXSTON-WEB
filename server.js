const express = require("express");
const dgram = require("dgram");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const SERVER_IP = process.env.SAMP_IP || "51.79.254.10";
const SERVER_PORT = Number(process.env.SAMP_PORT || 7774);

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
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/server", (req, res) => res.json(cachedStatus));
app.get("/api/players", (req, res) => res.json({ players: cachedPlayers }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`NEXSTON CITY ROLEPLAY site running on port ${PORT}`);
  console.log(`SAMP server: ${SERVER_IP}:${SERVER_PORT}`);
});
