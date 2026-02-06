import * as MATH from './math.js';

export class Transform {
	constructor(posRef) {
		this.position = posRef;
		this.rotation = new MATH.Quaternion(0, 0, 0, 1);
		this.scale = new MATH.Vec3(1, 1, 1);
	}

	shift(dx) {
		this.position.addVec(dx);
	}

	rotate(dv) {
		if (dv.x !== 0) {
			const qx = MATH.Quaternion.fromAxisAngle(Vec3.RIGHT, dv.x);
			this.rotation.multiply(qx);
		}

		if (dv.y !== 0) {
			const qy = MATH.Quaternion.fromAxisAngle(Vec3.UP, dv.y);
			this.rotation.multiply(qy);
		}

		if (dv.z !== 0) {
			const qz = MATH.Quaternion.fromAxisAngle(Vec3.FORWARD, dv.z);
			this.rotation.multiply(qz);
		}
	}

	applyInPlace(vec3) {
		vec3.x *= this.scale.x;
		vec3.y *= this.scale.y;
		vec3.z *= this.scale.z;

		this.rotation.rotateVec3InPlace(vec3);

		vec3.addVec(this.position);
	}

	apply(vec3) {
		const nv3 = vec3.clone();
		this.applyInPlace(nv3);
		return nv3;
	}
}

/*

**Note**: ConvexPolyhedron should be VERY carefully defined.
You should probably make subclasses inherit from ConvexPolyhedron that define a layout based on params.
(for example, Cube sends 8 vertices up to the convex poly based on l, w, h).
This is because there's no checks for convexity; if a shape fails convexity, I have no idea what happens.

*/

export class ConvexPolyhedron {
	constructor(
		vertices,
		transform,
		onCollisionCallback = undefined,
		center = undefined
	) {
		this.vertices = vertices;
		this.transform = transform;
		this.onCollisionCallback = onCollisionCallback;
		this.center = center;
	}

	furthestPoint(direction) {
		let maxPt;
		let maxDist = -Infinity;

		for (const vertex of this.vertices) {
			const v = this.transform.apply(vertex);

			let dist = MATH.Vector.dot(v, direction);
			if (dist > maxDist) {
				maxDist = dist;
				maxPt = v;
			}
		}

		return maxPt;
	}

	/*
	Visitor system to allow "knowledge of types" without types. If an object has this defined and it gets called,
	the object passed in can be assumed to be a convex polyhedron.
	*/
	checkCollision(otherCol) {
		return otherCol.checkCollision_ConvexPolyhedron?.(this);
	}

	checkCollision_ConvexPolyhedron(cvxPolyCol) {
		return gjk(this, cvxPolyCol);
	}
}

function support(colA, colB, d) {
	if (!d || d.norm() < 1e-8) d = new MATH.Vec3(1, 0, 0);

	const p1 = colA.furthestPoint(d);
	const p2 = colB.furthestPoint(d.clone().scale(-1));

	return p1.clone().subVec(p2);
}

function sameDirection(dir, ao) {
	return MATH.Vector.dot(dir, ao) > 0;
}

class SimplexHandler {
	constructor(firstSimplexPt, direction) {
		this.simplex = [firstSimplexPt];
		this.d = direction;
	}

	handle() {
		switch (this.simplex.length) {
			case 2:
				return this.#line();
			case 3:
				return this.#triangle();
			case 4:
				return this.#tetrahedron();
		}

		throw new Error('bruh the simplex machine brok');
	}

	#line() {
		const [A, B] = this.simplex;
		const ab = B.clone().subVec(A);
		const ao = A.clone().scale(-1);

		// maybe need extra work here?
		if (sameDirection(ab, ao)) {
			this.d = MATH.Vec3.tripleCross(ab, ao, ab);
			if (this.d.norm() < 1e-8) this.d = ao;
		} else {
			this.simplex = [A];
			this.d = ao;
		}

