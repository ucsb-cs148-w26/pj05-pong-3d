import express from 'express';
import LobbyState from './lobby/lobbyState.js';

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

app.listen(PORT, () => {
	console.log(`HTTP http://localhost:${PORT}`);
});

export default app;
