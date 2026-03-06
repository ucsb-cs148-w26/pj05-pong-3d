import * as Constants from '../../public/game/constants.js';
import { Scene } from '../../public/game/common/Scene.js';
import { ArenaCommon } from '../../public/game/common/ArenaCommon.js';
import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';
import { PaddleController } from './PaddleController.js';
import { GameState, Player } from '../../public/game/common/GameState.js';
import { BallServer } from './BallServer.js';

const SYNC_INTERVAL = 5;
const INITIAL_LIVES = 3;
const WIN_REWARD_POOL = [
	{ id: 'ball_skin:1', kind: 'ball_skin', itemKey: '1', displayName: 'Ball Skin 1' },
	{
		id: 'goal_explosion:1',
		kind: 'goal_explosion',
		itemKey: '1',
		displayName: 'Goal Explosion 1'
	},
	{ id: 'ball_skin:2', kind: 'ball_skin', itemKey: '2', displayName: 'Ball Skin 2' },
	{
		id: 'goal_explosion:2',
		kind: 'goal_explosion',
		itemKey: '2',
		displayName: 'Goal Explosion 2'
	}
];

export default class ServerScene extends Scene {
	#interval = null;
	#socket = null;
	#ball = null;
	#gameOver = null;
	#unlockedRewardsByPlayer = new Map();

	constructor(socket) {
		super(new GameState());

		this.#socket = socket;
		this.hostUser = null;

		// Order matters: Sync with public/main.js
		this.registerGameObject(new ArenaCommon('gameArena'));

		this.#ball = new BallServer('ball', (ball, wall) => {
			if (this.#gameOver || !wall?.player) return;

			wall.player.lives = Math.max(0, wall.player.lives - 1);
			if (wall.player.lives > 0) return;

			const loser = wall.player.username;
			const winner = [...this.state.players.values()].find(
				(player) => player.username !== loser
			)?.username;
			const reward = winner ? this.#awardWinnerReward(winner) : null;

			this.#gameOver = { loser, winner, reward };
			this.#ball.enabled = false;
		});

		this.registerGameObject(this.#ball);

		this.registerGameObject(
			new PaddleCommon(
				'paddle1',
				new PaddleController(),
				'paddle',
				-23.5 / 2.125
			),
			new PaddleCommon(
				'paddle2',
				new PaddleController(),
				'paddle',
				23.5 / 2.125
			)
		);

		socket.on('client:connect', this.#onConnect.bind(this));
		socket.on('client:disconnect', this.#onDisconnect.bind(this));
		socket.addHandler('move', this.#recvMove.bind(this));
		socket.addHandler('start', this.#startGame.bind(this));
	}

	start() {
		let lastTime = performance.now();
		let ct = 0;
		this.#interval = setInterval(() => {
			const now = performance.now();
			const delta = (now - lastTime) / 1000;

			this.step(delta);

			if (ct % SYNC_INTERVAL === 0) {
				const physicsState = this.state.physics.exportState();
				const gatherData = {};
				for (const [username, player] of this.state.players)
					gatherData[username] = { lives: player.lives };

				this.#socket.forEachClient((username, ws) => {
					const paddleController =
						this.state.players.get(username).paddle.controller;
					const ack = paddleController.ack;

					this.#socket.safeSend(ws, {
						type: 'sync',
						ack,
						active: this.#ball.enabled,
						physics: physicsState,
						gameInfo: gatherData,
						gameOver: this.#gameOver
					});
				});
			}

			lastTime = now;
			ct++;
		}, 1000 / Constants.SIMULATION_RATE);
	}

	stop() {
		if (this.#interval) clearInterval(this.#interval);
		this.#interval = null;
	}

	#onConnect(username) {
		// TODO: n-player support
		if (this.state.players.size >= 2) return;
		const pid = this.state.players.size;
		const myPaddle = this.getGameObject(`paddle${pid + 1}`);
		const thisPlayer = new Player(username, myPaddle);
		this.state.players.set(username, thisPlayer);
		const arena = this.getGameObject('gameArena');

		// Hacky: Injecting the player into the bodies. Should probably see later about changing this.
		// Consequence of having to conform to the rigid map.
		if (myPaddle.body.x.x < 0) arena.bodies[4].player = thisPlayer;
		else arena.bodies[5].player = thisPlayer;

		if (this.hostUser === null) this.hostUser = username;

		this.#updatePaddles();
	}

	#onDisconnect(username) {
		// TODO:
		// Currently we have two-hardcoded paddles. First to join gets paddle1, second to join gets paddle2.
		// Adding reconnect logic is not necessary since it would just require tracking which is "open" which won't be needed in the future.
		// Hence reconnect is disabled for now.

		console.warn('Reconnect disabled right now; see ServerScene.#onDisconnect');
	}

	#updatePaddles() {
		// TODO: n-player support

		this.#socket.forEachClient((thisUsername, ws) => {
			const players = this.state.players.entries().map(([username, player]) => {
				const paddle = player.paddle;
				return {
					key: paddle.key,
					username: username,
					remote: thisUsername !== username,
					pos: [...paddle.body.x.data]
				};
			});

			this.#socket.safeSend(ws, {
				type: 'playerSync',
				// order must be the same between client and server
				players: [...players],
				host: this.hostUser,
				username: thisUsername
			});
		});
	}

	#startGame(socket, username, ws, msg) {
		if (username !== this.hostUser)
			return { type: 'error', message: 'bruh u not the host' };
		if (this.state.players.size < 2)
			return {
				type: 'error',
				message: 'bruh we gotta wait for another person'
			};

		for (const player of this.state.players.values()) {
			player.lives = INITIAL_LIVES;
		}

		this.#gameOver = null;
		this.#ball.enabled = true;
	}

	#recvMove(socket, username, ws, msg) {
		this.state.players.get(username)?.paddle.controller.enqueueInput(msg);
	}

	#awardWinnerReward(winnerUsername) {
		let unlockedRewards = this.#unlockedRewardsByPlayer.get(winnerUsername);
		if (!unlockedRewards) {
			unlockedRewards = new Set();
			this.#unlockedRewardsByPlayer.set(winnerUsername, unlockedRewards);
		}

		const lockedRewards = WIN_REWARD_POOL.filter(
			(reward) => !unlockedRewards.has(reward.id)
		);
		if (lockedRewards.length === 0) return null;

		const randomIdx = Math.floor(Math.random() * lockedRewards.length);
		const grantedReward = lockedRewards[randomIdx];
		unlockedRewards.add(grantedReward.id);
		return grantedReward;
	}
}
