import * as Constants from '../../public/game/constants.js';
import { Scene } from '../../public/game/common/Scene.js';
import { ArenaCommon } from '../../public/game/common/ArenaCommon.js';
import { BallCommon } from '../../public/game/common/BallCommon.js';
import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';
import { PaddleController } from './PaddleController.js';

const SYNC_INTERVAL = 5;

export default class ServerScene extends Scene {
	#interval = null;
	#socket = null;
	#ball = null;
	#paddles = [];
	#clientToPaddle = new Map();

	constructor(socket) {
		super();

		this.#socket = socket;

		this.#resetScore();

		// Order matters: Sync with public/main.js
		this.registerGameObject(new ArenaCommon('gameArena'));

		this.#ball = new BallCommon('ball', this.scores);
		this.registerGameObject(this.#ball);

		this.#paddles = [
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
		];

		for (const paddle of this.#paddles) {
			// injected in for simplicity
			paddle.active = false;
		}

		socket.on('client:connect', this.#onConnect.bind(this));
		socket.on('client:disconnect', this.#onDisconnect.bind(this));
		socket.addHandler(this.#socketHandler.bind(this));
	}

	start() {
		let lastTime = performance.now();
		let ct = 0;
		this.#interval = setInterval(() => {
			const now = performance.now();
			const delta = (now - lastTime) / 1000;

			this.step(delta);

			const scoresByClient = {};
			for (const [clientId, paddleIdx] of this.#clientToPaddle) {
				scoresByClient[clientId] = this.scores[paddleIdx];
			}

			if (ct % SYNC_INTERVAL === 0) {
				this.#socket.forEachClient((clientId, ws) => {
					const idx = this.#clientToPaddle.get(clientId);
					const paddle = idx !== undefined ? this.#paddles[idx] : null;
					const ts = paddle?.controller.lastTs ?? 0;
					this.#socket.safeSend(ws, {
						type: 'sync',
						ts,
						active: this.#ball.enabled,
						physics: Array.from(this.physicsDump()),
						scores: scoresByClient
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

	#onConnect(clientId) {
		// TODO: n-player support
		if (this.#clientToPaddle.size >= 2) return;

		for (let i = 0; i < this.#paddles.length; i++) {
			const paddle = this.#paddles[i];
			if (!paddle.active) {
				this.registerGameObject(paddle);
				this.#clientToPaddle.set(clientId, i);
				paddle.active = true;
				break;
			}
		}

		this.#updatePaddles();
	}

	#onDisconnect(clientId) {
		const idx = this.#clientToPaddle.get(clientId);
		if (idx !== undefined) {
			this.#paddles[idx].active = false;
			this.deleteGameObject(this.#paddles[idx].key);
			this.#clientToPaddle.delete(clientId);
		}

		this.#updatePaddles();
	}

	#updatePaddles() {
		// TODO: n-player support
		this.#ball.enabled = this.#clientToPaddle.size === 2;

		this.#socket.forEachClient((clientId, ws) => {
			const paddles = this.#clientToPaddle
				.entries()
				.map(([otherClient, paddleIdx]) => {
					const paddle = this.#paddles[paddleIdx];
					return {
						key: paddle.key,
						remote: clientId !== otherClient,
						pos: [...paddle.body.x.data]
					};
				});

			this.#socket.safeSend(ws, {
				type: 'paddleSync',
				// order must be the same between client and server
				paddles: [...paddles]
			});
		});
	}

	#socketHandler(socket, clientId, ws, msg, respond) {
		if (msg.type === 'move') {
			const idx = this.#clientToPaddle.get(clientId);
			if (idx !== undefined) {
				this.#paddles[idx].controller.enqueueInput(msg);
			}
			return true;
		}
	}

	#resetScore() {
		this.scores = [0, 0];
	}
}
