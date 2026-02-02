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

export class BodyForceApplier {
	constructor(body, applier) {
		this.force = body.f;
		this.applier = applier;
	}

	applyForce() {
		this.applier( this.force );
	}

}