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
			if (selfPlayer && otherPlayer && animatedScene.enabled) {
				this.self.style.display = '';
				this.self.textContent = `${selfPlayer.lives} - ${otherPlayer.lives}`;
			} else {
				this.self.style.display = 'none';
			}
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
			if (animatedScene.enabled && !isGameOver) {
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

				const finalLives = Array.from(this.players.entries())
					.map(
						([name, player]) =>
							`<div>${name}: ${player.lives} ${name === winner ? '(Winner)' : ''}</div>`
					)
					.join('');

				const eloChanges = Object.entries(ratings)
					.map(
						([name, rating]) =>
							`<div>${name}: ${rating.before} → ${rating.after} (${rating.change >= 0 ? '+' : ''}${rating.change})</div>`
					)
					.join('');

				this.scoreboardDisplay.innerHTML = `
					<div><strong>Final Lives:</strong></div>
					${finalLives}
					<div><strong>Rating Changes:</strong></div>
					${eloChanges}
				`;

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
					const elo = player?.elo ?? 1000;
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
