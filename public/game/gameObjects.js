import * as THREE from 'three';
import { BoxCollider, SphereCollider, Transform } from '../physics/collider.js';
import { Vec3 } from '../physics/math.js';
import { RigidBody } from '../physics/engine.js';
import { KeyboardController } from './controllers.js';
import { BodyForceApplier } from '../physics/forces.js';
import {
	PADDLE_THICKNESS,
	PADDLE_HEIGHT,
	PADDLE_DEPTH,
	PADDLE_ACCEL,
	PADDLE_BOUND,
	PADDLE_BOUND_ADJUST,
	PADDLE_VELOCITY_DAMPING,
	ARENA_DEPTH,
	ARENA_SIZE,
	WALL_THICKNESS,
	STATIC_MASS,
	ARENA_END_OFFSET,
	ARENA_WALL_OFFSET_Y,
	ARENA_WALL_OFFSET_Z,
	ARENA_COLOR,
	BALL_RADIUS,
	BALL_COLOR,
	BALL_MASS,
	BALL_INITIAL_SPEED,
	BALL_TINY_V_SCALE
} from './constants.js';

export class Paddle {
	// Square paddle
	constructor(
		meshSettings,
		bodyIdentifier,
		controller = new KeyboardController('yz')
	) {
		const geometry = new THREE.EdgesGeometry(
			new THREE.BoxGeometry(PADDLE_THICKNESS, PADDLE_HEIGHT, PADDLE_DEPTH)
		);
		const material = new THREE.LineBasicMaterial(meshSettings);

		this.visual = new THREE.LineSegments(geometry, material);
		this.visual.castShadow = true;
		this.visual.receiveShadow = true;
		this.body = new RigidBody(STATIC_MASS);
		this.body.ballIdentifier = bodyIdentifier;
		this.body.col = new BoxCollider(
			PADDLE_THICKNESS,
			PADDLE_HEIGHT,
			PADDLE_DEPTH,
			this.body.transform
		);
		this.controller = controller;
		this.accel = PADDLE_ACCEL;
		this.forceApplier = new BodyForceApplier(this.body, (vec) => {});
	}

	update(dt) {
		if (this.body.x.y > PADDLE_BOUND) this.body.x.y = PADDLE_BOUND_ADJUST;
		if (this.body.x.y < -PADDLE_BOUND) this.body.x.y = -PADDLE_BOUND_ADJUST;
		if (this.body.x.z > PADDLE_BOUND) this.body.x.z = PADDLE_BOUND_ADJUST;
		if (this.body.x.z < -PADDLE_BOUND) this.body.x.z = -PADDLE_BOUND_ADJUST;

		let direction = this.controller.checkMoveInputs();
		if (direction === null) direction = new Vec3();

		direction.addVec(this.body.v.clone().scale(PADDLE_VELOCITY_DAMPING));

		direction.scale(this.accel * this.body.m);
		this.forceApplier.applier = (f) => {
			f.addVec(direction);
		};
	}
}

export class Arena {
	//Long Hallway Arena
	constructor(physicsEngine, scores) {
		const geometry = new THREE.BoxGeometry(ARENA_DEPTH, ARENA_SIZE, ARENA_SIZE); // x, y, z
		const material = new THREE.MeshStandardMaterial({
			color: ARENA_COLOR,
			side: THREE.BackSide
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.y = 0;
		this.visual.receiveShadow = true;

		this.bodies = [
			new RigidBody(STATIC_MASS),
			new RigidBody(STATIC_MASS),
			new RigidBody(STATIC_MASS),
			new RigidBody(STATIC_MASS),
			new RigidBody(STATIC_MASS),
			new RigidBody(STATIC_MASS)
		];

		// MeshCollider should probably be created so this is more convenient
		// but i aint doin allat rn

		this.bodies[0].col = new BoxCollider(
			ARENA_DEPTH,
			WALL_THICKNESS,
			ARENA_SIZE,
			this.bodies[0].transform
		);
		this.bodies[1].col = new BoxCollider(
			ARENA_DEPTH,
			WALL_THICKNESS,
			ARENA_SIZE,
			this.bodies[1].transform
		);
		this.bodies[2].col = new BoxCollider(
			ARENA_DEPTH,
			ARENA_SIZE,
			WALL_THICKNESS,
			this.bodies[2].transform
		);
		this.bodies[3].col = new BoxCollider(
			ARENA_DEPTH,
			ARENA_SIZE,
			WALL_THICKNESS,
			this.bodies[3].transform
		);

		this.bodies[4].col = new BoxCollider(
			WALL_THICKNESS,
			ARENA_SIZE,
			ARENA_SIZE,
			this.bodies[4].transform
		);
		this.bodies[5].col = new BoxCollider(
			WALL_THICKNESS,
			ARENA_SIZE,
			ARENA_SIZE,
			this.bodies[5].transform
		);

		this.bodies[0].x.addVec(new Vec3(0, ARENA_WALL_OFFSET_Y));
		this.bodies[1].x.addVec(new Vec3(0, -ARENA_WALL_OFFSET_Y));
		this.bodies[2].x.addVec(new Vec3(0, 0, ARENA_WALL_OFFSET_Z));
		this.bodies[3].x.addVec(new Vec3(0, 0, -ARENA_WALL_OFFSET_Z));
		this.bodies[4].x.addVec(new Vec3(-ARENA_END_OFFSET));
		this.bodies[5].x.addVec(new Vec3(ARENA_END_OFFSET));

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
		const geometry = new THREE.SphereGeometry(BALL_RADIUS);
		const material = new THREE.MeshStandardMaterial({ color: BALL_COLOR });
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.castShadow = true;
		this.scores = scores;
		this.needsToReset = false;
		this.body = new RigidBody(BALL_MASS);
		this.body.col = new SphereCollider(
			BALL_RADIUS,
			this.body.transform,
			(me, other) => {
				if (!Object.hasOwn(other, 'ballIdentifier')) return;

				switch (other.ballIdentifier) {
					case 'paddle': {
						const tinyV = this.body.v
							.clone()
							.normalize()
							.scale(BALL_TINY_V_SCALE);
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

		this.body.v.assign(BALL_INITIAL_SPEED, 0, 0);
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
			.scale(BALL_INITIAL_SPEED);
	}

	update(dt) {
		this.scores.ballSpeed = this.body.v.norm();

		if (this.needsToReset) {
			this.needsToReset = false;
			this.reset();
		}
	}
}
