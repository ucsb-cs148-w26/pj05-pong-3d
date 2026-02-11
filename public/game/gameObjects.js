import * as THREE from 'three';
import * as Constants from './constants.js';
import { KeyboardController } from './controllers.js';
import { PaddleCommon } from './common/PaddleCommon.js';
import { ArenaCommon } from './common/ArenaCommon.js';
import { BallCommon } from './common/BallCommon.js';

/**
 * Client-side Paddle with THREE.js rendering
 * Extends PaddleCommon to add visual representation
 */
export class Paddle extends PaddleCommon {
	constructor(
		meshSettings,
		bodyIdentifier,
		controller = new KeyboardController('yz')
	) {
		super(bodyIdentifier);

		// Create THREE.js visual representation
		const geometry = new THREE.EdgesGeometry(
			new THREE.BoxGeometry(
				Constants.PADDLE_THICKNESS,
				Constants.PADDLE_HEIGHT,
				Constants.PADDLE_DEPTH
			)
		);
		const material = new THREE.LineBasicMaterial(meshSettings);
		this.visual = new THREE.LineSegments(geometry, material);
		this.visual.castShadow = true;
		this.visual.receiveShadow = true;

		// Store the controller for movement input
		this.controller = controller;
	}

	/**
	 * Implements the abstract getDirection method using keyboard input
	 * @returns {Vec3} Direction vector from keyboard input
	 */
	getDirection() {
		return this.controller.checkMoveInputs();
	}

	/**
	 * Updates both physics and rendering
	 * @param {number} dt Delta time
	 */
	update(dt) {
		super.update(dt);

		// Sync visual representation with physics body
		this.visual.position.copy(this.body.x);
	}
}

/**
 * Client-side Arena with THREE.js rendering
 * Extends ArenaCommon to add visual representation
 */
export class Arena extends ArenaCommon {
	constructor(physicsEngine, scores) {
		super(physicsEngine);

		// Create THREE.js visual representation
		const geometry = new THREE.BoxGeometry(
			Constants.ARENA_DEPTH,
			Constants.ARENA_SIZE,
			Constants.ARENA_SIZE
		); // x, y, z
		const material = new THREE.MeshStandardMaterial({
			color: Constants.ARENA_COLOR,
			side: THREE.BackSide
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.y = 0;
		this.visual.receiveShadow = true;
	}
}

/**
 * Client-side Ball with THREE.js rendering
 * Extends BallCommon to add visual representation
 */
export class Ball extends BallCommon {
	constructor(scores) {
		super(scores);

		// Create THREE.js visual representation
		const geometry = new THREE.SphereGeometry(Constants.BALL_RADIUS);
		const material = new THREE.MeshStandardMaterial({
			color: Constants.BALL_COLOR
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.castShadow = true;
	}

	/**
	 * Updates both physics and rendering
	 * @param {number} dt Delta time
	 */
	update(dt) {
		super.update(dt);

		// Sync visual representation with physics body
		this.visual.position.copy(this.body.x);
	}
}
