import { PhysicsEngine } from '../../physics/engine.js';

/**
 * Scene manages game objects and handles the core simulation loop.
 */
export class Scene {
	constructor() {
		this.gameObjects = new Map();
		this.physics = new PhysicsEngine();
	}

	/**
	 * Register one or more game objects of type GameObjectBase with the scene.
	 */
	registerGameObject(...objs) {
		for (const obj of objs) {
			if (this.gameObjects.has(obj.key))
				throw new Error(`Object key ${obj.key} already exists.`);
			this.gameObjects.set(obj.key, obj);

			obj.init(this);

			for (let i = 0; i < obj.bodies.length; i++) {
				this.physics.registerBody(obj.key + i, obj.bodies[i]);
			}
		}
	}

	/**
	 * Delete a game object from the scene, calling its kill function.
	 * @param {string} key The unique identifier of the object
	 * @returns {boolean} Whether the object was successfully deleted
	 */
	deleteGameObject(key) {
		const obj = this.gameObjects.get(key);
		if (!obj) return false;

		obj.kill();

		for (let i = 0; i < obj.bodies.length; i++) {
			this.physics.bodies.delete(obj.key + i);
		}

		this.gameObjects.delete(key);
		return true;
	}

	/**
	 * Retrieve a game object by its key
	 * @param {string} key The unique identifier of the object
	 * @returns {object} The game object, or undefined if not found
	 */
	getGameObject(key) {
		return this.gameObjects.get(key);
	}

	/**
	 * Run one step of the simulation
	 * @param {number} delta The time delta since the last update
	 */
	step(delta) {
		for (const obj of this.gameObjects.values()) obj.update(delta);

		this.physics.step(delta);

		for (const obj of this.gameObjects.values()) obj.sync(delta);

		this.physics.checkColliders();
	}

	/**
	 * Dump the physics state of all synced objects.
	 */
	physicsDump() {
		const bodies = this.gameObjects
			.values()
			.reduce((acc, curr) => acc.concat(curr.bodies), []);

		const arr = new Float32Array(6 * bodies.length);
		let i = 0;
		for (const body of bodies) {
			arr[i] = body.x.x;
			arr[i + 1] = body.x.y;
			arr[i + 2] = body.x.z;
			arr[i + 3] = body.v.x;
			arr[i + 4] = body.v.y;
			arr[i + 5] = body.v.z;
			i += 6;
		}

		return arr;
	}

	/**
	 * Load the physics state of all synced objects.
	 */
	physicsLoad(ts, dump) {
		let i = 0;
		for (const obj of this.gameObjects.values()) {
			for (const body of obj.bodies) {
				if (i >= dump.length) return;

				// TODO: reconciliation etc.
				body.x.assign(dump[i], dump[i + 1], dump[i + 2]);
				body.v.assign(dump[i + 3], dump[i + 4], dump[i + 5]);
				i += 6;
			}
		}
	}
}
