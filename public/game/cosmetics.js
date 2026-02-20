let currentBall = null;
let currentCosmetics = null;

export function registerBall(ballInstance) {
	currentBall = ballInstance;

	if (currentCosmetics) {
		currentBall.applyCosmetics(currentCosmetics);
	}
}

export function initCosmetics(socket) {
	socket.addHandler((msg) => {
		if (msg.type !== 'lobby:cosmetics') return;

		currentCosmetics = msg.cosmetics;

		if (currentBall) {
			currentBall.applyCosmetics(currentCosmetics);
		}

		return true;
	});
}
