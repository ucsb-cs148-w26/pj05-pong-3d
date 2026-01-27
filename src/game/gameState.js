import { PhysicsEngine, RigidBody } from '../../public/physics/engine.js';
import { BoxCollider, SphereCollider } from '../../public/physics/collider.js';
import { Vec3 } from '../../public/physics/math.js';

const ARENA_X = 6;
const ARENA_Y = 4;
const ARENA_Z = 14;
const PADDLE_SIZE = 2;
const PADDLE_DEPTH = 0.4;
const PADDLE_SPEED = 10;

const BALL_RADIUS = 0.5;
const BALL_SPEED = new Vec3(4, 3, -8);

function cloneVec3(v) {
	return { x: v.x, y: v.y, z: v.z };
}

export default class GameState {
	constructor() {
		this.engine = new PhysicsEngine();
		this.players = new Map();
		this.inputs = new Map();
		this.spawnIndex = 0;

		this.ball = this.#createBall();
		this.ball.v = BALL_SPEED.clone();
	}

	addPlayer(clientId) {
		if (this.players.has(clientId)) return;

		const paddle = this.#createPaddle();
		const z = this.spawnIndex % 2 === 0 ? -10 : 10;
		this.spawnIndex += 1;
		paddle.x = new Vec3(0, 0, z);

		this.players.set(clientId, paddle);
	}

	removePlayer(clientId) {
		const paddle = this.players.get(clientId);
		if (!paddle) return;

		this.engine.removeBody(paddle);
		this.engine.removeCollider(paddle.col);
		this.players.delete(clientId);
		this.inputs.delete(clientId);
	}

	applyInput(clientId, input) {
		if (!this.players.has(clientId)) return;
		this.inputs.set(clientId, input ?? {});
	}

	step(dt) {
		for (const [clientId, paddle] of this.players.entries()) {
			const input = this.inputs.get(clientId) ?? {};
			const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
			const moveY = (input.up ? 1 : 0) - (input.down ? 1 : 0);

			paddle.v = new Vec3(moveX * PADDLE_SPEED, moveY * PADDLE_SPEED, 0);
		}

		this.engine.step(dt);

		for (const paddle of this.players.values()) {
			paddle.x.x = Math.max(
				-ARENA_X + PADDLE_SIZE / 2,
				Math.min(ARENA_X - PADDLE_SIZE / 2, paddle.x.x)
			);
			paddle.x.y = Math.max(
				-ARENA_Y + PADDLE_SIZE / 2,
				Math.min(ARENA_Y - PADDLE_SIZE / 2, paddle.x.y)
			);
		}

		if (Math.abs(this.ball.x.x) > ARENA_X) this.ball.v.x *= -1;
		if (Math.abs(this.ball.x.y) > ARENA_Y) this.ball.v.y *= -1;

		if (this.ball.x.z < -ARENA_Z || this.ball.x.z > ARENA_Z) {
			this.ball.x = new Vec3();
			this.ball.v.z *= -1;
		}
	}

	getSnapshot() {
		return {
			ball: {
				pos: cloneVec3(this.ball.x),
				vel: cloneVec3(this.ball.v)
			},
			paddles: Array.from(this.players.entries()).map(([clientId, paddle]) => ({
				clientId,
				pos: cloneVec3(paddle.x)
			}))
		};
	}

	#createBall() {
		const body = new RigidBody(1, new SphereCollider(new Vec3(), BALL_RADIUS));
		this.engine.registerBody(body);
		this.engine.registerCollider(body.col);
		return body;
	}

	#createPaddle() {
		const body = new RigidBody(
			999,
			new BoxCollider(new Vec3(), PADDLE_SIZE, PADDLE_SIZE, PADDLE_DEPTH)
		);
		this.engine.registerBody(body);
		this.engine.registerCollider(body.col);
		return body;
	}
}
