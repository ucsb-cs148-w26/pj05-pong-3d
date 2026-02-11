import * as THREE from 'three';
import * as Constants from '../constants.js';
import { KeyboardController } from '../controllers.js';
import { PaddleCommon } from '../common/PaddleCommon.js';

/**
 * Client-side Paddle with THREE.js rendering
 * Extends PaddleCommon to add visual representation
 */
export class Paddle extends PaddleCommon {
	#visual = null;

	constructor(
		key,
		meshSettings,
		bodyIdentifier,
		initialX,
		controller = new KeyboardController('yz')
	) {
		super(key, bodyIdentifier, initialX);

		// Create THREE.js visual representation
		const geometry = new THREE.EdgesGeometry(
			new THREE.BoxGeometry(
				Constants.PADDLE_THICKNESS,
				Constants.PADDLE_HEIGHT,
				Constants.PADDLE_DEPTH
			)
		);

		const material = new THREE.LineBasicMaterial(meshSettings);

		this.#visual = new THREE.LineSegments(geometry, material);
		this.#visual.castShadow = true;
		this.#visual.receiveShadow = true;

		// Store the controller for movement input
		this.controller = controller;
	}

	update(dt) {
		super.update(dt);

		// Sync visual representation with physics body
		this.visual.position.copy(this.body.x);
	}

	get visual() {
		return this.#visual;
	}

	getDirection() {
		return this.controller.checkMoveInputs();
	}
}
