import { Router } from 'express';
import LobbyState from './lobbyState.js';

export default function createLobbyRouter(server) {
	const router = Router();
	const lobbyState = new LobbyState(server);

	setInterval(() => {
		lobbyState.cleanup();
	}, 5000);

	router.get('/api/lobbies', (_req, res) => {
		res.json({ lobbies: lobbyState.listLobbies() });
	});

	router.post('/api/lobbies', (req, res) => {
		const name = req.body?.name;
		const lobby = lobbyState.createLobby(name);
		res.json({ lobby });
	});

	router.get('/api/lobbies/:lobbyId', (req, res) => {
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

	router.get('/game', (req, res) => {
		const { code, username } = req.query;

		if (!code || !code.length || !username || !username.length) {
			return res.sendStatus(400);
		}

		const lobby = lobbyState.getLobbyFromCode(code);
		if (!lobby) {
			return res.status(404).send('Lobby not found');
		}

		if (lobby.members.get(username)) {
			return res.status(400).send('Username is taken');
		}

		res.render('game', { code, username });
	});

	return router;
}
