import * as THREE from 'three';
import * as Constants from '../constants.js';
import { BallCommon } from '../common/BallCommon.js';

/**
 * Client-side Ball with THREE.js rendering
 * Extends BallCommon to add visual representation
 */
export class Ball extends BallCommon {
	#visual = null;
	#goalSpawner = null;
	#explosionId = null;

	constructor(key, spawner) {
		super(key);

		// Create THREE.js visual representation
		const geometry = new THREE.SphereGeometry(Constants.BALL_RADIUS);
		const material = new THREE.MeshStandardMaterial({
			color: Constants.BALL_COLOR
		});

		this.#visual = new THREE.Mesh(geometry, material);
		this.#visual.castShadow = true;
		this.#goalSpawner = spawner;

		this.body.col.onCollisionCallback = ((me, other) => {
			if ( this.#explosionId === null ) return;			
			
			const identifier = other.ballIdentifier;
			if (identifier === undefined || ( identifier !== "greenWall" && identifier !== "redWall" ) ) return;
			
			const pos = me.x;
			this.#goalSpawner.triggerGoalAnimation( this.#explosionId, null, new THREE.Vector3( pos.x, pos.y, pos.z ) );

		}).bind(this);

		this.#loadEquipped();
	}

	async #loadEquipped() {
		try {
			const response = await fetch('/user/items/equipped', {
				method: 'GET',
				credentials: 'same-origin'
			});

			if (!response.ok) throw new Error();

			const data = await response.json();

			if (data.ball_skin_key) {
				this.applySkin(data.ball_skin_key);
			} else {
				this.applySkin('default');
			}

			if (data.goal_explosion_key) {
				this.#explosionId = parseInt( data.goal_explosion_key, 10 );
			}

		} catch (err) {
			console.error('Failed to load: ', err);
			this.applySkin('default');
		}
	}

	applySkin(skinId) {
		const mat = this.#visual.material;
		if (!mat) return;

		mat.map = null;

		// TODO: Hardcoded for now, fix with updated ball skin logic
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
