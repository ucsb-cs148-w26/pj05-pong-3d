import { PhysicsEngine } from '../../physics/engine.js';

export class Player {
	constructor(username, paddle, elo = 1000) {
		this.username = username;
		this.lives = 3;
		this.elo = elo;
		this.paddle = paddle;
	}
}

export class GameState {
	constructor() {
		this.physics = new PhysicsEngine();
		this.players = new Map();
	}
}
