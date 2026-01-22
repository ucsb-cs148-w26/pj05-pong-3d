import express from 'express';
import { WebSocketServer } from 'ws';
import LobbyState from './lobby/lobbyState.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.use(express.static('public'));

const lobbyState = new LobbyState();

setInterval(() => {
	lobbyState.cleanup();
}, 5000);

let nextClientId = 1;
function getClientId(req, res) {
	let clientId = req.header('x-client-id');
	if (!clientId) {
		clientId = String(nextClientId++);
		res.setHeader('x-client-id', clientId);
	}
	return clientId;
}

app.get('/api/lobbies', (_req, res) => {
	res.json({ lobbies: lobbyState.listLobbies() });
});

app.post('/api/lobbies', (req, res) => {
	const name = req.body?.name;
	const lobby = lobbyState.createLobby(name);
	res.json({ lobbyId: lobby.lobbyId });
});

app.post('/api/lobbies/:lobbyId/join', (req, res) => {
	const clientId = getClientId(req, res);
	const lobbyId = req.params.lobbyId;
	const name = req.body?.name || 'player';

	try {
		const lobby = lobbyState.joinLobby(lobbyId, clientId, name);
		res.json({ ok: true, lobbyId: lobby.lobbyId });
	} catch (err) {
		res.status(404).json({ ok: false, message: err.message });
	}
});

app.post('/api/lobbies/:lobbyId/leave', (req, res) => {
	const clientId = getClientId(req, res);
	const lobbyId = req.params.lobbyId;

	try {
		const lobby = lobbyState.leaveLobby(lobbyId, clientId);
		res.json({ ok: true, lobbyId: lobby.lobbyId });
	} catch (err) {
		res.status(404).json({ ok: false, message: err.message });
	}
});

app.get('/api/lobbies/:lobbyId', (req, res) => {
	const lobbyId = req.params.lobbyId;
	const lobby = lobbyState.lobbies.get(lobbyId);

	if (!lobby) {
		res.status(404).json({ ok: false, message: 'Lobby not found' });
		return;
	}

	res.json({
		ok: true,
		lobby: {
			lobbyId: lobby.lobbyId,
			name: lobby.name,
			memberCount: lobby.members.size,
			members: Array.from(lobby.members.values())
		}
	});
});

app.post('/api/lobbies/:lobbyId/chat', (req, res) => {
	const clientId = getClientId(req, res);
	const lobbyId = req.params.lobbyId;
	const text = (req.body?.text || '').toString();

	const lobby = lobbyState.lobbies.get(lobbyId);
	if (!lobby) {
		res.status(404).json({ ok: false, message: 'Lobby not found' });
		return;
	}
	if (!lobby.members.has(clientId)) {
		res.status(403).json({ ok: false, message: 'Not a member of that lobby' });
		return;
	}
	if (!text.trim()) {
		res.status(400).json({ ok: false, message: 'Empty message' });
		return;
	}

	if (!lobby.chat) lobby.chat = [];
	const msg = { clientId, text, ts: Date.now() };
	lobby.chat.push(msg);
	if (lobby.chat.length > 50) lobby.chat.shift();

	res.json({ ok: true });
});

app.get('/api/lobbies/:lobbyId/chat', (req, res) => {
	const lobbyId = req.params.lobbyId;
	const lobby = lobbyState.lobbies.get(lobbyId);

	if (!lobby) {
		res.status(404).json({ ok: false, message: 'Lobby not found' });
		return;
	}

	const since = Number(req.query.since || 0);
	const chat = (lobby.chat || []).filter((m) => m.ts > since);

	res.json({ ok: true, chat });
});

app.get('/', (_req, res) => {
	res.redirect('index.html');
});

app.get('/hello', (_req, res) => {
	res.send('hello world from express');
});

const wsByClientId = new Map();

function safeSend(ws, obj) {
	if (ws.readyState !== ws.OPEN) return;
	ws.send(JSON.stringify(obj));
}

const server = app.listen(PORT);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
	const { pathname } = new URL(req.url, 'http://localhost');

	if (pathname !== '/ws') {
		socket.destroy();
		return;
	}

	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
});


wss.on('connection', (ws, req) => {
	const url = new URL(req.url, 'http://localhost');
	const clientId = url.searchParams.get('clientId') || String(nextClientId++);

	wsByClientId.set(clientId, ws);

	safeSend(ws, { type: 'connected', clientId });

	ws.on('message', (raw) => {
		const text = raw.toString();

		let msg = null;
		try {
			msg = JSON.parse(text);
		} catch {
			safeSend(ws, { type: 'error', message: 'Invalid JSON' });
			return;
		}

		if (!msg?.type) {
			safeSend(ws, { type: 'error', message: 'Missing message type' });
			return;
		}

		if (msg.type === 'ping') {
			safeSend(ws, { type: 'pong', ts: Date.now() });
			return;
		}

		if (msg.type === 'game_join') {
			const gameId = String(msg.gameId || '');
			if (!gameId) {
				safeSend(ws, { type: 'game_join_error', message: 'Missing gameId' });
				return;
			}
			safeSend(ws, { type: 'game_join_ok', gameId });
			return;
		}

		if (msg.type === 'input') {
			safeSend(ws, { type: 'input_ok', ts: Date.now() });
			return;
		}

		safeSend(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
	});

	ws.on('close', () => {
		wsByClientId.delete(clientId);
	});
});

export default app;
