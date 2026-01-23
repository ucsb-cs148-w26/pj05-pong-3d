import * as MATH from './math.js';
import * as COLLIDERS from './collider.js';

export class RigidBody {
	constructor(mass, collider) {
		this.m = mass;
		this.x = MATH.ZERO.clone();
		this.v = MATH.ZERO.clone();
		this.f = MATH.ZERO.clone();
		this.col = collider;
	}

	applyTransform(transform) {
		transform(this.x);
		if (this.col) this.col.applyTransform(transform);
	}
}

// "abstract" Force class.
// It is helpful to inherit from Force for clarity, but as long as an applyForce is exposed,
// it can serve as a Force.
export class Force {
	applyForce() {
		throw new Error('Method applyForce() needs to be implemented.');
	}
}

export class PhysicsEngine {
	constructor() {
		this.bodies = [];
		this.colliders = [];
		this.forces = [];
		this.t = 0.0;
	}

	get dim() {
		return 6 * this.bodies.length;
	}

	getState() {
		const ret = new MATH.Vector(this.dim);
		let j = 0;

		for (let i = 0; i < this.bodies.length; i++) {
			ret.load(j, this.bodies[i].x);
			j += 3;
			ret.load(j, this.bodies[i].v);
			j += 3;
		}

		return ret;
	}

	updateState(dx) {
		let j = 0;
		for (let i = 0; i < this.bodies.length; i++) {
			let dx_x = dx.get(j++);
			let dx_y = dx.get(j++);
			let dx_z = dx.get(j++);

			this.bodies[i].applyTransform((vec) => vec.add(dx_x, dx_y, dx_z));
			this.bodies[i].v.add(dx.get(j++), dx.get(j++), dx.get(j++));
		}
	}

	getDerivative() {
		for (let i = 0; i < this.bodies.length; i++) this.bodies[i].f.zero();

		for (let i = 0; i < this.forces.length; i++) this.forces[i].applyForce();

		const ret = new MATH.Vector(this.dim);
		let j = 0;

		for (let i = 0; i < this.bodies.length; i++) {
			ret.load(j, this.bodies[i].v);
			j += 3;
			ret.load(j, this.bodies[i].f.clone().scale(1 / this.bodies[i].m));
			j += 3;
		}

		return ret;
	}

	// for right now, basic O(N^2) checks, replace later with AABB

	checkColliders() {
		for (let i = 0; i < this.colliders.length; i++) {
			for (let j = i + 1; j < this.colliders.length; j++) {
				let i_then_j = true;
				let result = this.colliders[i].checkCollision(this.colliders[j]);
				if (result === undefined) {
					i_then_j = false;
					result = this.colliders[j].checkCollision(this.colliders[i]);
					if (result === undefined)
						throw new Error(
							`Some two collision objects don't support collision against each other`
						);
				}

				if (!result.hit) continue;

				let A = null,
					B = null;
				if (i_then_j) {
					A = this.bodies[i];
					B = this.bodies[j];
				} else {
					A = this.bodies[j];
					B = this.bodies[i];
				}

				COLLIDERS.resolveCollision(A, B, result.normal);
			}
		}
	}

	// improve accuracy later, ok for now

	step(dt) {
		this.updateState(this.getDerivative().scale(dt));

		this.t += dt;
	}

	registerForce(force) {
		this.forces.push(force);
	}

	registerBody(body) {
		this.bodies.push(body);
	}

	registerCollider(col) {
		this.colliders.push(col);
	}
}
