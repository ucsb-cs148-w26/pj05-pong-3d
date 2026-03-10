import { BallCommon } from '../../public/game/common/BallCommon.js';
import * as Constants from '../../public/game/constants.js';

export class BallServer extends BallCommon {
	#server = null;
	#serveDirection = null;

	constructor(key, hitWallCallback) {
		super(key);

		this.body.col.onCollisionCallback = (me, other) => {
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
					hitWallCallback(me, other);
					return;

				case 'redWall':
					hitWallCallback(me, other);
					return;
			}
		};
	}

	update(dt) {
		if (this.#server) {
			const [x, y, z] = this.#server.paddle.body.x;
			this.body.x.assign(x + this.#serveDirection, y, z);
			this.body.v.assign(...this.#server.paddle.body.v);
			this.speed = this.body.v.norm();
			return;
		}

		super.update(dt);
	}

	setServer(playerObj) {
		if (playerObj)
			this.#serveDirection = playerObj.paddle.body.x.x < 0 ? 1 : -1;
		this.#server = playerObj;
	}

	serve() {
		const [_, vy, vz] = this.#server.paddle.body.v;
		this.body.v
			.assign(
				(this.#serveDirection * Constants.BALL_INITIAL_SPEED) / 1.5,
				vy,
				vz
			)
			.normalize()
			.scale(Constants.BALL_INITIAL_SPEED);
	}
}