		return false;
	}

	#triangle() {
		const [A, B, C] = this.simplex;

		const ab = B.clone().subVec(A);
		const ac = C.clone().subVec(A);
		const ao = A.clone().scale(-1);

		const abc = MATH.Vec3.cross(ab, ac);

		if (sameDirection(MATH.Vec3.cross(abc, ac), ao)) {
			if (sameDirection(ac, ao)) {
				this.simplex = [A, C];
				this.d = MATH.Vec3.tripleCross(ac, ao, ac);
			} else {
				this.simplex = [A, B];
				return this.#line();
			}
		} else {
			if (sameDirection(MATH.Vec3.cross(ab, abc), ao)) {
				this.simplex = [A, B];
				return this.#line();
			} else {
				if (sameDirection(abc, ao)) this.d = abc;
				else {
					this.simplex = [A, C, B];
					this.d = abc.clone().scale(-1);
				}
			}
		}

		return false;
	}

	#tetrahedron() {
		const [A, B, C, D] = this.simplex;

		const ab = B.clone().subVec(A);
		const ac = C.clone().subVec(A);
		const ad = D.clone().subVec(A);
		const ao = A.clone().scale(-1);

		const abc = MATH.Vec3.cross(ab, ac);
		const acd = MATH.Vec3.cross(ac, ad);
		const adb = MATH.Vec3.cross(ad, ab);

		if (sameDirection(abc, ao)) {
			this.simplex = [A, B, C];
			return this.#triangle();
		}

		if (sameDirection(acd, ao)) {
			this.simplex = [A, C, D];
			return this.#triangle();
		}

		if (sameDirection(adb, ao)) {
			this.simplex = [A, D, B];
			return this.#triangle();
		}

		return true;
	}
}

function gjk(colA, colB, maxiters = 50) {
	let initDir;
	if (colA.center && colB.center) {
		initDir = colB.center.clone().subVec(colA.center);
		if (initDir.norm() < 1e-8) initDir = new MATH.Vec3(1);
		else initDir.normalize();
	} else initDir = new MATH.Vec3(1);

	const tmpSupport = support(colA, colB, initDir);

	const simplexHandler = new SimplexHandler(
		tmpSupport,
		tmpSupport.clone().scale(-1)
	);

	for (let i = 0; i < maxiters; ++i) {
		const sup = support(colA, colB, simplexHandler.d);
		if (!sup) return { hit: false };

		if (MATH.Vector.dot(sup, simplexHandler.d) < 0) return { hit: false };

		simplexHandler.simplex.unshift(sup); // maybe optimize? probably chill since is max len 4

		if (simplexHandler.handle())
			return { hit: true, simplex: simplexHandler.simplex };
	}

	return false;
}

export class BoxCollider extends ConvexPolyhedron {
	constructor(l, w, h, transform, callback) {
		const halfL = l / 2;
		const halfW = w / 2;
		const halfH = h / 2;

		const vtxs = [
			new MATH.Vec3(-halfL, -halfW, -halfH),
			new MATH.Vec3(-halfL, halfW, -halfH),
			new MATH.Vec3(halfL, -halfW, -halfH),
			new MATH.Vec3(halfL, halfW, -halfH),
			new MATH.Vec3(-halfL, -halfW, halfH),
			new MATH.Vec3(-halfL, halfW, halfH),
			new MATH.Vec3(halfL, -halfW, halfH),
			new MATH.Vec3(halfL, halfW, halfH)
		];

		super(vtxs, transform, callback, transform.position);
	}
}

function getFaceNormals(polytope, faces) {
	const normals = [];
	let minFace = 0;
	let minDistance = Infinity;

	for (let i = 0; i < faces.length; i += 3) {
		const a = polytope[faces[i + 0]];
		const b = polytope[faces[i + 1]];
		const c = polytope[faces[i + 2]];

		const ab = b.clone().subVec(a);
		const ac = c.clone().subVec(a);

		let normal = MATH.Vec3.cross(ab, ac).normalize();
		let distance = MATH.Vector.dot(normal, a);

		if (distance < 0) {
			normal.scale(-1);
			distance = -distance;
		}

		const face = new MATH.Vector(4);
		face.set(0, normal.x);
		face.set(1, normal.y);
		face.set(2, normal.z);
		face.set(3, distance);

		normals.push(face);

		if (distance < minDistance) {
			minDistance = distance;
			minFace = normals.length - 1;
		}
	}

	return { normals, minFace };
}

