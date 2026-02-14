let Vector;
let Vec3;
let Quaternion;

beforeAll(async () => {
	({ Vector, Vec3, Quaternion } = await import('./math.js'));
});

describe('math helpers', () => {
	test('Vector normalize and dot product work', () => {
		const v = new Vector(2);
		v.set(0, 3);
		v.set(1, 4);
		v.normalize();
		expect(v.norm()).toBeCloseTo(1, 5);

		const u = new Vector(2);
		u.set(0, 3);
		u.set(1, 4);
		expect(Vector.dot(v, u)).toBeCloseTo(5, 5);
	});

	test('Quaternion axis-angle rotation rotates x to y around z', () => {
		const q = Quaternion.fromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
		const p = new Vec3(1, 0, 0);
		q.rotateVec3InPlace(p);

		expect(p.x).toBeCloseTo(0, 5);
		expect(p.y).toBeCloseTo(1, 5);
		expect(p.z).toBeCloseTo(0, 5);
	});
});
