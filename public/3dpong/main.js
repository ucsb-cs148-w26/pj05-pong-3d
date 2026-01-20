// import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

// // Scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000000);

// // Camera — behind left paddle
// const camera = new THREE.PerspectiveCamera(
//   75,
//   window.innerWidth / window.innerHeight,
//   0.1,
//   1000
// );
// camera.position.set(0, 0, 14);
// camera.lookAt(0, 0, 0);

// // Renderer
// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// // Light
// const light = new THREE.DirectionalLight(0xffffff, 1);
// light.position.set(0, 10, 10);
// scene.add(light);

// // Paddle geometry — SQUARE from this view
// const paddleGeometry = new THREE.BoxGeometry(2, 2, 0.4);
// const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

// // Left paddle (near / player)
// const leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// leftPaddle.position.set(0, 0, -10);
// scene.add(leftPaddle);

// // Right paddle (far)
// const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// rightPaddle.position.set(0, 0, 10);
// scene.add(rightPaddle);

// // Ball
// const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
// const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
// const ball = new THREE.Mesh(ballGeometry, ballMaterial);
// scene.add(ball);

// // Ball velocity
// let ballVelocity = new THREE.Vector3(0.04, 0.03, -0.08);

// // Input
// const keys = {};
// window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
// window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// // Animate
// function animate() {
//   requestAnimationFrame(animate);

//   const speed = 0.25;

//   // LEFT paddle — WASD
//   if (keys["w"]) leftPaddle.position.y += speed;
//   if (keys["s"]) leftPaddle.position.y -= speed;
//   if (keys["a"]) leftPaddle.position.x -= speed;
//   if (keys["d"]) leftPaddle.position.x += speed;

//   // RIGHT paddle — IJKL (better than arrows in 3D)
//   if (keys["i"]) rightPaddle.position.y += speed;
//   if (keys["k"]) rightPaddle.position.y -= speed;
//   if (keys["j"]) rightPaddle.position.x -= speed;
//   if (keys["l"]) rightPaddle.position.x += speed;

//   // Move ball
//   ball.position.add(ballVelocity);

//   // Wall bounce
//   if (Math.abs(ball.position.x) > 6) ballVelocity.x *= -1;
//   if (Math.abs(ball.position.y) > 4) ballVelocity.y *= -1;

//   // Reset if missed
//   if (ball.position.z < -14 || ball.position.z > 14) {
//     ball.position.set(0, 0, 0);
//     ballVelocity.z *= -1;
//   }

//   renderer.render(scene, camera);
// }

// animate();

// // Resize
// window.addEventListener("resize", () => {
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth, window.innerHeight);
// });


import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// --------------------
// Camera (behind left paddle)
// --------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 14);
camera.lookAt(0, 0, 0);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --------------------
// Light
// --------------------
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 10, 10);
scene.add(light);

// --------------------
// Arena bounds
// --------------------
const ARENA_X = 6;
const ARENA_Y = 4;

// --------------------
// Paddle (square)
// --------------------
const PADDLE_SIZE = 2;
const PADDLE_HALF = PADDLE_SIZE / 2;

const paddleGeometry = new THREE.BoxGeometry(
  PADDLE_SIZE,
  PADDLE_SIZE,
  0.4
);
const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

// Left paddle (player)
const leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
leftPaddle.position.set(0, 0, -10);
scene.add(leftPaddle);

// Right paddle
const rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
rightPaddle.position.set(0, 0, 10);
scene.add(rightPaddle);

// --------------------
// Ball
// --------------------
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

let ballVelocity = new THREE.Vector3(0.04, 0.03, -0.08);

// --------------------
// Input
// --------------------
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --------------------
// Clamp paddles to arena
// --------------------
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

// --------------------
// Animation loop
// --------------------
function animate() {
  requestAnimationFrame(animate);

  const speed = 0.25;

  // Left paddle — WASD
  if (keys["w"]) leftPaddle.position.y += speed;
  if (keys["s"]) leftPaddle.position.y -= speed;
  if (keys["a"]) leftPaddle.position.x -= speed;
  if (keys["d"]) leftPaddle.position.x += speed;

  // Right paddle — IJKL
  if (keys["i"]) rightPaddle.position.y += speed;
  if (keys["k"]) rightPaddle.position.y -= speed;
  if (keys["j"]) rightPaddle.position.x -= speed;
  if (keys["l"]) rightPaddle.position.x += speed;

  // Clamp paddles
  clampPaddle(leftPaddle);
  clampPaddle(rightPaddle);

  // Move ball
  ball.position.add(ballVelocity);

  // Ball wall bounce
  if (Math.abs(ball.position.x) > ARENA_X) ballVelocity.x *= -1;
  if (Math.abs(ball.position.y) > ARENA_Y) ballVelocity.y *= -1;

  // Reset ball if missed
  if (ball.position.z < -14 || ball.position.z > 14) {
    ball.position.set(0, 0, 0);
    ballVelocity.z *= -1;
  }

  renderer.render(scene, camera);
}

animate();

// --------------------
// Resize handler
// --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
