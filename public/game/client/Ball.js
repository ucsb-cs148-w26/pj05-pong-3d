import * as THREE from 'three';
import { BallCommon } from '../common/BallCommon.js';
import { resolveCosmeticItemSelection } from '../cosmetics.js';
import { BallSkin } from '../shaders/ballSkin.js';

const BALL_PADDLE_KEYS = ['paddle1', 'paddle2'];

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
		this.body.col.onCollisionCallback = (me, other) =>
			this.#handleCollision(me.x, other);
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

	#handleCollision(position, otherBody) {
		const identifier = otherBody.ballIdentifier;

		if (identifier === 'paddle') {
			this.#handlePaddleCollision(otherBody);
			return;
		}

		if (identifier == 'greenWall' || identifier == 'redWall') {
			this.#handleGoalCollision(position, identifier);
			return;
		}
	}

	#handleGoalCollision(position, scoringSide) {
		const concedingSide = scoringSide === 'greenWall' ? 'redWall' : 'greenWall';
		const goalSelection =
			this.cosmetics?.[concedingSide] ?? this.cosmetics?.[scoringSide] ?? null;
		const goalExplosion = resolveCosmeticItemSelection(
			goalSelection?.goal_explosion_key
		);
		this.#goalSpawner.triggerGoalAnimation(
			goalExplosion.styleIndex,
			goalExplosion.paintColor,
			new THREE.Vector3(position.x, position.y, position.z)
		);

		const ballSelection = this.cosmetics?.[scoringSide] ?? goalSelection;
		this.setSkinStyle(Number.parseInt(ballSelection?.ball_skin_key, 10));
		this.scene?.freePlay?.queueServe(scoringSide);

		if (!this.scene?.isReplaying) {
			this.scene?.getGameObject('cameraController')?.addShake(0.5, 1000);
		}
	}

	#handlePaddleCollision(otherBody) {

		for (const paddleKey of BALL_PADDLE_KEYS) {
			const paddle = this.scene?.getGameObject(paddleKey);
			if (!paddle || paddle.body !== otherBody) continue;

			this.scene?.getGameObject('cameraController')?.addShake(0.18, 120);
			return;
		}
	}
}
