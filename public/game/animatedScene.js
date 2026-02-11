import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Scene } from './common/Scene.js';

/**
 * Scene with rendering capabilities. Uses the `visual` on each game object.
 */
export class AnimatedScene extends Scene {
	constructor() {
		super();

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			110,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);

		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		});

		this.camera.position.set(-16, 0, 0);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		this.visuals = new Map();

		// Orbit controls is the camera spinning around the center of the arena
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.clock = new THREE.Clock();

		this.renderer.setAnimationLoop(this.animate.bind(this));
	}

	registerGameObject(...objs) {
		super.registerGameObject(...objs);

		for (const obj of objs) {
			if (obj.visual) {
				this.visuals.set(obj.key, obj.visual);
				this.scene.add(obj.visual);
			}
		}
	}

	animate() {
		const delta = this.clock.getDelta();
		this.step(delta);
		this.renderer.render(this.scene, this.camera);
	}

	// deprecated? can add back in later, not needed for MVP
	toggleCameraMode() {
		this.isOrbiting = !this.isOrbiting;
		this.controls.enabled = this.isOrbiting;

		if (this.isOrbiting) {
			this.camera.position.set(-37.5, 15, 22.5);
			this.camera.up.set(0, 1, 0);
			this.camera.lookAt(0, 0, 0);
			this.controls.target.set(0, 0, 0);
		} else {
			this.camera.position.set(0, 0, 0);
			this.camera.up.set(0, 0, 1);
		}
	}
}
