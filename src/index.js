import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createLobbyRouter from './lobby/router.js';
import http from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- View engine ----
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ---- Routes ----
app.get('/', (_req, res) => {
  console.log('Rendering lobbies.ejs');
  res.render('lobbies');
});

// Lobby + API routes
app.use(createLobbyRouter(app));

// ---- Static files ----
app.use(express.static(path.join(__dirname, '../public')));

// ---- HTTP + WebSocket server ----
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// In-memory lobby storage
const lobbies = {}; // { code: { members: [] } }

// Upgrade HTTP to WebSocket for /lobby/:code
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith('/lobby/')) {
    socket.destroy();
    return;
  }

  const code = url.pathname.split('/').pop();
  if (!lobbies[code]) lobbies[code] = { members: [] };

  wss.handleUpgrade(req, socket, head, ws => {
    ws.lobbyCode = code;
    ws.username = null;
    lobbies[code].members.push(ws);
    wss.emit('connection', ws);
  });
});

// Handle WebSocket connections
wss.on('connection', ws => {
  ws.on('message', msg => {
    try {
      // Convert buffer to string
      const str = msg.toString('utf8');
      const data = JSON.parse(str);

      // --- Handle join ---
      if (data.type === 'join') {
        ws.username = data.username || 'Player';
        const lobby = lobbies[ws.lobbyCode];
        if (lobby) {
          lobby.members.forEach(member => {
            if (member.readyState === ws.OPEN) {
              member.send(JSON.stringify({
                type: 'chat',
                content: `[System] ${ws.username} joined the lobby`
              }));
            }
          });
        }
        return;
      }

      // --- Broadcast chat messages ---
      if (data.type === 'chat' && data.content?.trim()) {
        const lobby = lobbies[ws.lobbyCode];
        if (lobby) {
          lobby.members.forEach(member => {
            if (member.readyState === ws.OPEN) {
              member.send(JSON.stringify({
                type: 'chat',
                content: `[${ws.username}]: ${data.content}`
              }));
            }
          });
        }
        return;
      }

    } catch (err) {
      console.error('Invalid message:', msg);
    }
  });

  ws.on('close', () => {
    const lobby = lobbies[ws.lobbyCode];
    if (!lobby) return;
    lobby.members = lobby.members.filter(m => m !== ws);

    // Broadcast leave message
    if (ws.username) {
      lobby.members.forEach(member => {
        if (member.readyState === ws.OPEN) {
          member.send(JSON.stringify({
            type: 'chat',
            content: `[System] ${ws.username} left the lobby`
          }));
        }
      });
    }
  });
});

// ---- Start server ----
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
