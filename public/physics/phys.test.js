import { log } from 'console';

let RigidBody;
let BoxCollider;
let PhysicsEngine;

beforeAll(async () => {
	({ RigidBody, PhysicsEngine } = await import('./engine.js'));
	({ BoxCollider } = await import('./collider.js'));
});

describe('collision end-to-end test', () => {
	test('four boxes, three collisions', () => {
		const engine = new PhysicsEngine();

		const uniqueCollisions = new Set();

		const collisionCallback = () => {
			uniqueCollisions.add(String(engine.t));
			log('collision occured at time: ', engine.t);
		};

		const box1 = new RigidBody(5);
		box1.col = new BoxCollider(1, 1, 1, box1.transform, collisionCallback);
		const box2 = new RigidBody(5);
		box2.col = new BoxCollider(1, 1, 1, box1.transform, collisionCallback);
		const box3 = new RigidBody(5);
		box3.col = new BoxCollider(1, 1, 1, box1.transform, collisionCallback);
		const box4 = new RigidBody(5);
		box4.col = new BoxCollider(1, 1, 1, box1.transform, collisionCallback);

		engine.registerBody('box1', box1);
		engine.registerBody('box2', box2);
		engine.registerBody('box3', box3);
		engine.registerBody('box4', box4);

		box1.x.assign(3, 0, 0);
		box2.x.assign(-3, 0, 0);
		box3.x.assign(6, 0, 0);
		box4.x.assign(-6, 0, 0);

		box1.v.assign(-3, 0, 0);
		box2.v.assign(3, 0, 0);

		const dt = 1 / 120;
		const end = dt * 120 * 3; // 3 seconds simulated

		for (let i = 0; i < end; ++i) {
			engine.step(dt);
			engine.checkColliders();
		}

		expect(uniqueCollisions.size === 3);
	});
});
