import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PhysicsEngine } from '../physics/engine.js';
import { Drag } from '../physics/forces.js';

/*
AnimatedScene is responsible for handling global objects,
like the renderer, camera, and scene.
*/
export class AnimatedScene {
	constructor() {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this._renderSuspended = false;
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

		this.gameObjects = new Map();
		this.visuals = new Map();
		this.updates = new Map();
		this.requiresSync = new Map();
		this.onKills = new Map();

		// Orbit controls is the camera spinning around the center of the arena
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		this.clock = new THREE.Clock();
		this.physics = new PhysicsEngine();

		this._isRunning = false;
		this._rafId = null;
	}

	/*
	Expected contract:
	- obj.key -> unique identifier; expected string. If it already exists, an error will be thrown.
	- obj.visual? -> Threejs mesh object to be added to the scene
	- obj.body? -> Physics rigidbody to be added to the physics engine
	- obj.self? -> Convience component for accessing the rest of the object from getGameObject(key).self
	- obj.init? -> Convience component for running an init function. Calls obj.init(), then discards the function.
	- obj.update? -> Function called on each frame before physics is run. `dt` is passed in. Called as obj.update(dt)
	- obj.sync? -> Function called on each frame after physics is run, but before colliders are checked. `dt` is passed in.
	If none is provided but visual and body exist, it will call obj.visual.position.copy( obj.body.x ) to copy position

	Alternatively, pass in an object with { key: '<key>', object: <object> } instead.
	Doing so well forward queries to the above properties to the wrapped object instead
	of the one passed in. It will not set self in this case, so getGameObject(key) will
	return the object itself, so you can determine via self?. Note that init() will still be called on the wrapper object
	instead of the inside object. The constructor should handle inits that aren't per-instance.
	*/
	registerGameObject(...objs) {
		for (const obj of objs) {
			let objBody = obj;
			if (Object.hasOwn(obj, 'object')) objBody = obj.object;

			if (this.gameObjects.has(obj.key))
				throw new Error(`Object key ${obj.key} already exists.`);
			this.gameObjects.set(obj.key, objBody);

			if (Object.hasOwn(objBody, 'visual')) {
				this.visuals.set(obj.key, objBody.visual);
				this.scene.add(objBody.visual);
			}

			if (typeof objBody?.update === 'function')
				this.updates.set(obj.key, objBody);

			if (Object.hasOwn(obj, 'init')) obj.init();

			if (Object.hasOwn(objBody, 'body'))
				this.physics.registerBody(obj.key, objBody.body);

			if (Object.hasOwn(objBody, 'sync'))
				this.requiresSync.set(obj.key, objBody.sync);
			else if (
				Object.hasOwn(objBody, 'visual') &&
				Object.hasOwn(objBody, 'body')
			)
				this.requiresSync.set(obj.key, {
					sync(dt) {
						objBody.visual.position.copy(objBody.body.x);
					}
				});

			const onKill = obj.onKill || objBody.onKill;
			if (typeof onKill === 'function') this.onKills.set(obj.key, onKill);
		}
	}

	getGameObject(key) {
		return this.gameObjects.get(key);
	}

	deleteGameObject(key) {
		const objBody = this.gameObjects.get(key);
		if (!objBody) return false;

		const onKill = this.onKills.get(key);
		if (typeof onKill === 'function') onKill(objBody, key);

		this.onKills.delete(key);
		this.updates.delete(key);
		this.requiresSync.delete(key);
		this.physics.bodies.delete(key);

		const visual = this.visuals.get(key);
		if (visual) {
			this.scene.remove(visual);
			this._disposeVisual(visual);
			this.visuals.delete(key);
		}

		this.gameObjects.delete(key);
		return true;
	}

	animate() {
		this.start();
	}

	start() {
		if (this._isRunning) return;
		this._isRunning = true;
		this._renderSuspended = false;
		this._readdVisuals();
		this.clock.getDelta();
		this._tick();
	}

	stop() {
		if (!this._isRunning) return;
		this._isRunning = false;
		if (this._rafId !== null) cancelAnimationFrame(this._rafId);
		this._rafId = null;
		this._renderSuspended = true;
		this._removeVisuals();
	}

	_tick() {
		if (!this._isRunning) return;
		this._rafId = requestAnimationFrame(() => this._tick());

		const delta = this.clock.getDelta();

		for (const event of this.updates.values()) event.update(delta);

		this.physics.step(delta);

		for (const syncObject of this.requiresSync.values()) syncObject.sync(delta);

		this.physics.checkColliders();

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
