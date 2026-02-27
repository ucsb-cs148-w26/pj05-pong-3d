import * as Constants from '../../public/game/constants.js';
import { Scene } from '../../public/game/common/Scene.js';
import { ArenaCommon } from '../../public/game/common/ArenaCommon.js';
import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';
import { PaddleController } from './PaddleController.js';
import { GameState, Player } from '../../public/game/common/GameState.js';
import { BallServer } from './BallServer.js';

const SYNC_INTERVAL = 5;

export default class ServerScene extends Scene {
	#interval = null;
	#socket = null;
	#ball = null;

	constructor(socket) {
		super(new GameState());

		this.#socket = socket;
		this.hostUser = null;

		// Order matters: Sync with public/main.js
		this.registerGameObject(new ArenaCommon('gameArena'));

		this.#ball = new BallServer('ball', (ball, wall) => {
			// Hacky. Should probably change later.
			if (wall?.player) wall.player.score += 1;
		});

		this.registerGameObject(this.#ball);

		this.registerGameObject(
			new PaddleCommon(
				'paddle1',
				new PaddleController(),
				'paddle',
				-23.5 / 2.125
			),
			new PaddleCommon(
				'paddle2',
				new PaddleController(),
				'paddle',
				23.5 / 2.125
			)
		);

		socket.on('client:connect', this.#onConnect.bind(this));
		socket.on('client:disconnect', this.#onDisconnect.bind(this));
		socket.addHandler('move', this.#recvMove.bind(this));
		socket.addHandler('start', this.#startGame.bind(this));
	}

	start() {
		let lastTime = performance.now();
		let ct = 0;
		this.#interval = setInterval(() => {
			const now = performance.now();
			const delta = (now - lastTime) / 1000;

			this.step(delta);

			if (ct % SYNC_INTERVAL === 0) {
				const physicsState = this.state.physics.exportState();
				const gatherData = {};
				for (const [username, player] of this.state.players)
					gatherData[username] = player.score;

				this.#socket.forEachClient((username, ws) => {
					const player = this.state.players.get(username);
					const ack = player?.paddle?.controller?.ack ?? -1;

					this.#socket.safeSend(ws, {
						type: 'sync',
						ack,
						active: this.#ball.enabled,
						physics: physicsState,
						gameInfo: gatherData
					});
				});
			}

			lastTime = now;
			ct++;
		}, 1000 / Constants.SIMULATION_RATE);
	}

	stop() {
		if (this.#interval) clearInterval(this.#interval);
		this.#interval = null;
	}

	#onConnect(username) {
		this.#assignPlayer(username);
		this.#updatePaddles();
	}

	#onDisconnect(username) {
		const leavingPlayer = this.state.players.get(username);
		if (leavingPlayer) {
			const arena = this.getGameObject('gameArena');
			if (leavingPlayer.paddle.body.x.x < 0) arena.bodies[4].player = null;
			else arena.bodies[5].player = null;
			this.state.players.delete(username);
			this.#ball.enabled = false;
		}

		if (this.hostUser === username) {
			this.hostUser = this.state.players.keys().next().value ?? null;
		}

		// Fill vacant player slots from connected lobby members in join order.
		for (const candidate of this.#socket.listConnectedUsernames()) {
			if (this.state.players.size >= 2) break;
			this.#assignPlayer(candidate);
		}

		this.#updatePaddles();
	}

	updateHostAndPlayers() {
		this.#updatePaddles();
	}

	#updatePaddles() {
		// TODO: n-player support

		const players = Array.from(this.state.players.entries()).map(
			([username, player]) => {
				const paddle = player.paddle;
				return {
					key: paddle.key,
					username,
					pos: [...paddle.body.x.data]
				};
			}
		);

		this.#socket.forEachClient((thisUsername, ws) => {
			this.#socket.safeSend(ws, {
				type: 'playerSync',
				// order must be the same between client and server
				players: players.map((player) => ({
					...player,
					remote: thisUsername !== player.username
				})),
				host: this.hostUser,
				username: thisUsername
			});
		});
	}

	#startGame(socket, username, ws, msg) {
		if (username !== this.hostUser)
			return { type: 'error', message: 'bruh u not the host' };
		if (this.state.players.size < 2)
			return {
				type: 'error',
				message: 'bruh we gotta wait for another person'
			};
		this.#ball.enabled = true;
	}

	#recvMove(socket, username, ws, msg) {
		this.state.players.get(username)?.paddle.controller.enqueueInput(msg);
	}

	#assignPlayer(username) {
		if (this.state.players.has(username)) return false;
		if (this.state.players.size >= 2) return false;

		const usedPaddles = new Set(
			Array.from(this.state.players.values()).map((player) => player.paddle.key)
		);
		const paddleKey = ['paddle1', 'paddle2'].find((key) => !usedPaddles.has(key));
		if (!paddleKey) return false;

		const myPaddle = this.getGameObject(paddleKey);
		const thisPlayer = new Player(username, myPaddle);
		this.state.players.set(username, thisPlayer);
		const arena = this.getGameObject('gameArena');

		if (myPaddle.body.x.x < 0) arena.bodies[4].player = thisPlayer;
		else arena.bodies[5].player = thisPlayer;

		if (this.hostUser === null) this.hostUser = username;
		return true;
	}
}
