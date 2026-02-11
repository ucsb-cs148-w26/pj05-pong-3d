/**
 * Abstract base class for game objects that can be simulated on both client and server
 */
export class GameObjectBase {
	/**
	 * Returns the rigid bodies that should be synced with the server
	 * Override this method in subclasses to specify which bodies to sync
	 * @returns {Array} Array of RigidBody objects to sync
	 */
	getBodies() {
		return [];
	}
}
