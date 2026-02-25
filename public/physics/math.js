// Basic vector class, holds N floats
export class Vector {
	constructor(dimension = 0) {
		this.data = new Float32Array(dimension);
	}

	get(idx) {
		return this.data[idx];
	}
	set(idx, value) {
		this.data[idx] = value;
	}

	zero() {
		for (let i = 0; i < this.data.length; i++) this.data[i] = 0.0;
	}

	norm() {
		let acc = 0.0;
		for (let i = 0; i < this.data.length; i++)
			acc += this.data[i] * this.data[i];
		return Math.sqrt(acc);
	}

	normalize() {
		const norm = this.norm();
		if (norm === 0) return this;
		return this.scale(1 / norm);
	}

	load(idx, vec) {
		for (let i = 0; i < vec.data.length; ++i) this.data[idx + i] = vec.data[i];
	}

	slice(idx, len) {
		const ret = new Vector(len);
		for (let i = 0; i < ret.data.length; i++) ret.data[i] = this.data[idx + i];
		return ret;
	}

	get dim() {
		return this.data.length;
	}

	addVec(other) {
		if (other.data.length !== this.data.length)
			throw new Error(' dimension need to match to add vectors ');

		for (let i = 0; i < other.data.length; i++) this.data[i] += other.data[i];

		return this;
	}

	subVec(other) {
		if (other.data.length !== this.data.length)
			throw new Error(' dimension need to match to sub vectors ');

		for (let i = 0; i < other.data.length; i++) this.data[i] -= other.data[i];

		return this;
	}

	scale(scalar) {
		for (let i = 0; i < this.dim; i++) this.data[i] *= scalar;

		return this;
	}

	clone() {
		const ret = new Vector(this.dim);

		for (let i = 0; i < this.dim; i++) ret.data[i] = this.data[i];

		return ret;
	}

	approxEquals(other, eps = 1e-3) {
		for (let i = 0; i < this.dim; i++) {
			if (Math.abs(ret.data[i] - other.data[i]) > eps) return false;
		}

		return true;
	}

	[Symbol.iterator]() {
		return this.data[Symbol.iterator]();
	}

	values() {
		return this.data.values();
	}

	entries() {
		return this.data.entries();
	}

	static dot(a, b) {
		if (a.dim !== b.dim)
			throw new Error(' dot product requires vectors of equal dim ');
		let acc = 0.0;
		for (let i = 0; i < a.dim; i++) acc += a.get(i) * b.get(i);
		return acc;
	}
}

export class Vec3 extends Vector {
	constructor(x = 0, y = 0, z = 0) {
		super(3);
		this.data[0] = x;
		this.data[1] = y;
		this.data[2] = z;
	}

	get x() {
		return this.data[0];
	}
	get y() {
		return this.data[1];
	}
	get z() {
		return this.data[2];
	}

	set x(value) {
		this.data[0] = value;
	}
	set y(value) {
		this.data[1] = value;
	}
	set z(value) {
		this.data[2] = value;
	}

	static fromVector(vec) {
		assert(vec.dim === 3);
		return new Vec3(vec.data[0], vec.data[1], vec.data[2]);
	}

	assign(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}

	clone() {
		return new Vec3(this.x, this.y, this.z);
	}

	add(x, y, z) {
		this.x += x;
		this.y += y;
		this.z += z;
		return this;
	}
	sub(x, y, z) {
		this.x -= x;
		this.y -= y;
		this.z -= z;
		return this;
	}

	static cross(a, b) {
		let x = a.y * b.z - a.z * b.y;
		let y = a.z * b.x - a.x * b.z;
		let z = a.x * b.y - a.y * b.x;

		return new Vec3(x, y, z);
	}

	static tripleCross(a, b, c) {
		return Vec3.cross(Vec3.cross(a, b), c);
	}
}

export class Vec4 extends Vector {
	constructor(x = 0, y = 0, z = 0, w = 0) {
		super(4);
		this.data[0] = x;
		this.data[1] = y;
		this.data[2] = z;
		this.data[3] = w;
	}

	static fromVec3(vec3, w = 0) {
		return new Vec4(vec3.x, vec3.y, vec3.z, w);
	}

	xyz() {
		return new Vec3(this.x, this.y, this.z);
	}

	get x() {
		return this.data[0];
	}
	get y() {
		return this.data[1];
	}
	get z() {
		return this.data[2];
	}
	get w() {
		return this.data[3];
	}

	set x(value) {
		this.data[0] = value;
	}
	set y(value) {
		this.data[1] = value;
	}
	set z(value) {
		this.data[2] = value;
	}
	set w(value) {
		this.data[3] = value;
	}
}

export class Quaternion extends Vec4 {
	constructor(x = 0, y = 0, z = 0, w = 1) {
		super(4);
		this.data[0] = x;
		this.data[1] = y;
		this.data[2] = z;
		this.data[3] = w;

		this.normalize();
	}

	static fromAxisAngle(axis, angleRad) {
		const unitAxis = axis.normalize();
		const half = angleRad / 2;
		const s = Math.sin(half);

		return new Quaternion(
			unitAxis.x * s,
			unitAxis.y * s,
			unitAxis.z * s,
			Math.cos(half)
		).normalize();
	}

	multiply(q) {
		const ax = this.x,
			ay = this.y,
			az = this.z,
			aw = this.w;
		const bx = q.x,
			by = q.y,
			bz = q.z,
			bw = q.w;

		this.x = aw * bx + ax * bw + ay * bz - az * by;
		this.y = aw * by - ax * bz + ay * bw + az * bx;
		this.z = aw * bz + ax * by - ay * bx + az * bw;
		this.w = aw * bw - ax * bx - ay * by - az * bz;

		return this.normalize();
	}

	rotateVec3InPlace(vec3) {
		const ux = this.x;
		const uy = this.y;
		const uz = this.z;
		const s = this.w;

		const vx = vec3.x;
		const vy = vec3.y;
		const vz = vec3.z;

		const dotUV = ux * vx + uy * vy + uz * vz;
		const dotUU = ux * ux + uy * uy + uz * uz;

		const cx = uy * vz - uz * vy;
		const cy = uz * vx - ux * vz;
		const cz = ux * vy - uy * vx;

		vec3.assign(
			2.0 * dotUV * ux + (s * s - dotUU) * vx + 2.0 * s * cx,

			2.0 * dotUV * uy + (s * s - dotUU) * vy + 2.0 * s * cy,

			2.0 * dotUV * uz + (s * s - dotUU) * vz + 2.0 * s * cz
		);

		return vec3;
	}
}

export const ZERO = new Vec3();
export const RIGHT = new Vec3(1);
export const LEFT = new Vec3(-1);
export const FORWARD = new Vec3(0, 1);
export const BACKWARD = new Vec3(0, -1);
export const UP = new Vec3(0, 0, 1);
export const DOWN = new Vec3(0, 0, -1);
