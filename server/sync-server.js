/**
 * Servidor TradeWatch: cuentas de usuario + base de datos + precios reales + sincronización.
 *
 *  - Base de datos SQLite (server/tradewatch.db), incluida en Node.js 22+
 *  - API HTTP:  registro, inicio de sesión, datos de la cuenta
 *  - WebSocket: el teléfono envía su estado y el servidor lo reenvía SOLO
 *               a los relojes que iniciaron sesión con la MISMA cuenta
 *
 * Uso: npm run sync   (puerto 8090)
 */
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { WebSocketServer } = require('ws');
const { DatabaseSync } = require('node:sqlite');
const { startMarket, getMarket } = require('./market');

const PORT = Number(process.env.SYNC_PORT) || 8090;
const METRO_PORT = Number(process.env.METRO_PORT) || 8081;
const DB_FILE = path.join(__dirname, 'tradewatch.db');
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

/* ---------------- Base de datos ---------------- */
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name       TEXT NOT NULL,
    pass_hash  TEXT NOT NULL,
    salt       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device     TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_state (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state      TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS watch_snapshot (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    snapshot   TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const q = {
  userByLogin: db.prepare('SELECT * FROM users WHERE username = ? OR email = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userExists: db.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?'),
  insertUser: db.prepare('INSERT INTO users (username, email, name, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token, user_id, device, created_at) VALUES (?, ?, ?, ?)'),
  session: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  getState: db.prepare('SELECT state, updated_at FROM app_state WHERE user_id = ?'),
  putState: db.prepare('INSERT INTO app_state (user_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at'),
  getSnap: db.prepare('SELECT snapshot FROM watch_snapshot WHERE user_id = ?'),
  putSnap: db.prepare('INSERT INTO watch_snapshot (user_id, snapshot, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at'),
};

const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, name: u.name, createdAt: u.created_at });
function createSession(userId, device) {
  const token = crypto.randomBytes(32).toString('hex');
  q.insertSession.run(token, userId, device === 'watch' ? 'watch' : 'phone', Date.now());
  return token;
}

/* ---------------- API HTTP ---------------- */
const USER_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 3 * 1024 * 1024) reject(new Error('too-large'));
      else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('bad-json'));
      }
    });
  });
}

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  return token ? q.session.get(token) || null : null;
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (req.method === 'GET' && url === '/api/health') return reply(res, 200, { ok: true });

    // Precios reales (Yahoo Finance), públicos
    if (req.method === 'GET' && url === '/api/market') return reply(res, 200, getMarket());

    if (req.method === 'POST' && url === '/api/register') {
      const b = await readBody(req);
      const name = String(b.name || '').trim();
      const username = String(b.username || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      if (name.length < 2 || name.length > 40) return reply(res, 400, { error: 'El nombre debe tener entre 2 y 40 caracteres.' });
      if (!USER_RE.test(username)) return reply(res, 400, { error: 'El usuario debe tener 3 a 20 caracteres: letras, números, punto o guion bajo.' });
      if (!EMAIL_RE.test(email)) return reply(res, 400, { error: 'Ingresa un correo válido.' });
      if (password.length < 6) return reply(res, 400, { error: 'La contraseña debe tener al menos 6 caracteres.' });
      const exists = q.userExists.get(username, email);
      if (exists) {
        return reply(res, 409, {
          error: exists.username.toLowerCase() === username.toLowerCase() ? 'Ese nombre de usuario ya está registrado.' : 'Ese correo ya está registrado.',
        });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const r = q.insertUser.run(username, email, name, hashPassword(password, salt), salt, Date.now());
      const user = q.userById.get(Number(r.lastInsertRowid));
      log(`Nueva cuenta: @${user.username}`);
      return reply(res, 201, { token: createSession(user.id, b.device), user: publicUser(user) });
    }

    if (req.method === 'POST' && url === '/api/login') {
      const b = await readBody(req);
      const login = String(b.login || '').trim();
      const password = String(b.password || '');
      const user = login ? q.userByLogin.get(login, login.toLowerCase()) : null;
      const ok = user && crypto.timingSafeEqual(Buffer.from(hashPassword(password, user.salt), 'hex'), Buffer.from(user.pass_hash, 'hex'));
      if (!ok) return reply(res, 401, { error: 'Usuario o contraseña incorrectos.' });
      log(`Inicio de sesión: @${user.username} (${b.device === 'watch' ? 'reloj' : 'teléfono'})`);
      return reply(res, 200, { token: createSession(user.id, b.device), user: publicUser(user) });
    }

    const user = auth(req);
    if (url.startsWith('/api/') && !user) return reply(res, 401, { error: 'Sesión no válida. Inicia sesión de nuevo.' });

    if (req.method === 'GET' && url === '/api/me') return reply(res, 200, { user: publicUser(user) });

    if (req.method === 'POST' && url === '/api/logout') {
      q.deleteSession.run(req.headers.authorization.slice(7));
      return reply(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url === '/api/state') {
      const row = q.getState.get(user.id);
      return reply(res, 200, { state: row ? JSON.parse(row.state) : null, updatedAt: row?.updated_at || null });
    }

    if (req.method === 'PUT' && url === '/api/state') {
      const b = await readBody(req);
      if (!b.state || typeof b.state !== 'object') return reply(res, 400, { error: 'Estado inválido.' });
      q.putState.run(user.id, JSON.stringify(b.state), Date.now());
      return reply(res, 200, { ok: true });
    }

    reply(res, 404, { error: 'No encontrado' });
  } catch (e) {
    reply(res, 400, { error: e.message === 'too-large' ? 'Datos demasiado grandes.' : 'Solicitud inválida.' });
  }
});

