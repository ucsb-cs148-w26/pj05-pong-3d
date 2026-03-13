import * as Constants from '../constants.js';
import { Vec3 } from '../../physics/math.js';

const FREE_PLAY_AI_DEAD_ZONE = 0.12;
const FREE_PLAY_AI_LOOKAHEAD = 0.9;
const FREE_PLAY_AI_RECENTER = 0.3;

export class FreePlayAIController {
	constructor(paddle, ball) {
		this.paddle = paddle;
		this.ball = ball;
	}

	getDirection() {
		if (!this.paddle?.body || !this.ball?.body || !this.ball.enabled) {
			return this.#moveToward(0, 0);
		}

		const paddleX = this.paddle.body.x.x;
		const ballVelocityX = this.ball.body.v.x;
		const isBallApproaching =
			(paddleX < 0 && ballVelocityX < 0) || (paddleX > 0 && ballVelocityX > 0);

		if (!isBallApproaching) {
			return this.#moveToward(
				this.ball.body.x.y * FREE_PLAY_AI_RECENTER,
				this.ball.body.x.z * FREE_PLAY_AI_RECENTER
			);
		}

		const distanceX = Math.abs(paddleX - this.ball.body.x.x);
		const travelTime =
			distanceX /
			Math.max(Math.abs(ballVelocityX), Constants.BALL_INITIAL_SPEED);
		const targetY = this.#clampToBounds(
			this.ball.body.x.y +
				this.ball.body.v.y * travelTime * FREE_PLAY_AI_LOOKAHEAD
		);
		const targetZ = this.#clampToBounds(
			this.ball.body.x.z +
				this.ball.body.v.z * travelTime * FREE_PLAY_AI_LOOKAHEAD
		);

		return this.#moveToward(targetY, targetZ);
	}

	destroy() {}

	#moveToward(targetY, targetZ) {
		const direction = new Vec3(
			0,
			targetY - this.paddle.body.x.y,
			targetZ - this.paddle.body.x.z
		);
		const distance = direction.norm();
		if (distance <= FREE_PLAY_AI_DEAD_ZONE) return new Vec3();
		return direction.scale(1 / Math.max(distance, 1));
	}

	#clampToBounds(value) {
		return Math.min(
			Math.max(value, -Constants.PADDLE_BOUND),
			Constants.PADDLE_BOUND
		);
	}
}
