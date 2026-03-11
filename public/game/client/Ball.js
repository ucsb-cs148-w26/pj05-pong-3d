import * as THREE from 'three';
import { BallCommon } from '../common/BallCommon.js';
import { BALL_SKIN_CONFIGS, BallSkin } from '../shaders/ballSkin.js';

/**
 * Client-side Ball with THREE.js rendering
 * Extends BallCommon to add visual representation
 */
export class Ball extends BallCommon {
	#visual = null;
	#skin = null;
	#goalSpawner = null;
	scene = null;

	constructor(key, spawner) {
		super(key);

		this.cosmetics = null;
		this.#skin = new BallSkin();
		this.#visual = this.#skin.visual;
		this.#goalSpawner = spawner;

		this.body.col.onCollisionCallback = ((me, other) => {
			const identifier = other.ballIdentifier;
			if (
				identifier === undefined ||
				(identifier !== 'greenWall' && identifier !== 'redWall')
			)
				return;

			const pos = me.x;
			this.#goalSpawner.triggerGoalAnimation(
				parseInt(
					this.cosmetics[identifier === 'greenWall' ? 'redWall' : 'greenWall']
						.goal_explosion_key
				),
				null,
				new THREE.Vector3(pos.x, pos.y, pos.z)
			);

			this.setSkinStyle(parseInt(this.cosmetics[identifier].ball_skin_key));

			if (!this.scene?.isReplaying) {
				this.scene.getGameObject('cameraController')?.addShake(0.5, 1000);
			}
		}).bind(this);
	}

	init(scene) {
		this.scene = scene;
	}

	update(dt) {
		super.update(dt);
		this.#skin.update(dt, this.body.v.norm());
	}

	setSkinStyle(styleIndex) {
		return this.#skin.setStyle(styleIndex);
	}

	get visual() {
		return this.#visual;
	}
}
