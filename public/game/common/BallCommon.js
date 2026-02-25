import { SphereCollider } from '../../physics/collider.js';
import { RigidBody } from '../../physics/engine.js';
import * as Constants from '../constants.js';
import { GameObjectBase } from './GameObject.js';

/**
 * Ball containing physics logic and collision detection
 */
export class BallCommon extends GameObjectBase {
	#enabled = false;

	constructor(key) {
		super(key);
		this.speed = 0;
		this.needsToReset = false;
		this.serveDirection = 1; // 1 = right, -1 = left
		this.body = new RigidBody(Constants.BALL_MASS);
		this.body.col = new SphereCollider(
			Constants.BALL_RADIUS,
			this.body.transform
		);

		this.reset();
	}

	get enabled() {
		return this.#enabled;
	}

	set enabled(enabled) {
		if (this.#enabled == enabled) return;

		this.#enabled = enabled;
		if (enabled) this.reset();
	}

	update(dt) {
		if (!this.#enabled) {
			this.body.x.assign(0, 0, 0);
			this.body.v.assign(0, 0, 0);
			return;
		}

		this.speed = this.body.v.norm();

		if (this.needsToReset) {
			this.needsToReset = false;
			this.reset();
		}
	}

	get bodies() {
		return [this.body];
	}

	get syncedBodies() {
		return [this.body];
	}

	reset() {
		this.body.x.assign(0, 0, 0);

		let theta = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		let phi = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		this.body.v
			.assign(
				Math.sin(theta) * Math.sin(phi) * this.serveDirection,
				Math.cos(phi),
				Math.cos(theta) * Math.sin(phi)
			)
			.scale(Constants.BALL_INITIAL_SPEED);
		this.serveDirection *= -1;
	}
}
