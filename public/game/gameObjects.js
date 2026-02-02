import * as THREE from 'three';
import { BoxCollider, MeshCollider3D } from '../physics/collider.js';
import { Vec3 } from '../physics/math.js';
import { RigidBody } from '../physics/engine.js';
import { KeyboardController } from './controllers.js';
import { BodyForceApplier } from '../physics/forces.js';

export class Paddle {
	// Square paddle
	constructor(meshSettings, controller = new KeyboardController('yz')) {
		const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 3, 3));
        const material = new THREE.LineBasicMaterial(meshSettings);

		this.visual = new THREE.LineSegments(geometry, material);
		this.visual.castShadow = true;
		this.visual.receiveShadow = true;
		this.body = new RigidBody(99999);
		this.body.col = new BoxCollider(this.body.x, 0.5, 3, 3);
		this.controller = controller;
		this.accel = 30;
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

		direction.addVec(this.body.v.clone().scale(-0.2));

		direction.scale(this.accel * this.body.m);
		this.forceApplier.applier = (f) => {
			f.addVec(direction);
		};
	}
}

const PI = 3.14159265359;

export class Arena {
	//Long Hallway Arena
	constructor() {
		const geometry = new THREE.BoxGeometry(23.5, 15, 15);
		const material = new THREE.MeshStandardMaterial({
			color: 0x222222,
			side: THREE.BackSide
		});
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.position.y = 0;
		this.visual.receiveShadow = true;
	}
}

export class Ball {
	constructor(paddle1, paddle2, scores) {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.visual = new THREE.Mesh(geometry, material);
		this.visual.castShadow = true;
		this.body = new RigidBody(3);

		this.speed = 5;

		this.p1 = paddle1;
		this.p2 = paddle2;
		this.scores = scores;
	}

	reflect(normal) {
		const v = this.body.v;
		const scaledNormal = normal.clone().scale(-2 * Vec3.dot(v, normal));
		this.body.v.addVec(scaledNormal);
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
			.scale(this.speed);

		this.scores.ballSpeed = this.speed;
	}

	update(dt) {
		if (this.body.x.y < -6.5) this.reflect(new Vec3(0, 1, 0));
		if (this.body.x.y > 6.5) this.reflect(new Vec3(0, -1, 0));
		if (this.body.x.z < -6.5) this.reflect(new Vec3(0, 0, 1));
		if (this.body.x.z > 6.5) this.reflect(new Vec3(0, 0, -1));

		if (this.body.x.x < (-23.5 * 2.125) / 4.125 + 1.5) {
			const thisYPos = this.body.x.y;
			const paddleYPos = this.p1.body.x.y;
			const thisZPos = this.body.x.z;
			const paddleZPos = this.p1.body.x.z;

			if (
				Math.abs(paddleYPos - thisYPos) < 1.5 &&
				Math.abs(paddleZPos - thisZPos) < 1.5
			) {
				this.reflect(new Vec3(1));
				return;
			}

			if (this.body.x.x < -23.5 / 2 + 1.45) {
				this.scores.IJKL += 1;
				this.speed += 0.15;
				this.reset();
			}
		}

		if (this.body.x.x > (23.5 * 2.125) / 4.125 - 1.5) {
			const thisYPos = this.body.x.y;
			const paddleYPos = this.p2.body.x.y;
			const thisZPos = this.body.x.z;
			const paddleZPos = this.p2.body.x.z;

			if (
				Math.abs(paddleYPos - thisYPos) < 1.5 &&
				Math.abs(paddleZPos - thisZPos) < 1.5
			) {
				this.reflect(new Vec3(-1));
				return;
			}

			if (this.body.x.x > 23.5 / 2 - 1.45) {
				this.scores.WASD += 1;
				this.speed += 0.15;
				this.reset();
			}
		}
	}
}
