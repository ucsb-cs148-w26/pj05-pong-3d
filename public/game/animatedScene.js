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

		this._isRunning = false;
		this._hiddenHtml = new Map();
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

	deleteGameObject(key) {
		const obj = this.getGameObject(key);
		if (!obj) return false;

		const visual = this.visuals.get(key);
		if (visual) {
			this.scene.remove(visual);
			this._disposeVisual(visual);
			this.visuals.delete(key);
		}

		return super.deleteGameObject(key);
	}

	animate() {
		if (!this._isRunning) return;
		requestAnimationFrame(() => this.animate());

		const delta = this.clock.getDelta();
		this.step(delta);
		this.renderer.render(this.scene, this.camera);
	}

	start() {
		if (this._isRunning) return;
		this._isRunning = true;
		this._showNonThreeElements();
		this._readdVisuals();
		this.clock.getDelta();
		this.animate();
	}

	stop() {
		if (!this._isRunning) return;
		this._isRunning = false;
		this._removeVisuals();
		this._hideNonThreeElements();
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

	_removeVisuals() {
		for (const visual of this.visuals.values()) {
			this.scene.remove(visual);
		}
	}

	_readdVisuals() {
		for (const visual of this.visuals.values()) {
			if (!this.scene.children.includes(visual)) this.scene.add(visual);
		}
	}

	_hideNonThreeElements() {
		this._hiddenHtml.clear();
		for (const el of document.body.children) {
			if (el === this.renderer.domElement) continue;
			this._hiddenHtml.set(el, el.style.display);
			el.style.display = 'none';
		}
	}

	_showNonThreeElements() {
		for (const [el, display] of this._hiddenHtml.entries()) {
			el.style.display = display;
		}
		this._hiddenHtml.clear();
	}

	_disposeVisual(root) {
		root.traverse((obj) => {
			if (obj.geometry) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) {
					for (const mat of obj.material) this._disposeMaterial(mat);
				} else {
					this._disposeMaterial(obj.material);
				}
			}
		});
	}

	_disposeMaterial(mat) {
		for (const key in mat) {
			const value = mat[key];
			if (value && value.isTexture) value.dispose();
		}
		mat.dispose?.();
	}
}
