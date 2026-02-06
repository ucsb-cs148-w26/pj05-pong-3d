import { Router } from 'express';
import LobbyState from './lobbyState.js';

console.log('Lobby router file loaded');

export default function createLobbyRouter(server) {
  const router = Router();
  const lobbyState = new LobbyState(server);

  // Cleanup old/expired lobbies every 5 seconds
  setInterval(() => {
    lobbyState.cleanup();
  }, 5000);

  // --- Get all lobbies ---
  router.get('/api/lobbies', (_req, res) => {
    const lobbies = lobbyState.listLobbies();
    console.log('Sending lobby list:', lobbies);
    res.json({ lobbies });
  });

  // --- Create a new lobby ---
  router.post('/api/lobbies', (req, res) => {
    const name = req.body?.name;
    console.log('Create Lobby Request:', name);

    const lobby = lobbyState.createLobby(name);
    console.log('Lobby created:', lobby);

    res.json({ lobby });
  });

  // --- Get a specific lobby by ID ---
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

  // --- Join game page ---
  router.get('/game', (req, res) => {
    const { code, username } = req.query;

    if (!code || !username) {
      return res.sendStatus(400);
    }

    const lobby = lobbyState.getLobbyFromCode(code);
    if (!lobby) {
      return res.status(404).send('Lobby not found');
    }

    if (lobby.members.get(username)) {
      return res.status(400).send('Username is taken');
    }

    // --- NEW: Add user immediately to members ---
    lobby.members.set(username, { clientId: username });
    lobby.emptySince = null; // mark lobby as active

    res.render('game', { code, username });
  });

  return router;
}