/* ---------------- Sincronización en tiempo real ---------------- */
const wss = new WebSocketServer({ server });
const lastSnap = new Map(); // userId → snapshot
const snapSaved = new Map(); // userId → última vez guardado en BD
const watchStatus = new Map(); // userId → { power, phase }
let sent = 0;

const clients = (userId, role) => [...wss.clients].filter((c) => c.userId === userId && c.role === role && c.readyState === 1);
const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));

function publishWatchStatus(userId) {
  const st = watchStatus.get(userId) || { power: false, phase: 'off' };
  const online = clients(userId, 'watch').length > 0;
  clients(userId, 'phone').forEach((c) => send(c, { type: 'watch', online, ...st }));
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'hello') {
      const user = msg.token ? q.session.get(msg.token) : null;
      if (!user) return send(ws, { type: 'auth-error', error: 'Sesión no válida' });
      ws.userId = user.id;
      ws.username = user.username;
      ws.role = msg.role === 'watch' ? 'watch' : 'phone';
      log(`Conectado: ${ws.role === 'watch' ? 'RELOJ' : 'TELÉFONO'} de @${user.username}`);
      send(ws, { type: 'welcome', user: publicUser(user) });
      if (ws.role === 'watch') {
        let snap = lastSnap.get(user.id);
        if (!snap) {
          const row = q.getSnap.get(user.id);
          if (row) snap = JSON.parse(row.snapshot);
        }
        if (snap) send(ws, { type: 'snapshot', data: snap, cached: !clients(user.id, 'phone').length });
      }
      publishWatchStatus(user.id);
      return;
    }
    if (!ws.userId) return;
    switch (msg.type) {
      case 'snapshot': {
        // teléfono → relojes de la MISMA cuenta
        lastSnap.set(ws.userId, msg.data);
        sent += 1;
        clients(ws.userId, 'watch').forEach((c) => send(c, { type: 'snapshot', data: msg.data }));
        if (Date.now() - (snapSaved.get(ws.userId) || 0) > 10000) {
          q.putSnap.run(ws.userId, JSON.stringify(msg.data), Date.now());
          snapSaved.set(ws.userId, Date.now());
        }
        break;
      }
      case 'status':
        watchStatus.set(ws.userId, { power: !!msg.power, phase: msg.phase });
        publishWatchStatus(ws.userId);
        break;
      case 'command':
        log(`Comando de @${ws.username} al reloj: ${msg.cmd}${msg.cmd === 'power' ? ` (${msg.on ? 'encender' : 'apagar'})` : ''}`);
        clients(ws.userId, 'watch').forEach((c) => send(c, msg));
        break;
      default:
    }
  });
  ws.on('close', () => {
    if (!ws.userId) return;
    log(`Desconectado: ${ws.role === 'watch' ? 'RELOJ' : 'TELÉFONO'} de @${ws.username}`);
    if (ws.role === 'watch') publishWatchStatus(ws.userId);
  });
});

// Latido para los relojes: confirma la conexión y si el teléfono de esa cuenta está en línea
setInterval(() => {
  for (const c of wss.clients) {
    if (c.role === 'watch' && c.userId) send(c, { type: 'ping', phoneOnline: clients(c.userId, 'phone').length > 0 });
  }
}, 5000);

setInterval(() => {
  if (!sent) return;
  const users = [...new Set([...wss.clients].filter((c) => c.userId).map((c) => `@${c.username}`))];
  log(`Sincronizado: ${sent} actualizaciones · cuentas conectadas: ${users.join(', ') || '—'}`);
  sent = 0;
}, 15000);

/* ---------------- Túneles adb (emuladores) ---------------- */
// Wear OS apaga su red cuando está inactivo: los emuladores usan localhost a través de adb reverse.
function findAdb() {
  const roots = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME, path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'), path.join(os.homedir(), 'Library', 'Android', 'sdk'), path.join(os.homedir(), 'Android', 'Sdk')].filter(Boolean);
  for (const r of roots) {
    for (const sub of [path.join(r, 'platform-tools'), path.join(r, 'Sdk', 'platform-tools')]) {
      const exe = path.join(sub, process.platform === 'win32' ? 'adb.exe' : 'adb');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'adb';
}
const ADB = findAdb();
const tunneled = new Set();
function setupTunnels() {
  execFile(ADB, ['devices'], (err, out) => {
    if (err) return;
    const ids = out.split(/\r?\n/).slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p[1] === 'device').map((p) => p[0]);
    for (const id of ids) {
      execFile(ADB, ['-s', id, 'reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`], () => {});
      execFile(ADB, ['-s', id, 'reverse', `tcp:${PORT}`, `tcp:${PORT}`], (e) => {
        if (!e && !tunneled.has(id)) {
          tunneled.add(id);
          log(`Túnel adb listo en ${id}`);
        }
      });
    }
  });
}
setupTunnels();
setInterval(setupTunnels, 10000);

function onListenError(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PORT} ya está en uso: probablemente el servidor TradeWatch ya está corriendo en otra terminal.`);
    console.error('Cierra esa terminal (Ctrl + C) o usa la que ya está abierta.\n');
    process.exit(1);
  }
  throw err;
}
server.on('error', onListenError);
wss.on('error', onListenError);

server.listen(PORT, () => {
  startMarket(log);
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  log(`Servidor TradeWatch en el puerto ${PORT} · base de datos: ${path.basename(DB_FILE)} (${users} cuenta(s))`);
  log(`Direcciones: ${['localhost', ...ips].map((h) => `http://${h}:${PORT}`).join('  ')}`);
});
