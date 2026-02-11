import * as THREE from 'three';
import * as Constants from '../constants.js';
import { ArenaCommon } from '../common/ArenaCommon.js';

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
