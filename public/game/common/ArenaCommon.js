import { BoxCollider } from '../../physics/collider.js';
import { Vec3 } from '../../physics/math.js';
import { RigidBody } from '../../physics/engine.js';
import * as Constants from '../constants.js';
import { GameObjectBase } from './GameObjectBase.js';

/**
 * Arena containing physics bodies for walls and boundaries
 * Arena bodies are not synced to the server as they are static
 */
export class ArenaCommon extends GameObjectBase {
	constructor(physicsEngine) {
		super();
		this.bodies = [
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS)
		];

		// Setup colliders for each wall
		this.bodies[0].col = new BoxCollider(
			Constants.ARENA_DEPTH,
			Constants.WALL_THICKNESS,
			Constants.ARENA_SIZE,
			this.bodies[0].transform
		);
		this.bodies[1].col = new BoxCollider(
			Constants.ARENA_DEPTH,
			Constants.WALL_THICKNESS,
			Constants.ARENA_SIZE,
			this.bodies[1].transform
		);
		this.bodies[2].col = new BoxCollider(
			Constants.ARENA_DEPTH,
			Constants.ARENA_SIZE,
			Constants.WALL_THICKNESS,
			this.bodies[2].transform
		);
		this.bodies[3].col = new BoxCollider(
			Constants.ARENA_DEPTH,
			Constants.ARENA_SIZE,
			Constants.WALL_THICKNESS,
			this.bodies[3].transform
		);

		this.bodies[4].col = new BoxCollider(
			Constants.WALL_THICKNESS,
			Constants.ARENA_SIZE,
			Constants.ARENA_SIZE,
			this.bodies[4].transform
		);
		this.bodies[5].col = new BoxCollider(
			Constants.WALL_THICKNESS,
			Constants.ARENA_SIZE,
			Constants.ARENA_SIZE,
			this.bodies[5].transform
		);

		// Position walls
		this.bodies[0].x.addVec(new Vec3(0, Constants.ARENA_WALL_OFFSET_Y));
		this.bodies[1].x.addVec(new Vec3(0, -Constants.ARENA_WALL_OFFSET_Y));
		this.bodies[2].x.addVec(new Vec3(0, 0, Constants.ARENA_WALL_OFFSET_Z));
		this.bodies[3].x.addVec(new Vec3(0, 0, -Constants.ARENA_WALL_OFFSET_Z));
		this.bodies[4].x.addVec(new Vec3(-Constants.ARENA_END_OFFSET));
		this.bodies[5].x.addVec(new Vec3(Constants.ARENA_END_OFFSET));

		// Assign ball identifiers for collision detection
		this.bodies[4].ballIdentifier = 'greenWall';
		this.bodies[5].ballIdentifier = 'redWall';

		// Register with physics engine
		if (physicsEngine) {
			physicsEngine.registerBody('arenaWallTop', this.bodies[0]);
			physicsEngine.registerBody('arenaWallBottom', this.bodies[1]);
			physicsEngine.registerBody('arenaWallSide1', this.bodies[2]);
			physicsEngine.registerBody('arenaWallSide2', this.bodies[3]);
			physicsEngine.registerBody('arenaWallGreen', this.bodies[4]);
			physicsEngine.registerBody('arenaWallRed', this.bodies[5]);
		}
	}

	/**
	 * Arena bodies are static and should not be synced to the server
	 * @returns {Array} Empty array
	 */
	getBodies() {
		return [];
	}
}
