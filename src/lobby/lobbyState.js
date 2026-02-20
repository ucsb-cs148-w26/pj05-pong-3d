import PongSocketServer from '../socket.js';
import chatHandler from './chat.js';
import ServerScene from '../game/ServerScene.js';
import {
	GOAL_EXPLOSION_STYLES,
	normalizeGoalExplosionColorId,
	normalizeGoalExplosionStyleValue
} from '../../public/game/shaders/goalExplosionOptions.js';

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

	constructor(server) {
		this.#server = server;

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
			emptySince: Date.now(),
			code: generateCode()
		};

		this.lobbies.set(lobbyId, lobby);
		this.codeToLobby.set(lobby.code, lobby);

		const socket = new PongSocketServer(this.#server, `/lobby/${lobby.code}`);

		socket.on('client:connect', (clientId) => {
			// FIXME: No protection for duplicate name joining
			this.joinLobby(lobbyId, clientId);
			socket.broadcast({
				type: 'chat',
				content: `[System] ${clientId} joined`
			});
		});

		socket.on('client:disconnect', (clientId) => {
			this.leaveLobby(lobbyId, clientId);
			socket.broadcast({
				type: 'chat',
				content: `[System] ${clientId} left`
			});
		});

		socket.addHandler(chatHandler);
		this.sockets.set(lobbyId, socket);

		const scene = new ServerScene(socket, lobby.cosmetics);
		scene.start();
		this.scenes.set(lobbyId, scene);

		return lobby;
	}

	getLobbyFromCode(code) {
		return this.codeToLobby.get(code);
	}

	listLobbies() {
		return Array.from(this.lobbies.values()).map((lobby) => ({
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
		lobby.emptySince = null;
	}

	leaveLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.delete(clientId);

		if (lobby.members.size === 0) {
			lobby.emptySince = Date.now();
		}
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
