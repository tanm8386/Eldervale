import http from 'node:http';
import { readFile, mkdir, rename, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Game } from './game.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.DATA_DIR || path.join(root, '.data');
await mkdir(dataDir, { recursive: true });
let accounts = [];
try {
  accounts = JSON.parse(await readFile(path.join(dataDir, 'characters.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') console.error('Could not load characters:', error.message);
}

const game = new Game({ accounts });
const production = process.env.NODE_ENV === 'production';
const server = http.createServer();
const vite = production
  ? null
  : await (
      await import('vite')
    ).createServer({
      root,
      server: { middlewareMode: true, hmr: { server }, host: '0.0.0.0', allowedHosts: true },
      appType: 'spa',
    });
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

server.on('request', async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        name: 'Elderwood',
        online: game.players.size,
        status: 'online',
        version: '1.0.0',
      }),
    );
    return;
  }
  if (vite) {
    vite.middlewares(req, res);
    return;
  }
  try {
    const requested = path.resolve(root, 'dist', `.${decodeURIComponent(url.pathname)}`);
    const dist = path.join(root, 'dist');
    if (!requested.startsWith(`${dist}${path.sep}`) && requested !== dist) {
      res.writeHead(403).end();
      return;
    }
    let file = requested;
    try {
      if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html');
    } catch {
      if (path.extname(file)) {
        res.writeHead(404).end('Not found');
        return;
      }
      file = path.join(dist, 'index.html');
    }
    const content = await readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600');
    res.end(content);
  } catch {
    res.writeHead(500).end('Unable to load Eldervale.');
  }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on('upgrade', (request, socket, head) => {
  if (new URL(request.url, 'http://localhost').pathname === '/world')
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws));
});
wss.on('connection', (ws) => {
  let playerId = null,
    windowAt = Date.now(),
    messages = 0;
  const helloTimeout = setTimeout(() => {
    if (!playerId) ws.close(4000, 'Please introduce your character');
  }, 15000);
  ws.on('message', (raw) => {
    if (Date.now() - windowAt > 1000) {
      windowAt = Date.now();
      messages = 0;
    }
    if (++messages > 70) return;
    try {
      const message = JSON.parse(raw.toString());
      if (!playerId && message?.type === 'hello') {
        playerId = game.connect(ws, message);
        if (playerId) clearTimeout(helloTimeout);
      } else if (playerId) game.handle(playerId, message);
    } catch {
      /* Malformed messages cannot alter the world. */
    }
  });
  ws.on('error', () => {});
  ws.on('close', () => {
    clearTimeout(helloTimeout);
    if (playerId) game.disconnect(playerId, ws);
  });
});

let saving = false;
async function save() {
  if (saving) return;
  saving = true;
  try {
    await writeFile(path.join(dataDir, 'characters.tmp'), JSON.stringify(game.serialize()));
    await rename(path.join(dataDir, 'characters.tmp'), path.join(dataDir, 'characters.json'));
  } catch (error) {
    console.error('Character save failed:', error.message);
  } finally {
    saving = false;
  }
}
const tickTimer = setInterval(() => game.tick(0.05), 50);
const syncTimer = setInterval(() => game.sync(), 100);
const saveTimer = setInterval(save, 5000);
server.listen(port, '0.0.0.0', () =>
  console.log(
    `Eldervale is ready at http://localhost:${port} (${production ? 'production' : 'development'})`,
  ),
);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(tickTimer);
  clearInterval(syncTimer);
  clearInterval(saveTimer);
  await save();
  for (const client of wss.clients) client.close(1001, 'The realm is restarting');
  await vite?.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
