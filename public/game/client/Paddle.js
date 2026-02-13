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
	#socket = null;

	constructor(
		key,
		plane,
		bodyIdentifier,
		initialX,
		meshSettings,
		controller = new KeyboardController()
	) {
		super(key, plane, bodyIdentifier, initialX);

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

		this.controller = controller;
	}

	init(scene) {
		super.init(scene);
		this.#socket = scene.getGameObject('socket')?.config.socket;
	}

	update(dt) {
		super.update(dt);

		this.#socket?.send({
			type: 'move',
			ts: Date.now(),
			direction: this.getDirection()
		});
	}

	get visual() {
		return this.#visual;
	}

	getDirection() {
		return this.controller.getMoveInputs();
	}
}
