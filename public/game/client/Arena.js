import * as THREE from 'three';
import * as Constants from '../constants.js';
import { ArenaCommon } from '../common/ArenaCommon.js';
import { ArenaSkin } from '../shaders/arenaSkin.js';

/**
 * Client-side Arena with THREE.js rendering
 * Extends ArenaCommon to add visual representation
 */
export class Arena extends ArenaCommon {
	#visual = null;
	#skin = null;
	#scene = null;
	#ball = null;

	constructor(key) {
		super(key);

		// Create THREE.js visual representation
		this.#skin = new ArenaSkin();
		this.#visual = this.#skin.visual;
	}

	update(dt) {
		if (!this.#ball) this.#ball = this.#scene?.getGameObject('ball') ?? null;
		this.#skin.update(dt, this.#ball?.body?.v?.norm?.() ?? 0.0);
	}

	get visual() {
		return this.#visual;
	}

	init(scene) {
		this.#scene = scene;

		for (const body of this.bodies) {
			if (!body?.col) continue;

			body.col.onCollisionCallback = (me, other) => {
				const ball = this.#ball ?? this.#scene?.getGameObject('ball');
				if (!ball || other !== ball.body || this.#scene?.isReplaying) return;

				this.#ball = ball;
				const collision = this.#resolveCollisionDetails(
					me.ballIdentifier,
					other.x
				);
				if (!collision) return;

				this.#skin.triggerCollisionEffect(
					collision.position,
					collision.normal
				);
			};
		}
	}

	#resolveCollisionDetails(identifier, ballPos) {
		const halfWidth = Constants.ARENA_DEPTH * 0.5;
		const halfHeight = Constants.ARENA_SIZE * 0.5;
		const halfDepth = Constants.ARENA_SIZE * 0.5;
		const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
		const position = new THREE.Vector3();
		const normal = new THREE.Vector3();

		switch (identifier) {
			case 'topWall':
				position.set(
					clamp(ballPos.x, -halfWidth, halfWidth),
					halfHeight,
					clamp(ballPos.z, -halfDepth, halfDepth)
				);
				normal.set(0, 1, 0);
				break;

			case 'bottomWall':
				position.set(
					clamp(ballPos.x, -halfWidth, halfWidth),
					-halfHeight,
					clamp(ballPos.z, -halfDepth, halfDepth)
				);
				normal.set(0, -1, 0);
				break;

			case 'positiveZWall':
				position.set(
					clamp(ballPos.x, -halfWidth, halfWidth),
					clamp(ballPos.y, -halfHeight, halfHeight),
					halfDepth
				);
				normal.set(0, 0, 1);
				break;

			case 'negativeZWall':
				position.set(
					clamp(ballPos.x, -halfWidth, halfWidth),
					clamp(ballPos.y, -halfHeight, halfHeight),
					-halfDepth
				);
				normal.set(0, 0, -1);
				break;

			case 'greenWall':
				position.set(
					-halfWidth,
					clamp(ballPos.y, -halfHeight, halfHeight),
					clamp(ballPos.z, -halfDepth, halfDepth)
				);
				normal.set(-1, 0, 0);
				break;

			case 'redWall':
				position.set(
					halfWidth,
					clamp(ballPos.y, -halfHeight, halfHeight),
					clamp(ballPos.z, -halfDepth, halfDepth)
				);
				normal.set(1, 0, 0);
				break;

			default:
				return null;
		}

		return { position, normal };
	}
}
