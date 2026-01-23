import express from 'express';
import path from 'path';
import LobbyState from './lobby/lobbyState.js';
import PongSocketServer from './socket.js';
import chatHandler from './chat.js';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, '../public')));

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

app.get('/', (_req, res) => {
	res.redirect('index.html');
});

const server = app.listen(PORT);
const socket = new PongSocketServer(server, '/ws');
socket.addHandler(chatHandler);

export default app;
