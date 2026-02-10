import * as MATH from './math.js';
import * as COLLIDERS from './collider.js';

export class RigidBody {
	constructor(mass, isTrigger = false) {
		this.m = mass;
		this.v = MATH.ZERO.clone();
		this.f = MATH.ZERO.clone();
		this.transform = new COLLIDERS.Transform();
		this.col = undefined;
		this.isTrigger = isTrigger;
	}

	get x() {
		return this.transform.position;
	}

	get rotation() {
		return this.transform.rotation;
	}

	get scale() {
		return this.transform.scale;
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
			body.x.add(dx.get(j++), dx.get(j++), dx.get(j++));
			body.v.add(dx.get(j++), dx.get(j++), dx.get(j++));
		}
	}

	getDerivative() {
		for (const body of this.bodies.values()) body.f.zero();

		for (const force of this.forces) force.applyForce();

		const ret = new MATH.Vector(this.dim);
		let j = 0;

		for (const body of this.bodies.values()) {
			ret.load(j, body.v);
			j += 3;
			ret.load(j, body.f.clone().scale(1 / body.m));
			j += 3;
		}

		return ret;
	}

	// for right now, basic O(N^2) checks, replace later with AABB
	checkColliders() {
		const bodies = Array.from(this.bodies.values());

		for (let i = 0; i < bodies.length; i++) {
			if (bodies[i].col === undefined) continue;

			for (let j = i + 1; j < bodies.length; j++) {
				if (bodies[j].col === undefined) continue;

				let i_then_j = true;
				let result = bodies[i].col.checkCollision(bodies[j].col);
				if (result === undefined) {
					i_then_j = false;
					result = bodies[j].col.checkCollision(bodies[i].col);
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

				A.col.onCollisionCallback?.(A, B);
				B.col.onCollisionCallback?.(B, A);

				if (A.isTrigger || B.isTrigger) continue;

				const [normal, depth] = COLLIDERS.EPA(result.simplex, A.col, B.col);

				COLLIDERS.resolveImpulseCollision(A, B, normal, depth);
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
