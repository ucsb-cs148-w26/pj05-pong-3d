import * as THREE from 'three';
import * as Constants from '../constants.js';
import { BallCommon } from '../common/BallCommon.js';

/**
 * Client-side Ball with THREE.js rendering
 * Extends BallCommon to add visual representation
 */
export class Ball extends BallCommon {
	#visual = null;

	constructor(key, scores) {
		super(key, scores);

		// Create THREE.js visual representation
		const geometry = new THREE.SphereGeometry(Constants.BALL_RADIUS);
		const material = new THREE.MeshStandardMaterial({
			color: Constants.BALL_COLOR
		});

		this.#visual = new THREE.Mesh(geometry, material);
		this.#visual.castShadow = true;
	}

	applyCosmetics(cosmetics) {
		const skinId = cosmetics?.ball?.skinId ?? 'classic';

		const mat = this.#visual?.material;
		if (!mat) return;

		mat.map = null;

		if (skinId === 'neon_blue') {
			mat.color.set(0x00aaff);
		} else if (skinId === 'hot_pink') {
			mat.color.set(0xff4fd8);
		} else if (skinId === 'basketball') {
			const loader = new THREE.TextureLoader();
			const texture = loader.load('/textures/basketball.png');
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = 8;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			mat.map = texture;
			mat.color.set(0xffffff);
			mat.metalness = 0.0;
			mat.roughness = 0.9;
			mat.envMapIntensity = 0.2;
		} else {
			mat.color.set(Constants.BALL_COLOR);
		}

		mat.needsUpdate = true;
	}

	get visual() {
		return this.#visual;
	}
}
