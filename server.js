const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Server } = require("socket.io");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const SOCKET_PORT = Number(process.env.SOCKET_PORT || 3001);
const BUZZER_URL = process.env.BUZZER_URL || `http://localhost:${PORT}/`;
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL || `http://localhost:${SOCKET_PORT}`;
const TEAM_IDS = new Set(["florea", "solaris", "aurelia", "frostveil"]);
const games = new Map();

function sendFile(req, res, file) {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".csv": "text/csv; charset=utf-8", ".m4a": "audio/mp4" };
  res.setHeader("Content-Type", types[path.extname(file).toLowerCase()] || "application/octet-stream");
  const size = fs.statSync(file).size;
  res.setHeader("Accept-Ranges", "bytes");
  const range = reqRange(req.headers.range, size);
  if (range) {
    res.writeHead(206, { "Content-Range": `bytes ${range.start}-${range.end}/${size}`, "Content-Length": range.end - range.start + 1 });
    fs.createReadStream(file, range).on("error", () => res.destroy()).pipe(res);
  } else {
    res.setHeader("Content-Length", size);
    fs.createReadStream(file).on("error", () => { if (!res.headersSent) res.writeHead(404); res.end("Not found"); }).pipe(res);
  }
}
function reqRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[2] && match[1] ? Number(match[2]) : size - 1;
  if (start > end || start >= size) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (pathname === "/socket.io/socket.io.js") return sendFile(req, res, path.join(ROOT, "node_modules", "socket.io", "client-dist", "socket.io.js"));
  let file;
  if (pathname === "/buzzer" || pathname === "/buzzer/") file = path.join(ROOT, "buzzer", "index.html");
  else if (pathname.startsWith("/buzzer/")) file = path.join(ROOT, "buzzer", pathname.slice(8));
  else file = path.join(ROOT, pathname === "/" ? "index.html" : pathname.slice(1));
  const resolved = path.resolve(file);
  if (!resolved.startsWith(ROOT + path.sep) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.setHeader("Cache-Control", "no-store");
  sendFile(req, res, resolved);
});

const socketServer = http.createServer();
const io = new Server(socketServer, { cors: { origin: true, methods: ["GET", "POST"] }, maxHttpBufferSize: 10_000 });
const TEAM_NAMES = { florea: "Floréa", solaris: "Solaris", aurelia: "Aurelia", frostveil: "Frostveil" };
function publicState(game) {
  const joinLink = `${game.buzzerPageUrl}${game.buzzerPageUrl.includes("?") ? "&" : "?"}server=${encodeURIComponent(game.publicServerUrl)}&room=${encodeURIComponent(game.code)}`;
  return { code: game.code, activeTeam: game.activeTeam, publicServerUrl: game.publicServerUrl, joinLink, window: game.window ? { open: game.window.open, autoClose: game.window.autoClose, duration: game.window.duration, closesAt: game.window.closesAt } : null,
    players: [...game.players.values()].map(({ id, name, team, connected }) => ({ id, name, team, teamName: TEAM_NAMES[team], connected })),
    buzzes: game.buzzes.map((buzz, index) => ({ ...buzz, order: index + 1, teamName: TEAM_NAMES[buzz.team] })) };
}
function broadcast(game) { io.to(game.code).emit("game:state", publicState(game)); }
function makeCode() { let code; do { code = crypto.randomBytes(4).toString("hex").toUpperCase(); } while (games.has(code)); return code; }

