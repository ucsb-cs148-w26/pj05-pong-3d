import { PhysicsEngine } from '../../physics/engine.js';

export class Player {
	constructor(username, paddle) {
		this.username = username;
		this.lives = 3;
		this.paddle = paddle;
	}
}

export class GameState {
	constructor() {
		this.physics = new PhysicsEngine();
		this.players = new Map();
	}
}
