import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import LobbyState from './lobby/lobbyState.js';
import PongSocketServer from './socket.js';
import chatHandler from './chat.js';
import setupGoogleAuth from './auth/google.js';
import createLobbyRouter from './lobby/router.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, '../public')));

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: 'lax',
			secure: false // Set true only when using https in production
		}
	})
);

app.use(passport.initialize());
app.use(passport.session());

setupGoogleAuth(app);

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
	res.render('lobbies.ejs');
});

const server = app.listen(PORT);

app.use('/', createLobbyRouter(server));

export default app;
