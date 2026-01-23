import * as MATH from './math.js';

export function isCoplanar(vertices) {
	if (vertices.length < 3) return true;

	let v1 = vertices[1].clone().subVec(vertices[0]);
	let v2 = vertices[2].clone().subVec(vertices[0]);
	let n = MATH.Vec3.cross(v1, v2);

	if (Math.abs(n.norm()) < 1e-3)
		throw new Error('All triplets of a vertex list must not be colinear');

	for (let i = 1; i < vertices.length; i++) {
		if (
			Math.abs(MATH.Vec3.dot(n, vertices[i].clone().subVec(vertices[0]))) > 1e-3
		)
			return false;
	}

	return true;
}

export class Polygon {
	constructor(vertices) {
		if (!isCoplanar(vertices))
			throw new Error(
				"Polygon must be coplanar. Vertices should be an array of Vec3's specifying vertices."
			);

		this.v = vertices;
		this.normal = null;
		this.d = null;
	}

	updateNormal() {
		const n = this.v.length;

		let nx = 0,
			ny = 0,
			nz = 0;

		for (let i = 0; i < n; i++) {
			const curr = this.v[i];
			const next = this.v[(i + 1) % n];

			nx += (curr.y - next.y) * (curr.z + next.z);
			ny += (curr.z - next.z) * (curr.x + next.x);
			nz += (curr.x - next.x) * (curr.y + next.y);
		}

		this.normal = new MATH.Vec3(nx, ny, nz).normalize();
	}

	updatePlaneD() {
		if (!this.normal) this.updateNormal();

		const p = this.v[0];
		this.d = -MATH.Vector.dot(this.normal, p);
	}

	applyTransform(transform) {
		for (let i = 0; i < this.v.length; i++) transform(this.v[i]);
		this.updateNormal();
		this.updatePlaneD();
	}
}

function isConvexPolyhedron(faces, eps = 1e-6) {
	const vertices = [];
	for (const face of faces) for (const v of face.v) vertices.push(v);

	for (const face of faces) {
		if (!face.normal) face.updateNormal();
		if (face.d === null) face.updatePlaneD();

		let hasPos = false;
		let hasNeg = false;

		for (const v of vertices) {
			const dist = MATH.Vec3.dot(face.normal, v) + face.d;
			if (dist > eps) hasPos = true;
			else if (dist < -eps) hasNeg = true;

			if (hasPos && hasNeg) return false;
		}
	}

	return true;
}

function vertexKey(v, eps) {
	return (
		Math.round(v.x / eps) +
		',' +
		Math.round(v.y / eps) +
		',' +
		Math.round(v.z / eps)
	);
}

function collectCanonicalVertices(faces, eps = 1e-6) {
	const map = new Map();
	const verts = [];

	for (const face of faces) {
		for (const v of face.v) {
			const key = vertexKey(v, eps);

			if (map.has(key)) continue;

			map.set(key, v.clone());
			verts.push(map.get(key));
		}
	}

	return verts;
}

function supportMinkowski(A, B, dir) {
	const pA = A.support(dir);
	const pB = B.support(dir.clone().scale(-1));
	return pA.clone().subVec(pB);
}

function tripleCross(a, b, c) {
	return MATH.Vec3.cross(MATH.Vec3.cross(a, b), c);
}

