import * as Constants from '../../public/game/constants.js';
import { Scene } from '../../public/game/common/Scene.js';
import { ArenaCommon } from '../../public/game/common/ArenaCommon.js';
import { BallCommon } from '../../public/game/common/BallCommon.js';
import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';
import { PaddleController } from './PaddleController.js';
import { GameState, Player } from '../../public/game/common/GameState.js';

const SYNC_INTERVAL = 5;

export default class ServerScene extends Scene {
	#interval = null;
	#socket = null;
	#ball = null;

	constructor(socket) {
		super(new GameState());

		this.#socket = socket;

		// Order matters: Sync with public/main.js
		this.registerGameObject(new ArenaCommon('gameArena'));

		this.#ball = new BallCommon('ball');
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
		socket.addHandler('move', this.#socketHandler.bind(this));
	}

	start() {
		let lastTime = performance.now();
		let ct = 0;
		this.#interval = setInterval(() => {
			const now = performance.now();
			const delta = (now - lastTime) / 1000;

			this.step(delta);

			if (ct % SYNC_INTERVAL === 0) {
				this.#socket.forEachClient((username, ws) => {
					const ts = this.state.players.get(username)?.paddle?.controller.lastTs ?? 0;
					this.#socket.safeSend(ws, {
						type: 'sync',
						ts,
						active: this.#ball.enabled,
						physics: Array.from(this.physicsDump()),
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
		// TODO: n-player support
		if (this.state.players.size >= 2) return;
		const pid = this.state.players.size;
		this.state.players.set(username, new Player(username,  this.getGameObject(`paddle${pid + 1}`) ));

		this.#updatePaddles();
	}

	#onDisconnect(username) {
		// TODO:
		// Currently we have two-hardcoded paddles. First to join gets paddle1, second to join gets paddle2.
		// Adding reconnect logic is not necessary since it would just require tracking which is "open" which won't be needed in the future.
		// Hence reconnect is disabled for now.

		console.warn('Reconnect disabled right now; see ServerScene.#onDisconnect');
	}

	#updatePaddles() {
		// TODO: n-player support
		this.#ball.enabled = this.state.players.size === 2;

		const scores = {};
		for ( const [username, player] of this.state.players ) scores[username] = player.score;

		this.#socket.forEachClient((thisUsername, ws) => {
			const players = this.state.players
				.entries()
				.map(([username, player]) => {
					const paddle = player.paddle;
					return {
						key: paddle.key,
						username: username,
						remote: thisUsername !== username,
						pos: [...paddle.body.x.data]
					};
				});

			this.#socket.safeSend(ws, {
				type: 'playerSync',
				// order must be the same between client and server
				players: [...players]
			});
		});
	}

	#socketHandler(socket, username, ws, msg, respond) {
		this.state.players.get(username)?.paddle.controller.enqueueInput(msg);
	}

}
