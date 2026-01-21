// import * as THREE from 'three';
// import { FontLoader } from 'three/addons/loaders/FontLoader.js';
// import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// const clock = new THREE.Clock();
// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(
// 	75,
// 	window.innerWidth / window.innerHeight,
// 	0.1,
// 	1000
// );

// const renderer = new THREE.WebGLRenderer();
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// window.addEventListener('resize', () => {
// 	camera.aspect = window.innerWidth / window.innerHeight;
// 	camera.updateProjectionMatrix();
// 	renderer.setSize(window.innerWidth, window.innerHeight);
// });

// let txt;

// fetch('/hello').then(async (res) => {
// 	const loader = new FontLoader();
// 	const font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json');
// 	const txtgeom = new TextGeometry(await res.text(), {
// 		font,
// 		size: 1,
// 		depth: 0.2,
// 		curveSegments: 12
// 	});
// 	const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
// 	txt = new THREE.Mesh(txtgeom, material);

// 	txt.position.x = -7;
// 	scene.add(txt);
// });

// camera.position.z = 10;

// function animate() {
// 	const delta = clock.getDelta();
// 	if (txt) {
// 		txt.rotation.x += 0.5 * delta;
// 		txt.rotation.y += 0.5 * delta;
// 		txt.rotation.z += 0.5 * delta;
// 	}
// 	renderer.render(scene, camera);
// }
// renderer.setAnimationLoop(animate);

import * as THREE from 'three';

/* --------------------
   Core Setup
-------------------- */
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.set(0, 0, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------
   Lighting
-------------------- */
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 10, 10);
scene.add(light);

/* --------------------
   Arena
-------------------- */
const ARENA_X = 6;
const ARENA_Y = 4;

/* --------------------
   Paddles
-------------------- */
const PADDLE_SIZE = 2;
const PADDLE_HALF = PADDLE_SIZE / 2;

const paddleGeometry = new THREE.BoxGeometry(PADDLE_SIZE, PADDLE_SIZE, 0.4);
const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
leftPaddle.position.set(0, 0, -10);
scene.add(leftPaddle);

const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
rightPaddle.position.set(0, 0, 10);
scene.add(rightPaddle);

/* --------------------
   Ball
-------------------- */
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

let ballVelocity = new THREE.Vector3(0.04, 0.03, -0.08);

/* --------------------
   Input
-------------------- */
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

/* --------------------
   Paddle Clamp
-------------------- */
function clampPaddle(paddle) {
	paddle.position.x = Math.max(
		-ARENA_X + PADDLE_HALF,
		Math.min(ARENA_X - PADDLE_HALF, paddle.position.x)
	);
	paddle.position.y = Math.max(
		-ARENA_Y + PADDLE_HALF,
		Math.min(ARENA_Y - PADDLE_HALF, paddle.position.y)
	);
}

/* --------------------
   Animation Loop
-------------------- */
function animate() {
	const delta = clock.getDelta();
	const speed = 0.25;

	// Left paddle (WASD)
	if (keys['w']) leftPaddle.position.y += speed;
	if (keys['s']) leftPaddle.position.y -= speed;
	if (keys['a']) leftPaddle.position.x -= speed;
	if (keys['d']) leftPaddle.position.x += speed;

	// Right paddle (IJKL)
	if (keys['i']) rightPaddle.position.y += speed;
	if (keys['k']) rightPaddle.position.y -= speed;
	if (keys['j']) rightPaddle.position.x -= speed;
	if (keys['l']) rightPaddle.position.x += speed;

	clampPaddle(leftPaddle);
	clampPaddle(rightPaddle);

	// Ball movement
	ball.position.add(ballVelocity);

	if (Math.abs(ball.position.x) > ARENA_X) ballVelocity.x *= -1;
	if (Math.abs(ball.position.y) > ARENA_Y) ballVelocity.y *= -1;

	if (ball.position.z < -14 || ball.position.z > 14) {
		ball.position.set(0, 0, 0);
		ballVelocity.z *= -1;
	}

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
