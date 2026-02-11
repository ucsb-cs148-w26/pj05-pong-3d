import { SphereCollider } from '../../physics/collider.js';
import { RigidBody } from '../../physics/engine.js';
import * as Constants from '../constants.js';
import { GameObjectBase } from './GameObjectBase.js';

/**
 * Ball containing physics logic and collision detection
 */
export class BallCommon extends GameObjectBase {
	constructor(scores) {
		super();
		this.scores = scores;
		this.needsToReset = false;
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

		this.body.v.assign(Constants.BALL_INITIAL_SPEED, 0, 0);
	}

	/**
	 * Resets the ball to the center with a random direction
	 */
	reset() {
		this.body.x.assign(0, 0, 0);

		let theta = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		const thetaDir = 2 * Math.floor(Math.random() * 2) - 1;

		theta *= thetaDir;

		let phi = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		this.body.v
			.assign(
				Math.sin(theta) * Math.sin(phi),
				Math.cos(phi),
				Math.cos(theta) * Math.sin(phi)
			)
			.scale(Constants.BALL_INITIAL_SPEED);
	}

	/**
	 * Updates ball physics
	 * @param {number} dt Delta time
	 */
	update(dt) {
		this.scores.ballSpeed = this.body.v.norm();

		if (this.needsToReset) {
			this.needsToReset = false;
			this.reset();
		}
	}

	/**
	 * Returns the bodies to be synced with the server
	 * @returns {Array} Array containing the ball body
	 */
	getBodies() {
		return [this.body];
	}
}
