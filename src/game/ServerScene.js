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

	constructor(socket) {
		super();

		this.#socket = socket;
		this.scores = { WASD: 0, IJKL: 0, ballSpeed: 0 };

		// Order matters: Sync with public/main.js
		this.registerGameObject(
			new ArenaCommon('gameArena'),
			new BallCommon('ball', this.scores),
			// TODO: create on player join
			new PaddleCommon(
				'paddleWASD',
				new PaddleController(),
				'paddle',
				-23.5 / 2.125
			)
		);

		socket.addHandler(this.#socketHandler.bind(this));
	}

	start() {
		let lastTime = performance.now();
		let ct = 0;
		this.#interval = setInterval(() => {
			const now = performance.now();
			const delta = (now - lastTime) / 1000;

			this.step(delta);

			if (ct % SYNC_INTERVAL === 0) {
				this.#socket.forEachClient((clientId, ws) => {
					this.#socket.safeSend(ws, {
						type: 'sync',
						// TODO
						ts: this.getGameObject('paddleWASD').lastTs,
						physics: Array.from(this.physicsDump())
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

	#socketHandler(socket, clientId, ws, msg, respond) {
		if (msg.type === 'move') {
			// TODO
			const paddle = this.getGameObject('paddleWASD');
			paddle.controller.enqueueInput(msg);
			return true;
		}
	}
}
