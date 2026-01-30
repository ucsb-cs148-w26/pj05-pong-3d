import { AnimatedScene } from './game/animatedScene.js';
import PongSocketClient from './socket.js';
import { initChat } from './chat.js';
import { setupControls } from './game/controls.js';

const socket = new PongSocketClient();
socket.connect();
initChat(socket);

const animatedScene = new AnimatedScene();
document.body.appendChild(animatedScene.renderer.domElement);

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

// Create Paddle objects
const leftPaddleObj = animatedScene.paddle1;
const rightPaddleObj = animatedScene.paddle2;

// Use the mesh directly to preserve original logic
const leftPaddle = leftPaddleObj.mesh;
const rightPaddle = rightPaddleObj.mesh;

/* --------------------
   Input
-------------------- */
const keys = {};
window.addEventListener('keydown', (e) => {
	if (document.activeElement.tagName === 'INPUT') return;
	keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
	if (document.activeElement.tagName === 'INPUT') return;
	keys[e.key.toLowerCase()] = false;
});

/* --------------------
   Paddle Clamp
-------------------- */
function clampPaddle(paddle) {
	paddle.position.z = Math.max(
		-ARENA_X + PADDLE_HALF,
		Math.min(ARENA_X - PADDLE_HALF, paddle.position.z)
	);
	paddle.position.y = Math.max(
		-ARENA_Y + PADDLE_HALF,
		Math.min(ARENA_Y - PADDLE_HALF, paddle.position.y)
	);
}

/* --------------------
   Setup controls
-------------------- */
leftPaddle.directionY = 0; // vertical
leftPaddle.directionX = 0; // horizontal
rightPaddle.directionY = 0;
rightPaddle.directionX = 0;

setupControls(leftPaddle, 'w', 's', 'a', 'd');
setupControls(rightPaddle, 'i', 'k', 'j', 'l');

function animate(delta) {
	const speed = 6 * delta;

	// Vertical movement
	leftPaddle.position.y += (leftPaddle.directionY ?? 0) * speed;
	rightPaddle.position.y += (rightPaddle.directionY ?? 0) * speed;

	// Horizontal movement (optional but supported)
	leftPaddle.position.z += (leftPaddle.directionX ?? 0) * speed;
	rightPaddle.position.z += (rightPaddle.directionX ?? 0) * speed;

	clampPaddle(leftPaddle);
	clampPaddle(rightPaddle);
}

animatedScene.addAnimateCallback(animate);
