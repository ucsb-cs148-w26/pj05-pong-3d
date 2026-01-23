import { BoxCollider, SphereCollider } from './collider.js';
import { RigidBody } from './engine.js';
import * as THREE from 'three';
import { ZERO } from './math.js';

export class Box {
	constructor(pos, mass, material, l = 1, w = 1, h = 1) {
		this.body = new RigidBody(mass, new BoxCollider(pos, l, w, h));
		this.body.x = pos.clone();
		this.geometry = new THREE.BoxGeometry(w * 1.4, h * 1.4, l * 1.4);
		this.visualBody = new THREE.Mesh(this.geometry, material);
	}

	get l() {
		return this.body.col.l;
	}
	get w() {
		return this.body.col.w;
	}
	get h() {
		return this.body.col.h;
	}

	syncVisual() {
		this.visualBody.position.copy(this.body.x);
	}
}

// Broken for some reason
export class Sphere {
	constructor(pos, mass, material, radius = 1) {
		this.body = new RigidBody(mass, new SphereCollider(pos, radius));
		this.body.x = pos.clone();
		this.geometry = new THREE.SphereGeometry(radius);
		this.visualBody = new THREE.Mesh(this.geometry, material);
	}

	syncVisual() {
		this.visualBody.position.copy(this.body.x);
	}
}

export class Boxbox {
	constructor(size) {
		let half_size = size / 2;
		this.size = size;
		let center = ZERO.clone();

		this.bodies = [
			new Box(
				center.clone().add(0, half_size, 0),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
				size,
				size,
				0.1
			),
			new Box(
				center.clone().add(0, -half_size, 0),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
				size,
				size,
				0.1
			),
			new Box(
				center.clone().add(half_size, 0, 0),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0xff0000 }),
				size,
				0.1,
				size
			),
			new Box(
				center.clone().add(-half_size, 0, 0),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0xff0000 }),
				size,
				0.1,
				size
			),
			new Box(
				center.clone().add(0, 0, half_size),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0x0000ff }),
				0.1,
				size,
				size
			),
			new Box(
				center.clone().add(0, 0, -half_size),
				9999999,
				new THREE.MeshBasicMaterial({ color: 0x0000ff }),
				0.1,
				size,
				size
			)
		];

		console.log(this.bodies);
	}

	syncVisual() {
		for (let i = 0; i < this.bodies.length; i++)
			this.bodies[i].visualBody.position.copy(this.bodies[i].body.x);
	}
}
