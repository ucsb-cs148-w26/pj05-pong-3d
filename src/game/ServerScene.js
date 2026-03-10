import * as Constants from '../../public/game/constants.js';
import { Scene } from '../../public/game/common/Scene.js';
import { ArenaCommon } from '../../public/game/common/ArenaCommon.js';
import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';
import { PaddleController } from './PaddleController.js';
import { GameState, Player } from '../../public/game/common/GameState.js';
import { BallServer } from './BallServer.js';
import db from '../db/db.js';

const SYNC_INTERVAL = 5;
const DEFAULT_ELO = 1000;

export default class ServerScene extends Scene {
	#interval = null;
	#socket = null;
	#ball = null;
	#gameOver = null;
	#numLives = 7;
	#inProgress = false;
	#onGameEnd = null;
	#gameEnded = false;

	constructor(socket, lives, onGameEnd) {
		super(new GameState());

		this.#socket = socket;
		this.#onGameEnd = onGameEnd;
		this.hostUser = null;

		// Order matters: Sync with public/main.js
		this.registerGameObject(new ArenaCommon('gameArena'));

		this.#ball = new BallServer('ball', (ball, wall) => {
			if (this.#gameOver || !wall?.player) return;

			wall.player.lives = Math.max(0, wall.player.lives - 1);
			if (wall.player.lives > 0) return;

			this.#endGame(wall.player.username);
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

		this.#numLives = lives ?? 7;
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
					gatherData[username] = {
						lives: player.lives
					};

				this.#socket.forEachClient((username, ws) => {
					const paddleController =
						this.state.players.get(username)?.paddle.controller;
					const ack = paddleController?.ack ?? 0;

					this.#socket.safeSend(ws, {
						type: 'sync',
						ack,
						active: this.#ball.enabled,
						physics: physicsState,
						gameInfo: gatherData
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

	get inProgress() {
		return this.#inProgress;
	}

	#onConnect(username) {
		if (this.state.players.size >= 2) {
			this.#updatePaddles();
			return;
		}
		const pid = this.state.players.size;
		const myPaddle = this.getGameObject(`paddle${pid + 1}`);
		const thisPlayer = new Player(username, myPaddle, DEFAULT_ELO);
		this.state.players.set(username, thisPlayer);
		const arena = this.getGameObject('gameArena');

		// Hacky: Injecting the player into the bodies. Should probably see later about changing this.
		// Consequence of having to conform to the rigid map.
		if (myPaddle.body.x.x < 0) arena.bodies[4].player = thisPlayer;
		else arena.bodies[5].player = thisPlayer;

		if (this.hostUser === null) this.hostUser = username;

		this.#updatePaddles();
		this.#loadPlayerElo(thisPlayer);
	}

	#onDisconnect(username) {
		if (this.#gameEnded) return;

		if (!this.inProgress) {
			if (username === this.hostUser) {
				this.#socket.broadcast({
					type: 'gameCancelled'
				});
				this.#onGameEnd?.();
			}

			return;
		}

