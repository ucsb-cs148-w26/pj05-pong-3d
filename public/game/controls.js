// controls.js
// Handles keyboard input for paddle movement (W/S + A/D or I/K + J/L)

export function setupControls(paddle, upKey, downKey, leftKey, rightKey) {
	const keys = {
		up: false,
		down: false,
		left: false,
		right: false
	};

	window.addEventListener('keydown', (e) => {
		if (e.key === upKey) keys.up = true;
		if (e.key === downKey) keys.down = true;
		if (e.key === leftKey) keys.left = true;
		if (e.key === rightKey) keys.right = true;
		updateDirection();
	});

	window.addEventListener('keyup', (e) => {
		if (e.key === upKey) keys.up = false;
		if (e.key === downKey) keys.down = false;
		if (e.key === leftKey) keys.left = false;
		if (e.key === rightKey) keys.right = false;
		updateDirection();
	});

	function updateDirection() {
		// Vertical movement
		if (keys.up) {
			paddle.directionY = 1;
		} else if (keys.down) {
			paddle.directionY = -1;
		} else {
			paddle.directionY = 0;
		}

		// Horizontal movement
		if (keys.left) {
			paddle.directionX = -1;
		} else if (keys.right) {
			paddle.directionX = 1;
		} else {
			paddle.directionX = 0;
		}
	}
}
