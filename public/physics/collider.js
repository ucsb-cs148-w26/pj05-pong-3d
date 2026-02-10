import * as MATH from './math.js';

/*

Colliders

Bunch of stuff on colliders. The exported classes/functions are the important ones to know, others are helpers.
Transform keeps the state of linear/affine transforms ( Mx + b for a matrix M and position b )
following the order scale -> rotate -> shift. This lets us avoid needing to update the position
of all derived positions (say the Vertices on every underlying collider) and instead prefer a single
source of truth. To get real-world cords, call transform.apply(vec).

To define new collider types, suppose you want to impl a type RhombusCollider. First, define:
```
checkCollision( otherCol ) {
	return otherCol.checkCollision_RhombusCollider?.(this);
} 
```
Because we need to know types to check collisions (for example, sphere-sphere may be different than poly-sphere),
we use a double-dispatch system. The engine will handle running both double dispatches, so only one object
needs to support the collision type (if A doesn't support (A, B) but B supports (B, A), the engine will run (B, A)).
Then, define impls for checking against other collider types. I would recommend ConvexPolyhedron and SphereCollider.
Ex. ` checkCollision_SphereCollider( sphereCol ) `. If this is called, you know sphereCol is a sphere collider.
You should return { hit: bool, simplex: <Vec3[] of length 4> }.
Note: This may change later since a naive sphere-sphere has no simplex, but for now this is ok.
*/

