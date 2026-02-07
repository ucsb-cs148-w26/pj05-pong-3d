export class GoalParticleSystem {
	constructor({ positions, velocities, sizes, count, drag = 0.98 }) {
		this.positions = positions;
		this.velocities = velocities;
		this.sizes = sizes;
		this.count = count;
		this.drag = drag;
	}

	init(initializerFn) {
		if (typeof initializerFn !== 'function') return;
		for (let i = 0; i < this.count; i++) {
			initializerFn(i, this);
		}
	}

	update(dt) {
		if (!this.positions || !this.velocities) return;
		for (let i = 0; i < this.count; i++) {
			const idx = i * 3;
			this.positions[idx] += this.velocities[idx] * dt;
			this.positions[idx + 1] += this.velocities[idx + 1] * dt;
			this.positions[idx + 2] += this.velocities[idx + 2] * dt;

			this.velocities[idx] *= this.drag;
			this.velocities[idx + 1] *= this.drag;
			this.velocities[idx + 2] *= this.drag;
		}
	}

	markDirty(geometry) {
		if (!geometry?.attributes) return;
		if (geometry.attributes.position) {
			geometry.attributes.position.needsUpdate = true;
		}
		if (geometry.attributes.aSize) {
			geometry.attributes.aSize.needsUpdate = true;
		}
	}
}
