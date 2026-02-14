import { SphereCollider } from '../../physics/collider.js';
import { RigidBody } from '../../physics/engine.js';
import * as Constants from '../constants.js';
import { GameObjectBase } from './GameObject.js';

/**
 * Ball containing physics logic and collision detection
 */
export class BallCommon extends GameObjectBase {
	constructor(key, scores) {
		super(key);
		this.speed = 0;
		this.scores = scores;
		this.needsToReset = false;
		this.serveDirection = 1; // 1 = right, -1 = left
		this.body = new RigidBody(Constants.BALL_MASS);
		this.body.col = new SphereCollider(
			Constants.BALL_RADIUS,
			this.body.transform,
			(me, other) => {
				if (!Object.hasOwn(other, 'ballIdentifier')) return;

				switch (other.ballIdentifier) {
					case 'paddle': {
						const tinyV = this.body.v
							.clone()
							.normalize()
							.scale(Constants.BALL_TINY_V_SCALE);
						this.body.v.addVec(tinyV);

						const rallySpeed = Math.max(
							this.body.v.norm() + 0.3,
							Constants.BALL_INITIAL_SPEED
						);
						this.body.v.normalize().scale(rallySpeed);

						return;
					}

					case 'greenWall':
						this.scores.IJKL += 1;
						this.needsToReset = true;
						return;

					case 'redWall':
						this.scores.WASD += 1;
						this.needsToReset = true;
						return;
				}
			}
		);

		this.reset();
	}

	update(dt) {
		this.speed = this.body.v.norm();
		this.scores.ballSpeed = this.speed;

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
