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
}
