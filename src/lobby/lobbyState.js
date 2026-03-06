import PongSocketServer from '../socket.js';
import chatHandler from './chat.js';
import ServerScene from '../game/ServerScene.js';

let nextLobbyId = 1;

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

		if (typeof arg === 'string' || arg === undefined || arg === null) {
			name = arg ?? 'My Lobby';
		} else if (typeof arg === 'object') {
			name = arg.name ?? 'My Lobby';
		}

		const lobbyId = String(nextLobbyId++);

		const lobby = {
			lobbyId,
			name,
			members: new Map(),
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
		});

		socket.on('client:disconnect', (clientId) => {
			socket.broadcast({
				type: 'chat',
				content: `[System] ${clientId} left`
			});
			this.leaveLobby(lobbyId, clientId);
		});

		socket.addHandler('chat', chatHandler);
		this.sockets.set(lobbyId, socket);

		const scene = new ServerScene(socket);
		scene.start();
		this.scenes.set(lobbyId, scene);

		return lobby;
	}

	getLobbyFromCode(code) {
		return this.codeToLobby.get(code);
	}

	isLobbyFull(lobby) {
		return lobby.members.size >= 2;
	}

	isLobbyInProgress(lobby) {
		const scene = this.scenes.get(lobby.lobbyId);
		return scene?.isInProgress() === true;
	}

	isLobbyJoinable(lobby) {
		return !this.isLobbyFull(lobby) && !this.isLobbyInProgress(lobby);
	}

	listLobbies() {
		return Array.from(this.lobbies.values())
			.filter((lobby) => this.isLobbyJoinable(lobby))
			.map((lobby) => ({
				lobbyId: lobby.lobbyId,
				name: lobby.name,
				memberCount: lobby.members.size,
				code: lobby.code
			}));
	}

	joinLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.set(clientId, {
			clientId
		});
	}

	deleteLobby(lobbyId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) return;

		const scene = this.scenes.get(lobbyId);
		if (scene) {
			scene.stop();
			this.scenes.delete(lobbyId);
		}

		const socket = this.sockets.get(lobbyId);
		if (socket) {
			socket.stop();
			this.sockets.delete(lobbyId);
		}

		this.codeToLobby.delete(lobby.code);
		this.lobbies.delete(lobbyId);
	}

	leaveLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.delete(clientId);

		if (lobby.members.size === 0) {
			this.deleteLobby(lobbyId);
		}
	}
}