io.on("connection", socket => {
  socket.on("host:resume", (payload = {}, ack = () => {}) => {
    const game = games.get(String(payload.code || "").toUpperCase());
    if (!game || !payload.hostKey || payload.hostKey !== game.hostKey) return ack({ ok: false, error: "Host session not found. Create a new room." });
    game.hostId = socket.id;
    socket.join(game.code);
    ack({ ok: true, code: game.code, hostKey: game.hostKey, buzzerUrl: `${game.buzzerPageUrl}${game.buzzerPageUrl.includes("?") ? "&" : "?"}server=${encodeURIComponent(game.publicServerUrl)}&room=${encodeURIComponent(game.code)}` });
    broadcast(game);
  });
  socket.on("host:create", (_, ack = () => {}) => {
    const code = makeCode();
    const game = { code, hostId: socket.id, hostKey: crypto.randomBytes(24).toString("hex"), activeTeam: null, players: new Map(), buzzes: [], window: null, timer: null, publicServerUrl: PUBLIC_SERVER_URL, buzzerPageUrl: BUZZER_URL };
    games.set(code, game); socket.join(code);
    const joinUrl = `${game.buzzerPageUrl}${game.buzzerPageUrl.includes("?") ? "&" : "?"}server=${encodeURIComponent(game.publicServerUrl)}&room=${encodeURIComponent(game.code)}`;
    ack({ ok: true, code, hostKey: game.hostKey, buzzerUrl: joinUrl });
    broadcast(game);
  });
  socket.on("player:join", (payload = {}, ack = () => {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const game = games.get(code);
    const name = String(payload.name || "").trim().slice(0, 24);
    const team = String(payload.team || "").toLowerCase();
    const playerId = String(payload.playerId || "").slice(0, 80);
    if (!game || !name || !TEAM_IDS.has(team) || !/^[a-zA-Z0-9-]{12,80}$/.test(playerId)) return ack({ ok: false, error: "Check the room code, name, and team." });
    const existing = game.players.get(playerId);
    if (existing && existing.team !== team) return ack({ ok: false, error: "That player profile is already registered to another team." });
    if (!existing && [...game.players.values()].filter(player => player.team === team).length >= 4) return ack({ ok: false, error: "This team already has four registered players." });
    const player = { id: playerId, name, team, connected: true, socketId: socket.id };
    game.players.set(playerId, player); socket.data.gameCode = code; socket.data.playerId = playerId; socket.join(code);
    ack({ ok: true, playerId, name, team, teamName: TEAM_NAMES[team] }); broadcast(game);
  });
  socket.on("host:command", (payload = {}, ack = () => {}) => {
    const game = games.get(String(payload.code || "").toUpperCase());
    if (!game || game.hostId !== socket.id || payload.hostKey !== game.hostKey) return ack({ ok: false, error: "Host authorization failed." });
    if (payload.action === "configure") {
      try { const url = new URL(String(payload.publicServerUrl || "")); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); game.publicServerUrl = url.origin; broadcast(game); ack({ ok: true }); }
      catch { ack({ ok: false, error: "Enter a valid public server address." }); }
    } else if (payload.action === "open") {
      clearTimeout(game.timer);
      game.activeTeam = TEAM_IDS.has(payload.activeTeam) ? payload.activeTeam : null;
      game.buzzes = [];
      game.window = { open: true, autoClose: Boolean(payload.autoClose), duration: Math.max(1, Math.min(60, Number(payload.duration) || 5)), closesAt: payload.autoClose ? Date.now() + Math.max(1, Math.min(60, Number(payload.duration) || 5)) * 1000 : null };
      if (game.window.autoClose) game.timer = setTimeout(() => { if (game.window?.open) { game.window.open = false; game.window.closesAt = null; broadcast(game); } }, game.window.duration * 1000);
      broadcast(game); ack({ ok: true });
    } else if (payload.action === "close") {
      clearTimeout(game.timer); game.timer = null;
      if (game.window) { game.window.open = false; game.window.closesAt = null; }
      broadcast(game); ack({ ok: true });
    } else if (payload.action === "reset") {
      clearTimeout(game.timer); game.timer = null; game.window = null; game.buzzes = []; game.activeTeam = null; broadcast(game); ack({ ok: true });
    } else ack({ ok: false, error: "Unknown host action." });
  });
  socket.on("player:buzz", (_, ack = () => {}) => {
    const game = games.get(socket.data.gameCode);
    const player = game?.players.get(socket.data.playerId);
    if (!game || !player || !game.window?.open) return ack({ ok: false, error: "Buzzers are closed." });
    if (player.team === game.activeTeam) return ack({ ok: false, error: "Your team is currently playing." });
    if (game.buzzes.some(item => item.playerId === player.id)) return ack({ ok: false, error: "Your buzz is already recorded." });
    game.buzzes.push({ playerId: player.id, name: player.name, team: player.team, receivedAt: Date.now() });
    const order = game.buzzes.length;
    ack({ ok: true, order }); broadcast(game);
  });
  socket.on("player:leave", () => {
    const game = games.get(socket.data.gameCode);
    if (game && socket.data.playerId) { game.players.delete(socket.data.playerId); broadcast(game); }
    socket.data.gameCode = null; socket.data.playerId = null;
  });
  socket.on("disconnect", () => {
    const code = socket.data.gameCode; const game = games.get(code);
    if (game) { const player = game.players.get(socket.data.playerId); if (player?.socketId === socket.id) { player.connected = false; player.socketId = null; } broadcast(game); }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Local stage: http://localhost:${PORT}`));
socketServer.listen(SOCKET_PORT, "0.0.0.0", () => console.log(`Buzzer relay: http://localhost:${SOCKET_PORT} (share this relay address only)`));
