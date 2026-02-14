import * as THREE from 'three';
import * as Constants from '../constants.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Scene } from '../common/Scene.js';

/**
 * Scene with rendering capabilities. Uses the `visual` on each game object.
 */
export class AnimatedScene extends Scene {
	constructor(socket) {
		super();

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

		this.physicsClock = new THREE.Clock();
		this.physicsInterval = null;

		this._isRunning = false;
		this._hiddenHtml = new Map();

		socket.addHandler(this.#socketHandler.bind(this));
	}

	registerGameObject(...objs) {
		super.registerGameObject(...objs);

		for (const obj of objs) {
			if (obj.visual) {
				this.scene.add(obj.visual);
			}
		}
	}

	deleteGameObject(key) {
		const obj = this.getGameObject(key);
		if (!obj) return false;

		if (obj.visual) {
			this.scene.remove(obj.visual);
			this.#disposeVisual(obj.visual);
		}

		return super.deleteGameObject(key);
	}

	simulate() {
		const delta = this.physicsClock.getDelta();
		this.step(Math.min(delta, 2 / Constants.SIMULATION_RATE));
	}

	animate() {
		if (!this._isRunning) {
			this.renderer.clear();
			return;
		}

		requestAnimationFrame(() => this.animate());
		this.renderer.render(this.scene, this.camera);
	}

	start() {
		if (this._isRunning) return;
		this._isRunning = true;
		this._showNonThreeElements();

		// FIXME: this is not precise
		this.physicsInterval = setInterval(
			() => this.simulate(),
			1000 / Constants.SIMULATION_RATE
		);

		this.animate();
	}

	stop() {
		if (!this._isRunning) return;
		this._isRunning = false;
		this._hideNonThreeElements();
		this.renderer.render(this.scene, this.camera);

		if (this.physicsInterval) clearInterval(this.physicsInterval);
		this.physicsInterval = null;
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

	#disposeVisual(root) {
		root.traverse((obj) => {
			if (obj.geometry) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) {
					for (const mat of obj.material) this.#disposeMaterial(mat);
				} else {
					this.#disposeMaterial(obj.material);
				}
			}
		});
	}

	#disposeMaterial(mat) {
		for (const key in mat) {
			const value = mat[key];
			if (value && value.isTexture) value.dispose();
		}
		mat.dispose?.();
	}

	#socketHandler(msg, respond) {
		if (msg.type === 'sync') {
			this.physicsLoad(msg.ts, msg.physics);
			return true;
		}
	}
}