function doSimplex(simplex, dir) {
	const A = simplex[simplex.length - 1];
	const AO = A.clone().scale(-1);

	if (simplex.length === 2) {
		const B = simplex[0];
		const AB = B.clone().subVec(A);

		if (MATH.Vec3.dot(AB, AO) > 0) {
			const newDir = tripleCross(AB, AO, AB);
			return { hit: false, dir: newDir };
		}

		simplex.splice(0, 1);
		return { hit: false, dir: AO };
	}

	if (simplex.length === 3) {
		const C = simplex[0];
		const B = simplex[1];

		const AB = B.clone().subVec(A);
		const AC = C.clone().subVec(A);

		const ABC = MATH.Vec3.cross(AB, AC);

		const abPerp = MATH.Vec3.cross(ABC, AB);
		if (MATH.Vec3.dot(abPerp, AO) > 0) {
			simplex.splice(0, 1);
			return { hit: false, dir: tripleCross(AB, AO, AB) };
		}

		const acPerp = MATH.Vec3.cross(AC, ABC);
		if (MATH.Vec3.dot(acPerp, AO) > 0) {
			simplex.splice(1, 1);
			return { hit: false, dir: tripleCross(AC, AO, AC) };
		}

		if (MATH.Vec3.dot(ABC, AO) > 0) return { hit: false, dir: ABC };

		simplex[0] = B;
		simplex[1] = C;
		return { hit: false, dir: ABC.clone().scale(-1) };
	}

	if (simplex.length === 4) {
		const D = simplex[0];
		const C = simplex[1];
		const B = simplex[2];

		const AB = B.clone().subVec(A);
		const AC = C.clone().subVec(A);
		const AD = D.clone().subVec(A);

		const ABC = MATH.Vec3.cross(AB, AC);
		const ACD = MATH.Vec3.cross(AC, AD);
		const ADB = MATH.Vec3.cross(AD, AB);

		if (MATH.Vec3.dot(ABC, AO) > 0) {
			simplex.splice(0, 1);
			return { hit: false, dir: ABC };
		}

		if (MATH.Vec3.dot(ACD, AO) > 0) {
			simplex.splice(2, 1);
			return { hit: false, dir: ACD };
		}

		if (MATH.Vec3.dot(ADB, AO) > 0) {
			simplex.splice(1, 1);
			return { hit: false, dir: ADB };
		}

		return { hit: true, dir };
	}

	return { hit: false, dir };
}

export class ConvexPolyhedralCollider {
	constructor(faces) {
		if (!isConvexPolyhedron(faces))
			throw new Error('polyhedron must be convex');

		this.faces = faces;
		this.vertices = collectCanonicalVertices(faces);
	}

	support(dir) {
		let best = this.vertices[0];
		let bestDot = MATH.Vec3.dot(best, dir);

		for (let i = 1; i < this.vertices.length; i++) {
			const v = this.vertices[i];
			const d = MATH.Vec3.dot(v, dir);
			if (d > bestDot) {
				bestDot = d;
				best = v;
			}
		}

		return best;
	}

	applyTransform(transform) {
		for (let i = 0; i < this.faces.length; i++)
			this.faces[i].applyTransform(transform);
		this.vertices = collectCanonicalVertices(this.faces);
	}

	gjkIntersecting(otherCvxPoly, maxIters = 50, eps = 1e-9) {
		let d = new MATH.Vec3(1, 0, 0);
		let lastValidDir = d.clone();

		const simplex = [];

		let a = supportMinkowski(this, otherCvxPoly, d);
		simplex.push(a);
		d = a.clone().scale(-1);

		for (let iter = 0; iter < maxIters; iter++) {
			if (d.norm() > eps) lastValidDir = d.clone();

			a = supportMinkowski(this, otherCvxPoly, d);

			if (MATH.Vec3.dot(a, d) < 0) return { hit: false };

			simplex.push(a);

			const out = doSimplex(simplex, d);
			if (out.hit)
				return {
					hit: true,
					normal:
						d.norm() > eps ? d.clone().normalize() : lastValidDir.normalize()
				};

			d = out.dir;

			if (d.norm() <= eps)
				return { hit: true, normal: lastValidDir.normalize() };
		}

		return { hit: true, normal: lastValidDir.normalize() };
	}

	// visitor system for collision
	// checkCollision is the accept condition, and each must expose a checkCollision_<type> to check collision against
	// a known type. if it returns null, it doesn't (yet?) support collisions against the visiting object.

	checkCollision(otherCol) {
		return otherCol.checkCollision_ConvexPolyhedral?.(this);
	}

	checkCollision_ConvexPolyhedral(otherCvxPoly) {
		return this.gjkIntersecting(otherCvxPoly);
	}
}

export function resolveCollision(bodyA, bodyB, normal) {
	const rv = bodyA.v.clone().subVec(bodyB.v);
	const velAlongNormal = MATH.Vec3.dot(rv, normal);

	if (velAlongNormal > 0) return;

	const e = 0.5;
	const invMassA = 1 / bodyA.m;
	const invMassB = bodyB ? 1 / bodyB.m : 0;

	const j = (-(1 + e) * velAlongNormal) / (invMassA + invMassB);

	const impulse = normal.clone().scale(j);

	bodyA.v.addVec(impulse.clone().scale(invMassA));
	if (bodyB) bodyB.v.subVec(impulse.clone().scale(invMassB));
}