		this.#endGame(username);
	}

	#updatePaddles() {
		this.#socket.forEachClient((thisUsername, ws) => {

			const players = this.state.players.entries().map(([username, player]) => {
				const paddle = player.paddle;
				return {
					key: paddle.key,
					username: username,
					elo: player.elo,
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

	async #loadPlayerElo(player) {
		try {
			const row = await new Promise((resolve, reject) => {
				db.get(
					'SELECT elo FROM users WHERE display_name = ? LIMIT 1',
					[player.username],
					(err, result) => {
						if (err) reject(err);
						else resolve(result);
					}
				);
			});
			const elo = Number(row?.elo);
			if (!Number.isFinite(elo)) return;

			const currentPlayer = this.state.players.get(player.username);
			if (currentPlayer !== player) return;

			player.elo = elo;
			this.#updatePaddles();
		} catch (err) {
			console.error(`Failed to load elo for ${player.username}:`, err);
		}
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
			player.lives = this.#numLives;
		}

		this.#gameOver = null;
		this.#ball.enabled = true;
		this.#inProgress = true;
	}

	#recvMove(socket, username, ws, msg) {
		this.state.players.get(username)?.paddle.controller.enqueueInput(msg);
	}

	#endGame(loser) {
		this.#gameEnded = true;

		const winner = [...this.state.players.values()].find(
			(player) => player.username !== loser
		)?.username;

		this.#gameOver = { loser, winner, ratings: null };
		this.#ball.enabled = false;
		this.#saveGameResult().then(() => {
			this.#socket.broadcast({
				type: 'gameOver',
				...this.#gameOver
			});
			this.#onGameEnd?.();
		});
	}

	async #saveGameResult() {
		if (!this.#gameOver?.winner || !this.#gameOver?.loser) return;

		const winnerName = this.#gameOver.winner;
		const loserName = this.#gameOver.loser;
		const winnerId = this.#socket.getUserId(winnerName);
		const loserId = this.#socket.getUserId(loserName);

		try {
			const winner = await new Promise((resolve, reject) => {
				db.get('SELECT elo FROM users WHERE id = ?', [winnerId], (err, row) => {
					if (err) reject(err);
					else resolve(row);
				});
			});
			const loser = await new Promise((resolve, reject) => {
				db.get('SELECT elo FROM users WHERE id = ?', [loserId], (err, row) => {
					if (err) reject(err);
					else resolve(row);
				});
			});
			if (!winner || !loser) {
				console.warn('skipping elo/match_history update: user lookup failed');
				return;
			}

			const winnerExpected = 1 / (1 + 10 ** ((loser.elo - winner.elo) / 400));
			const loserExpected = 1 / (1 + 10 ** ((winner.elo - loser.elo) / 400));
			const winnerEloAfter = Math.round(winner.elo + 32 * (1 - winnerExpected));
			const loserEloAfter = Math.round(loser.elo + 32 * (0 - loserExpected));
			const winnerDelta = winnerEloAfter - winner.elo;
			const loserDelta = loserEloAfter - loser.elo;

			const winnerLives = this.state.players.get(winnerName)?.lives;

			const winnerPlayer = this.state.players.get(winnerName);
			const loserPlayer = this.state.players.get(loserName);
			if (winnerPlayer) winnerPlayer.elo = winnerEloAfter;
			if (loserPlayer) loserPlayer.elo = loserEloAfter;

			this.#gameOver = {
				...this.#gameOver,
				ratings: {
					[winnerName]: {
						before: winner.elo,
						after: winnerEloAfter,
						change: winnerDelta
					},
					[loserName]: {
						before: loser.elo,
						after: loserEloAfter,
						change: loserDelta
					}
				}
			};

			await new Promise((resolve, reject) => {
				db.run('BEGIN TRANSACTION', (err) => {
					if (err) reject(err);
					else resolve();
				});
			});

			try {
				await new Promise((resolve, reject) => {
					db.run(
						'UPDATE users SET elo = ? WHERE id = ?',
						[winnerEloAfter, winnerId],
						(err) => {
							if (err) reject(err);
							else resolve();
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.run(
						'UPDATE users SET elo = ? WHERE id = ?',
						[loserEloAfter, loserId],
						(err) => {
							if (err) reject(err);
							else resolve();
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.run(
						`INSERT INTO match_history (
							winner_user_id,
							loser_user_id,
							winner_lives_remaining,
							winner_elo_before,
							winner_elo_after,
							loser_elo_before,
							loser_elo_after
						) VALUES (?, ?, ?, ?, ?, ?, ?)`,
						[
							winnerId,
							loserId,
							winnerLives,
							winner.elo,
							winnerEloAfter,
							loser.elo,
							loserEloAfter
						],
						(err) => {
							if (err) reject(err);
							else resolve();
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.get(
						`SELECT i.id, i.display_name, i.kind FROM items i
							WHERE i.is_default = 0
							AND i.id NOT IN (SELECT item_id FROM user_unlocks WHERE user_id = ?)
							ORDER BY RANDOM() LIMIT 1`,
						[winnerId],
						(err, item) => {
							if (err) return reject(err);
							if (!item) return;
							db.run(
								`INSERT INTO user_unlocks (user_id, item_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
								[winnerId, item.id],
								(err2) => {
									if (err2) return reject(err2);
									// Tell only the winner what they unlocked.
									this.#socket.safeSendToUser(winnerName, {
										type: 'itemUnlocked',
										itemId: item.id,
										displayName: item.display_name,
										kind: item.kind
									});
									resolve();
								}
							);
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.run('COMMIT', (err) => {
						if (err) reject(err);
						else resolve();
					});
				});
			} catch (txErr) {
				await new Promise((resolve) => {
					db.run('ROLLBACK', () => resolve());
				});
				throw txErr;
			}
		} catch (err) {
			console.error('Failed to save game:', err);
		}
	}
}