function addIfUniqueEdge(edges, faces, a, b) {
	const edgeA = faces[a];
	const edgeB = faces[b];

	for (let i = 0; i < edges.length; i++) {
		const [e0, e1] = edges[i];

		if (e0 === edgeB && e1 === edgeA) {
			edges.splice(i, 1);
			return;
		}
	}

	edges.push([edgeA, edgeB]);
}

export function EPA(simplex, colA, colB) {
	const polytope = [...simplex];

	const faces = [0, 1, 2, 0, 3, 1, 0, 2, 3, 1, 3, 2];

	const res = getFaceNormals(polytope, faces);
	const normals = res.normals;
	let minFace = res.minFace;

	let minNormal;
	let minDist = Infinity;

	while (minDist == Infinity) {
		const v4 = normals[minFace];
		minNormal = new MATH.Vec3(v4.get(0), v4.get(1), v4.get(2));
		minDist = v4.get(3);

		const sup = support(colA, colB, minNormal);
		if (!sup) {
			console.warn('bruh epa seems to have bugged a bit');
			break;
		}

		const sDist = MATH.Vector.dot(minNormal, sup);

		if (sDist > minDist + 1e-6) {
			minDist = Infinity;

			const uniqueEdges = [];

			for (let i = 0; i < normals.length; ++i) {
				const v4to3 = new MATH.Vec3(normals[i].x, normals[i].y, normals[i].z);

				if (MATH.Vec3.dot(v4to3, sup) > normals[i].get(3) + 1e-6) {
					const f = i * 3;

					addIfUniqueEdge(uniqueEdges, faces, f, f + 1);
					addIfUniqueEdge(uniqueEdges, faces, f + 1, f + 2);
					addIfUniqueEdge(uniqueEdges, faces, f + 2, f);

					faces[f + 2] = faces.pop();
					faces[f + 1] = faces.pop();
					faces[f] = faces.pop();

					normals[i] = normals.pop();

					i--;
				}
			}

			const newFaces = [];

			for (const [ei1, ei2] of uniqueEdges) {
				newFaces.push(ei1, ei2, polytope.length);
			}

			polytope.push(sup);

			const newres = getFaceNormals(polytope, newFaces);
			const newNormals = newres.normals;
			const newMinFace = newres.minFace;

			let oldMinDistance = Infinity;
			for (let i = 0; i < normals.length; i++) {
				if (normals[i].get(3) < oldMinDistance) {
					oldMinDistance = normals[i].get(3);
					minFace = i;
				}
			}

			if (newNormals[newMinFace].get(3) < oldMinDistance) {
				minFace = newMinFace + normals.length;
			}

			faces.push(...newFaces);
			normals.push(...newNormals);
		}
	}

	return { normal: minNormal, depth: minDist + 0.001 };
}

export function applyImpulses(bodyA, bodyB, collision) {
	const n = collision.normal.clone().normalize();
	const depth = collision.depth;

	const invMassA = bodyA.invMass;
	const invMassB = bodyB.invMass;
	const invMassSum = invMassA + invMassB;

	if (invMassSum === 0) return;

	const percent = 0.8; // how aggressively to resolve penetration
	const slop = 0.001; // penetration allowance

	const correctionMag = Math.max(depth - slop, 0) * (percent / invMassSum);

	const scaledNA = n.clone().scale(correctionMag * invMassA);
	const scaledNB = n.clone().scale(correctionMag * invMassB);

	bodyA.x.subVec(scaledNA);
	bodyA.x.subVec(scaledNB);

	const rv = bodyB.v.clone().sub(bodyA.v);
	const velAlongNormal = MATH.Vector.dot(rv, n);

	if (velAlongNormal > 0) return;

	const restitution = Math.min(bodyA.restitution ?? 0, bodyB.restitution ?? 0);

	const j = (-(1 + restitution) * velAlongNormal) / invMassSum;

	const impulse = n.clone().scale(j);

	const impulseA = impulse.clone().scale(invMassA);
	const impulseB = impulse.clone().scale(invMassB);

	bodyA.v.subVec(impulseA);
	bodyB.v.addVec(impulseB);
}
