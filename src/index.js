import express from 'express';
import { WebSocketServer } from 'ws';
import LobbyState from './lobby/lobbyState.js';

console.log('RUNNING FILE:', new URL(import.meta.url).pathname);
console.log('PID:', process.pid);

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// Include below if not using Vercel
// app.use(express.static("public"));

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

	broadcastLobby(lobbyId, { type: 'chat', lobbyId, msg });

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

function broadcastLobby(lobbyId, obj) {
	const lobby = lobbyState.lobbies.get(lobbyId);
	if (!lobby) return;

	for (const member of lobby.members.values()) {
		const ws = wsByClientId.get(member.clientId);
		if (ws) safeSend(ws, obj);
	}
}

const server = app.listen(PORT, () => {
	console.log(`HTTP http://localhost:${PORT}`);
	console.log(`WS   ws://localhost:${PORT}/ws`);
});

console.log('Upgrade listeners BEFORE ws:', server.listenerCount('upgrade'));

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
	console.log('UPGRADE HIT:', req.url);

	const { pathname } = new URL(req.url, 'http://localhost');

	if (pathname !== '/ws') {
		socket.destroy();
		return;
	}

	wss.handleUpgrade(req, socket, head, (ws) => {
		wss.emit('connection', ws, req);
	});
});

console.log('Upgrade listeners AFTER ws:', server.listenerCount('upgrade'));

wss.on('connection', (ws, req) => {
	const url = new URL(req.url, 'http://localhost');
	const clientId = url.searchParams.get('clientId') || 'unknown';

	wsByClientId.set(clientId, ws);

	safeSend(ws, { type: 'connected', clientId });

	ws.on('message', (raw) => {
		const text = raw.toString();

		let msg = null;
		try {
			msg = JSON.parse(text);
		} catch {
			safeSend(ws, { type: 'echo', data: text });
			return;
		}

		if (!msg?.type) {
			safeSend(ws, { type: 'error', message: 'Missing message type' });
			return;
		}

		if (msg.type === 'join') {
			const lobbyId = String(msg.lobbyId || '');
			const name = (msg.name || 'player').toString();

			if (!lobbyId) {
				safeSend(ws, { type: 'join_error', message: 'Missing lobbyId' });
				return;
			}

			try {
				const lobby = lobbyState.joinLobby(lobbyId, clientId, name);
				safeSend(ws, { type: 'join_ok', lobbyId: lobby.lobbyId });

				broadcastLobby(lobbyId, {
					type: 'lobby_update',
					lobbyId,
					members: Array.from(lobby.members.values())
				});
			} catch (err) {
				safeSend(ws, { type: 'join_error', message: err.message });
			}
			return;
		}

		if (msg.type === 'leave') {
			const lobbyId = String(msg.lobbyId || '');
			if (!lobbyId) {
				safeSend(ws, { type: 'leave_error', message: 'Missing lobbyId' });
				return;
			}

			try {
				const lobby = lobbyState.leaveLobby(lobbyId, clientId);
				safeSend(ws, { type: 'leave_ok', lobbyId: lobby.lobbyId });

				broadcastLobby(lobbyId, {
					type: 'lobby_update',
					lobbyId,
					members: Array.from(lobby.members.values())
				});
			} catch (err) {
				safeSend(ws, { type: 'leave_error', message: err.message });
			}
			return;
		}

		if (msg.type === 'chat') {
			const lobbyId = String(msg.lobbyId || '');
			const chatText = (msg.text || '').toString();

			const lobby = lobbyState.lobbies.get(lobbyId);
			if (!lobby) {
				safeSend(ws, { type: 'error', message: 'Lobby not found' });
				return;
			}
			if (!lobby.members.has(clientId)) {
				safeSend(ws, { type: 'error', message: 'Not a member of that lobby' });
				return;
			}
			if (!chatText.trim()) {
				safeSend(ws, { type: 'error', message: 'Empty message' });
				return;
			}

			if (!lobby.chat) lobby.chat = [];
			const chatMsg = { clientId, text: chatText, ts: Date.now() };
			lobby.chat.push(chatMsg);
			if (lobby.chat.length > 50) lobby.chat.shift();

			broadcastLobby(lobbyId, { type: 'chat', lobbyId, msg: chatMsg });
			safeSend(ws, { type: 'chat_ok' });
			return;
		}

		safeSend(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
	});

	ws.on('close', () => {
		wsByClientId.delete(clientId);
	});
});

export default app;
