import PongSocketServer from '../socket.js';
import chatHandler from './chat.js';
import ServerScene from '../game/ServerScene.js';

let nextLobbyId = 1;
const EMPTY_LOBBY_DELETE_TIME = 60_000;

function generateCode() {
	const length = 5;
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let out = '';

	for (let i = 0; i < length; i++) {
		out += chars[Math.floor(Math.random() * chars.length)];
	}

	return out;
}

export default class LobbyState {
	#server = null;
	#parseSession = null;

	constructor(server, parseSession) {
		this.#server = server;
		this.#parseSession = parseSession;

		this.lobbies = new Map();
		this.scenes = new Map();
		this.codeToLobby = new Map();
		this.sockets = new Map();
	}

	createLobby(arg = undefined) {
		let name = 'My Lobby';
		let isPublic = true;

		if (typeof arg === 'string' || arg === undefined || arg === null) {
			name = arg ?? 'My Lobby';
		} else if (typeof arg === 'object') {
			name = arg.name ?? 'My Lobby';
			if (typeof arg.isPublic === 'boolean') isPublic = arg.isPublic;
		}

		const lobbyId = String(nextLobbyId++);

		const lobby = {
			lobbyId,
			name,
			hostUser: null,
			isPublic,
			members: new Map(),
			emptySince: Date.now(),
			code: generateCode()
		};

		this.lobbies.set(lobbyId, lobby);
		this.codeToLobby.set(lobby.code, lobby);

		const socket = new PongSocketServer(
			this.#server,
			`/lobby/${lobby.code}`,
			this.#parseSession
		);

		socket.on('client:connect', (clientId) => {
			// FIXME: No protection for duplicate name joining
			this.joinLobby(lobbyId, clientId);

			socket.broadcast({
				type: 'chat',
				content: `[System] ${clientId} joined`
			});
			this.broadcastLobbyState(lobbyId);
		});

		socket.on('client:disconnect', (clientId) => {
			this.leaveLobby(lobbyId, clientId);
			socket.broadcast({
				type: 'chat',
				content: `[System] ${clientId} left`
			});
			this.broadcastLobbyState(lobbyId);
		});

		socket.addHandler('chat', chatHandler);
		socket.addHandler('kick', (socketServer, username, ws, msg) =>
			this.kickMember(lobbyId, username, msg?.target)
		);
		socket.addHandler('setLobbyVisibility', (socketServer, username, ws, msg) =>
			this.setLobbyVisibility(lobbyId, username, msg?.isPublic)
		);
		this.sockets.set(lobbyId, socket);

		const scene = new ServerScene(socket);
		scene.start();
		this.scenes.set(lobbyId, scene);

		return lobby;
	}

	getLobbyFromCode(code) {
		return this.codeToLobby.get(code);
	}

	listLobbies({ includePrivate = false } = {}) {
		return Array.from(this.lobbies.values())
			.filter((lobby) => includePrivate || lobby.isPublic)
			.map((lobby) => ({
				lobbyId: lobby.lobbyId,
				name: lobby.name,
				memberCount: lobby.members.size,
				code: lobby.code,
				isPublic: lobby.isPublic
			}));
	}

	joinLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.set(clientId, {
			clientId,
			joinedAt: Date.now()
		});
		if (!lobby.hostUser) lobby.hostUser = clientId;
		this.updateSceneHost(lobbyId);
		lobby.emptySince = null;
	}

	leaveLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.delete(clientId);
		if (lobby.hostUser === clientId) {
			lobby.hostUser = this.pickNextHost(lobbyId, lobby);
		}
		this.updateSceneHost(lobbyId);

		if (lobby.members.size === 0) {
			lobby.emptySince = Date.now();
		}
	}

	pickNextHost(lobbyId, lobby) {
		const scene = this.scenes.get(lobbyId);
		const activePlayers = new Set(scene ? scene.state.players.keys() : []);

		for (const username of lobby.members.keys()) {
			if (activePlayers.has(username)) return username;
		}

		return lobby.members.keys().next().value ?? null;
	}

	broadcastLobbyState(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return;

		const socket = this.sockets.get(lobbyId);
		if (!socket) return;

		socket.broadcast({
			type: 'lobbyState',
			host: lobby.hostUser,
			isPublic: lobby.isPublic,
			members: Array.from(lobby.members.values())
		});
	}

	updateSceneHost(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		const scene = this.scenes.get(lobbyId);
		if (!lobby || !scene) return;
		scene.hostUser = lobby.hostUser;
		scene.updateHostAndPlayers();
	}

	kickMember(lobbyId, requester, target) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return { type: 'error', message: 'Lobby not found' };
		if (lobby.hostUser !== requester)
			return { type: 'error', message: 'Only host can kick players' };
		if (typeof target !== 'string' || !target.trim())
			return { type: 'error', message: 'Invalid kick target' };
		if (target === requester)
			return { type: 'error', message: 'Host cannot kick themselves' };
		if (!lobby.members.has(target))
			return { type: 'error', message: 'Player not found in lobby' };

		const socket = this.sockets.get(lobbyId);
		socket.safeSendToUser(target, {
			type: 'error',
			message: 'You were kicked by the host'
		});
		socket.disconnectUser(target, 4001, 'Kicked by host');
		socket.broadcast({
			type: 'chat',
			content: `[System] ${target} was kicked by ${requester}`
		});
		return { type: 'ok' };
	}

	setLobbyVisibility(lobbyId, requester, isPublic) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return { type: 'error', message: 'Lobby not found' };
		if (lobby.hostUser !== requester)
			return { type: 'error', message: 'Only host can change visibility' };
		if (typeof isPublic !== 'boolean')
			return { type: 'error', message: 'Visibility must be a boolean' };

		lobby.isPublic = isPublic;
		this.broadcastLobbyState(lobbyId);
		return { type: 'ok' };
	}

	cleanup() {
		const now = Date.now();

		for (const [lobbyId, lobby] of this.lobbies.entries()) {
			if (
				lobby.members.size === 0 &&
				lobby.emptySince !== null &&
				now - lobby.emptySince >= EMPTY_LOBBY_DELETE_TIME
			) {
				this.lobbies.delete(lobbyId);
				this.scenes.get(lobbyId).stop();
				this.scenes.delete(lobbyId);
				this.codeToLobby.delete(lobby.code);

				this.sockets.get(lobbyId).stop();
				this.sockets.delete(lobbyId);
			}
		}
	}
}
