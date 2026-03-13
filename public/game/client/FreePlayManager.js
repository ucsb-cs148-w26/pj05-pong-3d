import * as Constants from '../constants.js';
import { FreePlayAIController } from './FreePlayAIController.js';

const FREE_PLAY_SERVE_VARIATION = 0.7;

export class FreePlayManager {
	#scene = null;
	#ball = null;
	#pendingServe = null;

	constructor(scene, ball) {
		this.#scene = scene;
		this.#ball = ball;
		this.active = false;
		this.gameCancelled = false;
	}

	update() {
		if (!this.active || this.#pendingServe === null) return;

		this.#serve(this.#pendingServe);
		this.#pendingServe = null;
	}

	syncPlayers() {
		this.gameCancelled = false;

		if (this.#shouldBeActive()) {
			this.#start();
			return;
		}

		this.#stop();
	}

	queueServe(wallIdentifier) {
		if (!this.active) return;
		if (wallIdentifier !== 'greenWall' && wallIdentifier !== 'redWall') return;
		if (this.#pendingServe !== null) return;

		this.#pendingServe = wallIdentifier;
		this.#ball.enabled = false;
	}

	cancelGame() {
		this.#stop();
		this.gameCancelled = true;
	}

	shouldIgnoreServerSync() {
		return this.active;
	}

	#shouldBeActive() {
		return (
			this.#scene.state.players.size === 1 &&
			this.#getLocalPlayer() !== null &&
			this.#scene.matchStarted !== true &&
			this.#scene.gameOver === null &&
			this.gameCancelled !== true
		);
	}

	#start() {
		if (this.active) return;

		const aiPaddle = this.#getAiPaddle();
		if (!aiPaddle) return;

		aiPaddle.controller?.destroy?.();
		aiPaddle.controller = new FreePlayAIController(aiPaddle, this.#ball);

		this.active = true;
		this.#pendingServe = Math.random() < 0.5 ? 'greenWall' : 'redWall';
		this.#ball.enabled = false;
		this.#scene.respawnEndsAt = null;
		this.#scene.respawnScorer = null;
	}

	#stop() {
		if (!this.active && this.#pendingServe === null) return;

		const aiPaddle = this.#getAiPaddle();
		if (aiPaddle?.controller instanceof FreePlayAIController) {
			aiPaddle.controller.destroy();
			aiPaddle.controller = null;
		}

		this.active = false;
		this.#pendingServe = null;
		this.#ball.enabled = false;
		this.#ball.body.x.assign(0, 0, 0);
		this.#ball.body.v.assign(0, 0, 0);
	}

	#serve(wallIdentifier) {
		const servePaddle = this.#getPaddleByWall(wallIdentifier);
		if (!servePaddle) return;

		const serveDirection = servePaddle.body.x.x < 0 ? 1 : -1;
		const lateralY = (Math.random() - 0.5) * FREE_PLAY_SERVE_VARIATION;
		const lateralZ = (Math.random() - 0.5) * FREE_PLAY_SERVE_VARIATION;

		this.#ball.enabled = true;
		this.#ball.body.x.assign(
			servePaddle.body.x.x + serveDirection,
			servePaddle.body.x.y,
			servePaddle.body.x.z
		);
		this.#ball.body.v
			.assign(
				(serveDirection * Constants.BALL_INITIAL_SPEED) / 1.5,
				servePaddle.body.v.y + lateralY,
				servePaddle.body.v.z + lateralZ
			)
			.normalize()
			.scale(Constants.BALL_INITIAL_SPEED);
	}

	#getLocalPlayer() {
		return this.#scene.state.players.get(this.#scene.username) ?? null;
	}

	#getPaddles() {
		return ['paddle1', 'paddle2']
			.map((key) => this.#scene.getGameObject(key))
			.filter(Boolean);
	}

	#getAiPaddle() {
		const localPaddle = this.#getLocalPlayer()?.paddle ?? null;
		return this.#getPaddles().find((paddle) => paddle !== localPaddle) ?? null;
	}

	#getPaddleByWall(wallIdentifier) {
		const xSign = wallIdentifier === 'greenWall' ? -1 : 1;
		return (
			this.#getPaddles().find(
				(paddle) => Math.sign(paddle?.body?.x?.x ?? 0) === xSign
			) ?? null
		);
	}
}
