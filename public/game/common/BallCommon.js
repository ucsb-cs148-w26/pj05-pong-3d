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
		this.body = new RigidBody(Constants.BALL_MASS);
		this.body.col = new SphereCollider(
			Constants.BALL_RADIUS,
			this.body.transform
		);
	}

	get enabled() {
		return this.#enabled;
	}

	set enabled(enabled) {
		if (this.#enabled == enabled) return;
		this.#enabled = enabled;
	}

	update(dt) {
		if (!this.#enabled) {
			this.body.x.assign(0, 0, 0);
			this.body.v.assign(0, 0, 0);
			return;
		}

		this.speed = this.body.v.norm();
	}

	get bodies() {
		return [this.body];
	}

	get syncedBodies() {
		return [this.body];
	}
}
