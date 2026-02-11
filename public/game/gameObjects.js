import * as THREE from 'three';
import { BoxCollider, SphereCollider, Transform } from '../physics/collider.js';
import { Vec3 } from '../physics/math.js';
import { RigidBody } from '../physics/engine.js';
import { KeyboardController } from './controllers.js';
import { BodyForceApplier } from '../physics/forces.js';
import * as Constants from './constants.js';

export class Paddle {
	// Square paddle
	constructor(
		meshSettings,
		bodyIdentifier,
		controller = new KeyboardController('yz')
	) {
		const geometry = new THREE.EdgesGeometry(
			new THREE.BoxGeometry(
				Constants.PADDLE_THICKNESS,
				Constants.PADDLE_HEIGHT,
				Constants.PADDLE_DEPTH
			)
		);
		const material = new THREE.LineBasicMaterial(meshSettings);

		this.visual = new THREE.LineSegments(geometry, material);
		this.visual.castShadow = true;
		this.visual.receiveShadow = true;
		this.body = new RigidBody(Constants.STATIC_MASS);
		this.body.ballIdentifier = bodyIdentifier;
		this.body.col = new BoxCollider(
			Constants.PADDLE_THICKNESS,
			Constants.PADDLE_HEIGHT,
			Constants.PADDLE_DEPTH,
			this.body.transform
		);
		this.controller = controller;
		this.accel = Constants.PADDLE_ACCEL;
		this.forceApplier = new BodyForceApplier(this.body, (vec) => {});
	}

	update(dt) {
		if (this.body.x.y > Constants.PADDLE_BOUND)
			this.body.x.y = Constants.PADDLE_BOUND_ADJUST;
		if (this.body.x.y < -Constants.PADDLE_BOUND)
			this.body.x.y = -Constants.PADDLE_BOUND_ADJUST;
		if (this.body.x.z > Constants.PADDLE_BOUND)
			this.body.x.z = Constants.PADDLE_BOUND_ADJUST;
		if (this.body.x.z < -Constants.PADDLE_BOUND)
			this.body.x.z = -Constants.PADDLE_BOUND_ADJUST;

		let direction = this.controller.checkMoveInputs();
		if (direction === null) direction = new Vec3();

		direction.addVec(
			this.body.v.clone().scale(Constants.PADDLE_VELOCITY_DAMPING)
		);

		direction.scale(this.accel * this.body.m);
		this.forceApplier.applier = (f) => {
			f.addVec(direction);
		};
	}
}

export class Arena {
	//Long Hallway Arena
	constructor(physicsEngine, scores) {
		const geometry = new THREE.BoxGeometry(
			Constants.ARENA_DEPTH,
			Constants.ARENA_SIZE,
			Constants.ARENA_SIZE
		); // x, y, z
		const material = new THREE.MeshStandardMaterial({
			color: Constants.ARENA_COLOR,
			side: THREE.BackSide
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.y = 0;
		this.visual.receiveShadow = true;

		this.bodies = [
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS),
			new RigidBody(Constants.STATIC_MASS)
		];

		// MeshCollider should probably be created so this is more convenient
		// but i aint doin allat rn

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

		this.bodies[0].x.addVec(new Vec3(0, Constants.ARENA_WALL_OFFSET_Y));
		this.bodies[1].x.addVec(new Vec3(0, -Constants.ARENA_WALL_OFFSET_Y));
		this.bodies[2].x.addVec(new Vec3(0, 0, Constants.ARENA_WALL_OFFSET_Z));
		this.bodies[3].x.addVec(new Vec3(0, 0, -Constants.ARENA_WALL_OFFSET_Z));
		this.bodies[4].x.addVec(new Vec3(-Constants.ARENA_END_OFFSET));
		this.bodies[5].x.addVec(new Vec3(Constants.ARENA_END_OFFSET));

		this.bodies[4].ballIdentifier = 'greenWall';
		this.bodies[5].ballIdentifier = 'redWall';

		physicsEngine.registerBody('arenaWallTop', this.bodies[0]);
		physicsEngine.registerBody('arenaWallBottom', this.bodies[1]);
		physicsEngine.registerBody('arenaWallSide1', this.bodies[2]);
		physicsEngine.registerBody('arenaWallSide2', this.bodies[3]);
		physicsEngine.registerBody('arenaWallGreen', this.bodies[4]);
		physicsEngine.registerBody('arenaWallRed', this.bodies[5]);
	}
}

export class Ball {
	constructor(scores) {
		const geometry = new THREE.SphereGeometry(Constants.BALL_RADIUS);
		const material = new THREE.MeshStandardMaterial({
			color: Constants.BALL_COLOR
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.castShadow = true;
		this.scores = scores;
		this.needsToReset = false;
		this.body = new RigidBody(Constants.BALL_MASS);
		this.body.col = new SphereCollider(
			Constants.BALL_RADIUS,
			this.body.transform,
			(me, other) => {
				if (!Object.hasOwn(other, 'ballIdentifier')) return;

				switch (other.ballIdentifier) {
					case 'paddle': {
						const tinyV = this.body.v
							.clone()
							.normalize()
							.scale(Constants.BALL_TINY_V_SCALE);
						this.body.v.addVec(tinyV);
						return;
					}

					case 'greenWall':
						this.scores.IJKL += 1;
						this.needsToReset = true;
						return;

					case 'redWall':
						this.scores.WASD += 1;
						this.needsToReset = true;
						return;
				}
			}
		);

		this.body.v.assign(Constants.BALL_INITIAL_SPEED, 0, 0);
	}

	reset() {
		this.body.x.assign(0, 0, 0);

		let theta = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		const thetaDir = 2 * Math.floor(Math.random() * 2) - 1;

		theta *= thetaDir;

		let phi = (Math.random() * Math.PI) / 2 + Math.PI / 4;

		this.body.v
			.assign(
				Math.sin(theta) * Math.sin(phi),
				Math.cos(phi),
				Math.cos(theta) * Math.sin(phi)
			)
			.scale(Constants.BALL_INITIAL_SPEED);
	}

	update(dt) {
		this.scores.ballSpeed = this.body.v.norm();

		if (this.needsToReset) {
			this.needsToReset = false;
			this.reset();
		}
	}
}
