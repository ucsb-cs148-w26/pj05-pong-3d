import PongSocketServer from '../socket.js';
import chatHandler from './chat.js';

let nextLobbyId = 1;
const EMPTY_LOBBY_DELETE_TIME = 60_000; // 1 minute

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

    this.lobbies = new Map(); // lobbyId -> lobby
    this.codeToLobby = new Map(); // code -> lobby
    this.sockets = new Map(); // lobbyId -> PongSocketServer instance
  }

  createLobby(name = 'My Lobby') {
    const lobbyId = String(nextLobbyId++);
    const code = generateCode();

    const lobby = {
      lobbyId,
      name,
      members: new Map(),
      emptySince: Date.now(),
      code
    };

    this.lobbies.set(lobbyId, lobby);
    this.codeToLobby.set(code, lobby);

    const socket = new PongSocketServer(this.#server, `/lobby/${code}`);
    this.sockets.set(lobbyId, socket);

    console.log(`Lobby created: ${name} (code: ${code})`);

    // --- Socket events ---
    socket.on('client:connect', (clientId) => {
      console.log(`Client connected: ${clientId} to lobby ${code}`);
      this.joinLobby(lobbyId, clientId);

      // Notify everyone in lobby
      socket.broadcast({
        type: 'chat',
        content: `[System] ${clientId} joined the lobby`
      });

      // Debug: print member count
      console.log(`Members in lobby ${code}: ${lobby.members.size}`);
    });

    socket.on('client:disconnect', (clientId) => {
      console.log(`Client disconnected: ${clientId} from lobby ${code}`);
      this.leaveLobby(lobbyId, clientId);

      socket.broadcast({
        type: 'chat',
        content: `[System] ${clientId} left the lobby`
      });

      console.log(`Members left in lobby ${code}: ${lobby.members.size}`);
    });

    socket.addHandler(chatHandler);

    return lobby;
  }

  getLobbyFromCode(code) {
    return this.codeToLobby.get(code);
  }

  listLobbies() {
    return Array.from(this.lobbies.values()).map((lobby) => ({
      lobbyId: lobby.lobbyId,
      name: lobby.name,
      code: lobby.code,
      memberCount: lobby.members.size
    }));
  }

  joinLobby(lobbyId, clientId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`joinLobby: Lobby not found: ${lobbyId}`);
      return;
    }

    if (!lobby.members.has(clientId)) {
      lobby.members.set(clientId, { clientId });
      lobby.emptySince = null;
      console.log(`joinLobby: ${clientId} added to lobby ${lobby.code}`);
    }
  }

  leaveLobby(lobbyId, clientId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      console.error(`leaveLobby: Lobby not found: ${lobbyId}`);
      return;
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
        console.log(`Deleting empty lobby: ${lobby.name} (code: ${lobby.code})`);
        this.lobbies.delete(lobbyId);
        this.codeToLobby.delete(lobby.code);

        const socket = this.sockets.get(lobbyId);
        if (socket) {
          socket.stop();
          this.sockets.delete(lobbyId);
        }
      }
    }
  }
}
