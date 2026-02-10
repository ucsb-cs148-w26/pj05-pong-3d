import * as THREE from 'three';
import { BoxCollider, SphereCollider, Transform } from '../physics/collider.js';
import { Vec3 } from '../physics/math.js';
import { RigidBody } from '../physics/engine.js';
import { KeyboardController } from './controllers.js';
import { BodyForceApplier } from '../physics/forces.js';

export class Paddle {
	// Square paddle
	constructor(meshSettings, bodyIdentifier, controller = new KeyboardController('yz')) {
		const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 3, 3));
		const material = new THREE.LineBasicMaterial(meshSettings);

		this.visual = new THREE.LineSegments(geometry, material);
		this.visual.castShadow = true;
		this.visual.receiveShadow = true;
		this.body = new RigidBody(99999);
		this.body.ballIdentifier = bodyIdentifier;
		this.body.col = new BoxCollider(0.5, 3, 3, this.body.transform);
		this.controller = controller;
		this.accel = 40;
		this.forceApplier = new BodyForceApplier(this.body, (vec) => {});
	}

	get position() {
		return this.body.x;
	}

	update(dt) {
		if (this.body.x.y > 5.75) this.body.x.y = 5.65;
		if (this.body.x.y < -5.75) this.body.x.y = -5.65;
		if (this.body.x.z > 5.75) this.body.x.z = 5.65;
		if (this.body.x.z < -5.75) this.body.x.z = -5.65;

		let direction = this.controller.checkMoveInputs();
		if (direction === null) direction = new Vec3();

		direction.addVec(this.body.v.clone().scale(-0.25));

		direction.scale(this.accel * this.body.m);
		this.forceApplier.applier = (f) => {
			f.addVec(direction);
		};
	}
}

const PI = 3.14159265359;

export class Arena {
	//Long Hallway Arena
	constructor(physicsEngine, scores) {
		const geometry = new THREE.BoxGeometry(23.5, 15, 15); // x, y, z
		const material = new THREE.MeshStandardMaterial({
			color: 0x222222,
			side: THREE.BackSide
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.y = 0;
		this.visual.receiveShadow = true;

		this.bodies = [
			new RigidBody(999999),
			new RigidBody(999999),
			new RigidBody(999999),
			new RigidBody(999999),
			new RigidBody(999999),
			new RigidBody(999999)
		];
		
		// MeshCollider should probably be created so this is more convenient
		// but i aint doin allat rn

		this.bodies[0].col = new BoxCollider( 23.5, 3, 15, this.bodies[0].transform );
		this.bodies[1].col = new BoxCollider( 23.5, 3, 15, this.bodies[1].transform );
		this.bodies[2].col = new BoxCollider( 23.5, 15, 3, this.bodies[2].transform );
		this.bodies[3].col = new BoxCollider( 23.5, 15, 3, this.bodies[3].transform );

		this.bodies[4].col = new BoxCollider( 3, 15, 15, this.bodies[4].transform );
		this.bodies[5].col = new BoxCollider( 3, 15, 15, this.bodies[5].transform );
		
		this.bodies[0].x.addVec( new Vec3(0, 9) );
		this.bodies[1].x.addVec( new Vec3(0, -9) );
		this.bodies[2].x.addVec( new Vec3(0, 0, 9) );
		this.bodies[3].x.addVec( new Vec3(0, 0, -9) );
		this.bodies[4].x.addVec( new Vec3(-13.28125 ) );
		this.bodies[5].x.addVec( new Vec3(13.28125));

		this.bodies[4].ballIdentifier = "greenWall";
		this.bodies[5].ballIdentifier = "redWall";

		physicsEngine.registerBody("arenaWallTop", this.bodies[0]);
		physicsEngine.registerBody("arenaWallBottom", this.bodies[1]);
		physicsEngine.registerBody("arenaWallSide1", this.bodies[2]);
		physicsEngine.registerBody("arenaWallSide2", this.bodies[3]);
		physicsEngine.registerBody("arenaWallGreen", this.bodies[4]);
		physicsEngine.registerBody("arenaWallRed", this.bodies[5]);

	}
}

export class Ball {
	constructor(scores) {
		const geometry = new THREE.SphereGeometry(0.5);
		const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.castShadow = true;
		this.scores = scores;
		this.needsToReset = false;
		this.body = new RigidBody(3);
		this.body.col = new SphereCollider(0.5, this.body.transform, (me, other) => {
			if ( !Object.hasOwn(other, "ballIdentifier") ) return;
			
			switch ( other.ballIdentifier ) {
				case "paddle": {
					const tinyV = this.body.v.clone().normalize().scale(0.1);
					this.body.v.addVec(tinyV);
					return;
				}
			
				case "greenWall":
					this.scores.IJKL += 1;
					this.needsToReset = true;
					return;

				case "redWall":
					this.scores.WASD += 1;
					this.needsToReset = true;
					return;

			}

		});


		this.body.v.assign(5, 0, 0);

	}

	reset() {

		this.body.x.assign(0, 0, 0);

		let theta = (Math.random() * PI) / 2 + PI / 4;

		const thetaDir = 2 * Math.floor(Math.random() * 2) - 1;

		theta *= thetaDir;

		let phi = (Math.random() * PI) / 2 + PI / 4;

		this.body.v
			.assign(
				Math.sin(theta) * Math.sin(phi),
				Math.cos(phi),
				Math.cos(theta) * Math.sin(phi)
			)
			.scale(5);
	}

	update(dt) {
		this.scores.ballSpeed = this.body.v.norm();

		if ( this.needsToReset ) {
			this.needsToReset = false;
			this.reset();
		}

	}

}
