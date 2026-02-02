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
		this.col?.applyTransform(transform);
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
		this.bodies = new Map();
		this.forces = [];
		this.t = 0.0;
	}

	get dim() {
		return 6 * this.bodies.size;
	}

	getState() {
		const ret = new MATH.Vector(this.dim);
		let j = 0;

		for (const body of this.bodies.values()) {
			ret.load(j, body.x);
			j += 3;
			ret.load(j, body.v);
			j += 3;
		}

		return ret;
	}

	updateState(dx) {
		let j = 0;
		for (const body of this.bodies.values()) {
			let dx_x = dx.get(j++);
			let dx_y = dx.get(j++);
			let dx_z = dx.get(j++);

			body.applyTransform((vec) => vec.add(dx_x, dx_y, dx_z));
			body.v.add(dx.get(j++), dx.get(j++), dx.get(j++));
		}
	}

	getDerivative() {
		for (const body of this.bodies.values()) body.f.zero();

		for (const force of this.forces) force.applyForce();

		const ret = new MATH.Vector(this.dim);
		let j = 0;

		for (const body of this.bodies.values()) {
			ret.load(j, body.v); j += 3;
			ret.load(j, body.f.clone().scale(1 / body.m)); j += 3;
		}

		return ret;
	}

	// for right now, basic O(N^2) checks, replace later with AABB
	checkColliders() {
		const bodies = Array.from(this.bodies.values());

		for (let i = 0; i < bodies.length; i++) {
			if ( bodies[i].col === undefined ) continue;

			for (let j = i + 1; j < bodies.length; j++) {
				if ( bodies[j].col === undefined ) continue;

				let i_then_j = true;
				let result = bodies[i].col.checkCollision(bodies[j].col);
				if (result === undefined) {
					i_then_j = false;
					result = bodies[j].col.checkCollision(bodies[j].col);
					if (result === undefined)
						throw new Error(
							`Some two collision objects don't support collision against each other`
						);
				}

				if (!result.hit) continue;

				let A = null,
					B = null;
				if (i_then_j) {
					A = bodies[i];
					B = bodies[j];
				} else {
					A = bodies[j];
					B = bodies[i];
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

	registerForce(...force) {
		this.forces.push(...force);
	}

	registerBody(key, body) {
		this.bodies.set(key, body);
	}

}
