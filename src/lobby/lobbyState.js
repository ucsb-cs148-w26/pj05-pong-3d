let nextLobbyId = 1;
const EMPTY_LOBBY_DELETE_TIME = 60_000;

export default class LobbyState {
	constructor() {
		this.lobbies = new Map();
		this.clientToLobby = new Map();
	}

	createLobby(name = 'My Lobby') {
		const lobbyId = String(nextLobbyId++);

		const lobby = {
			lobbyId,
			name,
			members: new Map(),
			emptySince: Date.now()
		};

		this.lobbies.set(lobbyId, lobby);
		return lobby;
	}

	listLobbies() {
		return Array.from(this.lobbies.values()).map((lobby) => ({
			lobbyId: lobby.lobbyId,
			name: lobby.name,
			memberCount: lobby.members.size
		}));
	}

	joinLobby(lobbyId, clientId, clientName = 'player') {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		const oldLobbyId = this.clientToLobby.get(clientId);
		if (oldLobbyId && oldLobbyId !== lobbyId) {
			this.leaveLobby(oldLobbyId, clientId);
		}

		lobby.members.set(clientId, {
			clientId,
			name: clientName
		});
		lobby.emptySince = null;
		this.clientToLobby.set(clientId, lobbyId);

		return lobby;
	}

	leaveLobby(lobbyId, clientId) {
		const lobby = this.lobbies.get(lobbyId);
		if (!lobby) {
			throw new Error(`Lobby not found: ${lobbyId}`);
		}

		lobby.members.delete(clientId);
		this.clientToLobby.delete(clientId);

		if (lobby.members.size === 0) {
			lobby.emptySince = Date.now();
		}

		return lobby;
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
			}
		}
	}
}