/*
Transform class. All Rigidbodies should have one, as it's the source of truth of position, rotation, scale.
*/
export class Transform {
	constructor() {
		this.position = new MATH.Vec3();
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



function getFaceNormals(polytope, faces) {
	const normals = [];
	let minTriangle = 0;
	let minDist = Infinity;

	for (let i = 0; i < faces.length; i += 3) {
		const a = polytope[faces[i]];
		const b = polytope[faces[i + 1]];
		const c = polytope[faces[i + 2]];

		let normal = MATH.Vec3.cross( b.clone().subVec(a), c.clone().subVec(a) );
		const l = normal.norm();
		let dist = Infinity;

		if ( l < 1e-8 ) normal = new MATH.Vec3();
		else {
			normal.scale(1/l);
			dist = MATH.Vec3.dot( normal, a );
		}

		if (dist < 0) {
			normal.scale(-1);
			dist *= -1;
		}

		normals.push( MATH.Vec4.fromVec3( normal, dist ) );

		if ( Number.isFinite(dist) && dist < minDist ) {
			minTriangle = i / 3;
			minDist = dist;
		}

	}

	return [normals, minTriangle];

}

function addIfUniqueEdge(edges, faces, a, b) {
	const from = faces[b];
	const to = faces[a];

	const reverseIndex = edges.findIndex(
		(arr) => arr[0] === from && arr[1] === to
	);

	if (reverseIndex !== -1) edges.splice(reverseIndex, 1);
	else edges.push([faces[a], faces[b]]);
}


// EPA takes the simplex and gives you a normal and depth to operate on for collision resolution.
// It alway returns [ normal, depth ]. If depth === Infinity, there was a direct, head on collision.
// In this case, the normals are exactly the velocities of the bodies.
export function EPA(simplex, colA, colB) {
	const polytope = simplex;
	const faces = [
		0, 1, 2,
		0, 3, 1,
		0, 2, 3,
		1, 3, 2
	];

	let [normals, minFace] = getFaceNormals(polytope, faces);

	let minNormal;
	let minDist = Infinity;

	while (minDist === Infinity) {
		minNormal = normals[minFace].xyz();
		minDist = normals[minFace].w;

		const sup = support(colA, colB, minNormal);
		const sDist = MATH.Vec3.dot( minNormal, sup );

		
		if ( Math.abs(sDist - minDist) > 0.001 ) {
			minDist = Infinity;

			const uniqueEdges = [];

			for ( let i = 0; i < normals.length; i++ ) {
				if ( MATH.Vec3.dot( normals[i].xyz(), sup ) - normals[i].w > 0 ) {
					const f = i * 3;

					addIfUniqueEdge(uniqueEdges, faces, f, f + 1);
					addIfUniqueEdge(uniqueEdges, faces, f + 1, f + 2);
					addIfUniqueEdge(uniqueEdges, faces, f + 2, f);

					faces[f + 2] = faces.at(-1); faces.pop();
					faces[f + 1] = faces.at(-1); faces.pop();
					faces[f] = faces.at(-1); faces.pop();

					normals[i] = normals.at(-1); normals.pop();

					i--;
				}

			}
			

			if ( uniqueEdges.length === 0 ) return [ minNormal, minDist ];

			const newFaces = [];

			for ( const [ edgeIdx1, edgeIdx2 ] of uniqueEdges ) 
				newFaces.push( edgeIdx1, edgeIdx2, polytope.length );
			
			polytope.push( sup );

			const [ newNormals, newMinFace ] = getFaceNormals(polytope, newFaces);

			let oldMinDist = Infinity;
			for (let i = 0; i < normals.length; i++) {
				if ( normals[i].w < oldMinDist ) {
					oldMinDist = normals[i].w;
					minFace = i;
				}
			}

			if ( newNormals[newMinFace].w < oldMinDist )
				minFace = newMinFace + normals.length;

			faces.push( ...newFaces );
			normals.push( ...newNormals );

		}
	}

	return [ minNormal, minDist + 0.001 ];
}

export function resolveImpulseCollision( bodyA, bodyB, normal, depth, restitution = 1.0 ) {
	const n = normal.clone().normalize();

	const vA = bodyA.v;
	const vB = bodyB.v;

	const rv = vB.clone().subVec(vA);
	const velAlongNormal = MATH.Vec3.dot(rv, n);

	if (velAlongNormal > 0) return;

	const invMassA = bodyA.m === Infinity ? 0 : 1 / bodyA.m;
	const invMassB = bodyB.m === Infinity ? 0 : 1 / bodyB.m;

	// Unique case for direct collision.
	if (depth === Infinity) {
		const reflected = n.clone().scale(-2 * velAlongNormal * restitution);

		if (invMassA > 0) vA.subVec(reflected.clone().scale(invMassA / (invMassA + invMassB)));

		if (invMassB > 0) vB.addVec(reflected.clone().scale(invMassB / (invMassA + invMassB)));

		return;
	}

	const j = -(1 + restitution) * velAlongNormal / (invMassA + invMassB);

	const impulse = n.clone().scale(j);

	if (invMassA > 0) bodyA.v.subVec(impulse.clone().scale(invMassA));

	if (invMassB > 0) bodyB.v.addVec(impulse.clone().scale(invMassB));
}


/*
**Note**: ConvexPolyhedron should be VERY carefully defined.
You should probably make subclasses inherit from ConvexPolyhedron that define a layout based on params.
(for example, Cube sends 8 vertices up to the convex poly based on l, w, h).
This is because there's no checks for convexity; if a shape fails convexity, I have no idea what happens.

If you have a basic convex polyhedron shape, use this collider. Just send up all of the unique vertices of the shape.
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

export class SphereCollider {
	constructor(radius, transform, onCollisionCallback = undefined) {
		this.r = radius;
		this.transform = transform;
		this.onCollisionCallback = onCollisionCallback;
	}

	get center() {
		return this.transform.position;
	}

	furthestPoint(direction) {
		const dir = direction.clone().normalize().scale(this.r);
		return this.center.clone().addVec(dir);
	}

	checkCollision(otherCol) {
		return otherCol.checkCollision_Sphere?.(this);
	}

	checkCollision_ConvexPolyhedron(cvxPolyCol) {
		return gjk(this, cvxPolyCol);
	}

	checkCollision_Sphere(sphereCol) {
		return gjk(this, sphereCol); 
		// could later rework to use more efficient algo since sphere-sphere is simple
	}

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
