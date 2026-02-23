
export class CustomForceApplier {
	constructor(forceApplier) {
		this.applier = forceApplier;
	}

	apply(f) {
		this.applier(f);
	}
}

// ALL DEPRACATED BELOW DO NOT USE WITHOUT UPDATING

export class Drag {
	constructor(dragCoefficient, bodies) {
		this.k = dragCoefficient;
		this.bodies = bodies;
	}

	applyForce() {
		for (const body of this.bodies.values()) {
			const v = body.v.clone();

			v.scale(-this.k * body.m);
			body.f.addVec(v);
		}
	}
}

export class Gravity {
	constructor(gravity, bodies) {
		this.g = gravity;
		this.bodies = bodies;
	}

	applyForce() {
		for (let i = 0; i < this.bodies.length; i++) {
			const weight = this.g * this.bodies[i].m;
			this.bodies[i].f.y -= weight;
		}
	}
}