export function orientCollisionNormal(bodyA, bodyB, normal) {
	const rv = bodyA.v.clone().subVec(bodyB.v);

	if (MATH.Vec3.dot(rv, normal) > 0) normal.scale(-1);

	return normal;
}

export function positionalCorrection(bodyA, bodyB, normal) {
	const percent = 0.2;
	const slop = 0.01;

	const correction = normal.clone().scale(percent * slop);

	bodyA.x.addVec(correction);
	bodyB.x.subVec(correction);
}

export class BoxCollider extends ConvexPolyhedralCollider {
	constructor(center = new MATH.Vec3(), l = 1, w = 1, h = 1) {
		if (l <= 0 || w <= 0 || h <= 0)
			throw new Error("box can't have negative length/width/height");

		const half_l = l / 2;
		const half_w = w / 2;
		const half_h = h / 2;

		super([
			new Polygon([
				center.clone().add(half_l, half_h, half_w),
				center.clone().add(half_l, half_h, -half_w),
				center.clone().add(-half_l, half_h, -half_w),
				center.clone().add(-half_l, half_h, half_w)
			]),
			new Polygon([
				center.clone().add(half_l, -half_h, half_w),
				center.clone().add(half_l, -half_h, -half_w),
				center.clone().add(-half_l, -half_h, -half_w),
				center.clone().add(-half_l, -half_h, half_w)
			]),
			new Polygon([
				center.clone().add(half_l, half_h, half_w),
				center.clone().add(half_l, -half_h, half_w),
				center.clone().add(half_l, -half_h, -half_w),
				center.clone().add(half_l, half_h, -half_w)
			]),
			new Polygon([
				center.clone().add(-half_l, half_h, half_w),
				center.clone().add(-half_l, -half_h, half_w),
				center.clone().add(-half_l, -half_h, -half_w),
				center.clone().add(-half_l, half_h, -half_w)
			]),
			new Polygon([
				center.clone().add(half_l, half_h, half_w),
				center.clone().add(half_l, -half_h, half_w),
				center.clone().add(-half_l, -half_h, half_w),
				center.clone().add(-half_l, half_h, half_w)
			]),
			new Polygon([
				center.clone().add(half_l, half_h, -half_w),
				center.clone().add(half_l, -half_h, -half_w),
				center.clone().add(-half_l, -half_h, -half_w),
				center.clone().add(-half_l, half_h, -half_w)
			])
		]);

		this.l = l;
		this.w = w;
		this.h = h;
		this.center = center;
	}

	applyTransform(transform) {
		transform(this.center);
		super.applyTransform(transform);
	}
}

export class SphereCollider {
	constructor(center, radius) {
		if (radius <= 0) throw new Error('Radius must be pos');
		this.center = center;
		this.radius = radius;
	}

	support(dir) {
		const d = dir.clone();
		const n = d.norm();
		if (n > 1e-9) d.scale(1 / n);
		return this.center.clone().addVec(d.scale(this.radius));
	}

	applyTransform(transform) {
		transform(this.center);
	}

	checkCollision(otherCol) {
		return otherCol.checkCollision_Sphere?.(this);
	}

	checkCollision_Sphere(other) {
		const delta = this.center.clone().subVec(other.center);
		const dist = delta.norm();
		const r = this.radius + other.radius;

		if (dist >= r) return { hit: false };

		const normal = dist > 1e-9 ? delta.scale(1 / dist) : new MATH.Vec3(1, 0, 0);

		return { hit: true, normal };
	}

	checkCollision_ConvexPolyhedral(box) {
		let closest = this.center.clone();

		for (const face of box.faces) {
			if (!face.normal) face.updateNormal();
			if (face.d === null) face.updatePlaneD();

			const dist = MATH.Vec3.dot(face.normal, closest) + face.d;

			if (dist > 0) closest.subVec(face.normal.clone().scale(dist));
		}

		const delta = this.center.clone().subVec(closest);
		const distSq = MATH.Vec3.dot(delta, delta);

		if (distSq > this.radius * this.radius) return { hit: false };

		const dist = Math.sqrt(distSq);
		const normal = dist > 1e-9 ? delta.scale(1 / dist) : new MATH.Vec3(1, 0, 0);

		return { hit: true, normal };
	}
}
