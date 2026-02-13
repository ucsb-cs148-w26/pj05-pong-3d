/**
 * Abstract base class for game objects that can be simulated on both client and
 * server
 */
export class GameObjectBase {
	/**
	 * Base constructor for game objects
	 * @param {string} key Unique identifier for this game object
	 */
	constructor(key) {
		this.key = key;
	}

	/**
	 * Function called when this object is added to the scene
	 * @param {*} scene The scene to which this object has been added
	 */
	init(scene) {}

	/**
	 * Function called on each frame before physics is run.
	 * @param {number} dt Delta time since the last update.
	 */
	update(dt) {}

	/**
	 * Function called on each frame after physics is run, but before colliders
	 * are checked.
	 * @param {number} dt Delta time since the last sync.
	 */
	sync(dt) {
		if (this.visual && this.bodies.length === 1) {
			this.visual.position.copy(this.bodies[0].x);
		}
	}

	/**
	 * Function called when this object is removed from the scene.
	 */
	kill() {}

	/**
	 * Returns the THREE.js mesh object to be added to the scene.
	 * Do not implement on the server side.
	 */
	get visual() {
		return null;
	}

	/**
	 * Returns the physics bodies associated with this game object to be added
	 * to the physics engine
	 */
	get bodies() {
		return [];
	}

	/**
	 * Returns the rigid bodies that should be synced with the server
	 * Override this method in subclasses to specify which bodies to sync
	 * @returns {Array} Array of RigidBody objects to sync
	 */
	get syncedBodies() {
		return [];
	}
}

/**
 * Throwaway game object using a custom configuration
 */
export class GameObjectCustom extends GameObjectBase {
	constructor(key, config) {
		super(key);

		this.config = config;
	}

	init(scene) {
		if (typeof this.config.init === 'function') this.config.init(scene);
	}

	update(dt) {
		if (typeof this.config.update === 'function') this.config.update(dt);
	}

	sync(dt) {
		if (typeof this.config.sync === 'function') this.config.sync(dt);
	}

	kill() {
		if (typeof this.config.kill === 'function') this.config.kill();
	}

	get visual() {
		return this.config.visual;
	}

	get bodies() {
		return this.config.bodies || [];
	}

	get syncedBodies() {
		return this.config.syncedBodies || [];
	}
}
