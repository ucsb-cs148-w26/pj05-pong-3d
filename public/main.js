import * as THREE from 'three';
import { AnimatedScene } from './game/client/AnimatedScene.js';
import { GameObjectCustom } from './game/common/GameObject.js';

import PongSocketClient from './socket.js';
import { initChat } from './chat.js';
import { startGoalExplosionDemo } from './game/goalExplosionDemo.js';
//Temporary flag to allow viewing of goalExplosionDemo by devs
if (false) {
	startGoalExplosionDemo();
}

const socket = new PongSocketClient();
initChat(socket);
socket.connect();

const animatedScene = new AnimatedScene(socket);
window.animatedScene = animatedScene;

function getRespawnCountdownSeconds() {
	const respawnEndsAt = animatedScene.respawnEndsAt;
	if (typeof respawnEndsAt !== 'number') return null;

	const msRemaining = Math.max(0, respawnEndsAt - animatedScene.serverNowMs);
	if (msRemaining <= 0) return null;
	return Math.ceil(msRemaining / 1000);
}

animatedScene.registerGameObject(new GameObjectCustom('socket', { socket }));

animatedScene.registerGameObject(
	new GameObjectCustom('ambientLight', {
		visual: new THREE.AmbientLight(0xffffff, 0.2)
	}),
	new GameObjectCustom('light1', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(0, 0, 0);
			this.visual.castShadow = true;
			this.visual.shadow.mapSize.set(1024, 1024);
		}
	}),
	new GameObjectCustom('light2', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(-8, 0, 0);
			this.visual.castShadow = true;
			this.visual.shadow.mapSize.set(1024, 1024);
		}
	}),
	new GameObjectCustom('light3', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(8, 0, 0);
			this.visual.castShadow = true;
			this.visual.shadow.mapSize.set(1024, 1024);
		}
	}),
	new GameObjectCustom('hudScore', {
		self: document.createElement('div'),
		init() {
			this.self.id = 'hud-score';
			this.self.classList.add('hud-overlay');
			document.body.appendChild(this.self);
		},
		update() {
			// works for two players only
			const selfPlayer = animatedScene.state.players.get(
				animatedScene.username
			);
			const otherPlayer = animatedScene.state.players
				.values()
				.find((p) => p.username !== animatedScene.username);
			if (selfPlayer && otherPlayer) {
				this.self.style.display = '';
				this.self.textContent = `${selfPlayer.lives} - ${otherPlayer.lives}`;
			} else {
				this.self.style.display = 'none';
			}
		}
	}),
	new GameObjectCustom('hudCountdown', {
		self: document.createElement('div'),
		scorerText: document.createElement('div'),
		countdownText: document.createElement('div'),
		init() {
			this.self.id = 'hud-countdown';
			this.self.classList.add('hud-overlay');
			this.scorerText.className = 'hud-countdown__scorer';
			this.countdownText.className = 'hud-countdown__value';
			this.self.appendChild(this.scorerText);
			this.self.appendChild(this.countdownText);
			document.body.appendChild(this.self);
		},
		update() {
			const countdown = getRespawnCountdownSeconds();
			const scorer = animatedScene.respawnScorer;
			if (typeof countdown !== 'number' || countdown <= 0) {
				this.self.style.display = 'none';
				return;
			}

			this.self.style.display = '';
			const scoredText =
				typeof scorer === 'string' && scorer.length > 0
					? `${scorer} scored!`
					: '';
			this.scorerText.style.display = scoredText ? '' : 'none';
			this.scorerText.textContent = scoredText;
			this.countdownText.textContent = `${countdown}`;
		}
	}),
	new GameObjectCustom('hudStats', {
		self: document.createElement('div'),
		socket,
		init() {
			this.self.id = 'hud-stats';
			this.self.classList.add('hud-overlay');
			document.body.appendChild(this.self);
		},
		update(dt) {
			const pingText =
				this.socket?.lastLatencyMs == null
					? '-- ms'
					: `${this.socket.lastLatencyMs.toFixed(0)} ms`;
			const fpsText = dt > 0 ? `${(1 / dt).toFixed(0)}` : '--';
			this.self.textContent = `FPS: ${fpsText}   Ping: ${pingText}`;
		}
	}),
	new GameObjectCustom('escapeMenu', {
		component: document.getElementById('escape-menu'),
		resumeButton: document.getElementById('escape-menu__resume'),
		exitButton: document.getElementById('escape-menu__exit'),
		setOpen(isOpen) {
			this.component.classList.toggle('is-open', isOpen);
		},
		init() {
			window.addEventListener('keydown', (event) => {
				if (event.key !== 'Escape') return;
				this.setOpen(!this.component.classList.contains('is-open'));
			});

			this.resumeButton.addEventListener('click', () => {
				this.setOpen(false);
			});

			this.exitButton.addEventListener('click', () => {
				window.location.href = '/';
			});
		}
	}),
	new GameObjectCustom('waitingScreen', {
		component: document.getElementById('waiting'),
		playerListDisplay: document.getElementById('waiting__players'),
		scoreboardDisplay: document.getElementById('waiting__scoreboard'),
		joinCodeDisplay: document.getElementById('waiting__code'),
		startButton: document.getElementById('startButton'),
		leaveLobbyButton: document.getElementById('waiting__leaveButton'),
		players: animatedScene.state.players,
		socket,
		init() {
			this.startButton.addEventListener('click', () => {
				socket.send({ type: 'start' });
			});

			this.leaveLobbyButton.addEventListener('click', async () => {
				window.location.href = '/';
			});
		},
		update(dt) {
			const isGameOver = animatedScene.gameOver !== null;
			if (animatedScene.matchStarted && !isGameOver) {
				this.component.style.display = 'none';
				return;
			}

			this.component.style.display = 'flex';
			if (isGameOver) {
				const { winner, ratings } = animatedScene.gameOver;

				document.getElementById('waiting__title').innerText = `${
					winner ?? 'A player'
				} won`;

				this.joinCodeDisplay.style.display = 'none';
				this.playerListDisplay.style.display = 'none';
				this.startButton.style.display = 'none';
				this.leaveLobbyButton.style.display = 'block';
				this.scoreboardDisplay.style.display = 'block';

				this.scoreboardDisplay.innerHTML = `
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Final Lives</th>
								<th>Old Elo</th>
								<th>New Elo</th>
							</tr>
						</thead>
						<tbody>
							${Array.from(this.players.keys())
								.map(
									(name) => `<tr>
	<td>${name}</td>
	<td>${this.players.get(name).lives}${name === winner ? ' (Winner)' : ''}</td>
	<td>${ratings[name].before}</td>
	<td style="color: ${ratings[name].change >= 0 ? 'lightgreen' : 'red'}">${ratings[name].after} (${ratings[name].change >= 0 ? '+' : ''}${ratings[name].change})</td>
</tr>`
								)
								.join('\n')}
						</tbody>
					</table>
					${animatedScene.unlockedItem ? `<div style="margin-top: 1rem; color: gold"><strong>Item Unlocked:</strong> ${animatedScene.unlockedItem.displayName}</div>` : ''}
				`;

				return;
			} else if (animatedScene.gameCancelled) {
				this.joinCodeDisplay.style.display = 'none';
				this.playerListDisplay.style.display = 'none';
				this.startButton.style.display = 'none';
				this.leaveLobbyButton.style.display = 'block';
				this.scoreboardDisplay.style.display = 'none';

				document.getElementById('waiting__title').innerText =
					'Host left the game';

				return;
			}

			document.getElementById('waiting__title').innerText =
				'Waiting for players...';
			this.joinCodeDisplay.style.display = 'block';
			this.playerListDisplay.style.display = 'block';
			this.startButton.style.display = 'block';
			this.leaveLobbyButton.style.display = 'none';
			this.scoreboardDisplay.style.display = 'none';
			this.playerListDisplay.innerHTML = Array.from(this.players.entries())
				.map(([name, player]) => {
					const isHost = name === animatedScene.host;
					const elo = player.elo;
					return `<span style="color: ${isHost ? 'yellow' : 'white'}">
						${name} (${elo})
					</span>`;
				})
				.join('');

			if (animatedScene.isHost) {
				this.startButton.textContent = 'Start Game';
				this.startButton.disabled = this.players.size < 2;
			} else {
				this.startButton.textContent = 'Waiting for host to start the game';
				this.startButton.disabled = true;
			}
		}
	})
);

animatedScene.start();
