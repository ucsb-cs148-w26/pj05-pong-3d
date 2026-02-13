import { BoxCollider } from '../../physics/collider.js';
import { RigidBody } from '../../physics/engine.js';
import { BodyForceApplier } from '../../physics/forces.js';
import * as Constants from '../constants.js';
import { GameObjectBase } from './GameObject.js';

/**
 * Abstract base class for paddle objects containing physics logic
 * Subclasses must implement getDirection() to provide movement control
 */
export class PaddleCommon extends GameObjectBase {
	constructor(key, controller, bodyIdentifier, initialX) {
		super(key);
		this.bodyIdentifier = bodyIdentifier;
		this.body = new RigidBody(Constants.STATIC_MASS);
		this.body.ballIdentifier = bodyIdentifier;
		this.body.col = new BoxCollider(
			Constants.PADDLE_THICKNESS,
			Constants.PADDLE_HEIGHT,
			Constants.PADDLE_DEPTH,
			this.body.transform
		);
		this.accel = Constants.PADDLE_ACCEL;
		this.forceApplier = new BodyForceApplier(this.body, (vec) => {});
		this.body.x.assign(initialX, 0, 0);
		this.controller = controller;
	}

	init(scene) {
		this.ball = scene.getGameObject('ball');
		scene.physics.registerForce(this.forceApplier);
	}

	update(dt) {
		const direction = this.controller.getDirection();

		direction.addVec(
			this.body.v.clone().scale(Constants.PADDLE_VELOCITY_DAMPING)
		);

		const speedFactor = this.ball
			? this.ball.speed / Constants.BALL_INITIAL_SPEED
			: 1;
		direction.scale(this.accel * this.body.m * speedFactor);

		this.forceApplier.applier = (f) => {
			f.addVec(direction);
		};

		// Keep paddle within bounds
		if (this.body.x.y > Constants.PADDLE_BOUND)
			this.body.x.y = Constants.PADDLE_BOUND;
		if (this.body.x.y < -Constants.PADDLE_BOUND)
			this.body.x.y = -Constants.PADDLE_BOUND;
		if (this.body.x.z > Constants.PADDLE_BOUND)
			this.body.x.z = Constants.PADDLE_BOUND;
		if (this.body.x.z < -Constants.PADDLE_BOUND)
			this.body.x.z = -Constants.PADDLE_BOUND;
	}

	get bodies() {
		return [this.body];
	}

	get syncedBodies() {
		return [this.body];
	}
}
