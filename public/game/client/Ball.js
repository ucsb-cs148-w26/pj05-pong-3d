import * as THREE from 'three';
import * as Constants from '../constants.js';
import { BallCommon } from '../common/BallCommon.js';

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
