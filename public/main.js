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
			this.self.id = 'hudScore';
			this.self.style.position = 'absolute';
			this.self.style.top = '16px';
			this.self.style.left = '50%';
			this.self.style.transform = 'translateX(-50%)';
			this.self.style.color = 'white';
			this.self.style.fontFamily =
				'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
			this.self.style.fontSize = '22px';
			this.self.style.fontWeight = '700';
			this.self.style.padding = '8px 14px';
			this.self.style.borderRadius = '12px';
			this.self.style.background = 'rgba(0,0,0,0.35)';
			this.self.style.backdropFilter = 'blur(6px)';
			this.self.style.pointerEvents = 'none';
			this.self.style.whiteSpace = 'nowrap';
			document.body.appendChild(this.self);
		},
		update() {
			const livesText =
				animatedScene.state.players.size > 0
					? Array.from(animatedScene.state.players)
							.map(([username, player]) => `${username}: ${player.lives}`)
							.join('   ')
					: 'Waiting for players...';
			this.self.textContent = livesText;
		}
	}),
	new GameObjectCustom('hudStats', {
		self: document.createElement('div'),
		socket,
		init() {
			this.self.id = 'hudStats';
			this.self.style.position = 'absolute';
			this.self.style.top = '10px';
			this.self.style.right = '10px';
			this.self.style.color = 'rgba(255,255,255,0.85)';
			this.self.style.fontFamily = 'monospace';
			this.self.style.fontSize = '12px';
			this.self.style.padding = '6px 10px';
			this.self.style.borderRadius = '10px';
			this.self.style.background = 'rgba(0,0,0,0.25)';
			this.self.style.backdropFilter = 'blur(6px)';
			this.self.style.pointerEvents = 'none';
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
	new GameObjectCustom('waitingScreen', {
		component: document.getElementById('waiting'),
		playerListDisplay: document.getElementById('waiting__players'),
		scoreboardDisplay: document.getElementById('waiting__scoreboard'),
		lobbyInfoDisplay: document.getElementById('lobby-info'),
		startButtion: document.getElementById('startButton'),
		leaveLobbyButton: document.getElementById('waiting__leaveButton'),
		players: animatedScene.state.players,
		socket,
		init() {
			this.startButtion.addEventListener('click', () => {
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
				const { loser, winner } = animatedScene.gameOver;
				document.getElementById('waiting__title').innerText = `${
					winner ?? 'A player'
				} won`;
				this.lobbyInfoDisplay.style.display = 'none';
				this.playerListDisplay.style.display = 'none';
				this.startButtion.style.display = 'none';
				this.leaveLobbyButton.style.display = 'block';
				this.scoreboardDisplay.style.display = 'block';

				const lobbyMembers = Array.from(this.players.keys());
				const finalLives = Array.from(this.players.entries())
					.map(
						([name, player]) =>
							`<div>${name}: ${player.lives} ${name === winner ? '(Winner)' : ''}</div>`
					)
					.join('');
				this.scoreboardDisplay.innerHTML = `<div><strong>Lobby Members:</strong> ${lobbyMembers.join(', ')}</div><div style="margin-top: 0.5rem"><strong>Final Lives:</strong></div>${finalLives}`;
				return;
			}

			document.getElementById('waiting__title').innerText =
				'Waiting for players...';
			this.lobbyInfoDisplay.style.display = 'block';
			this.playerListDisplay.style.display = 'block';
			this.startButtion.style.display = 'block';
			this.leaveLobbyButton.style.display = 'none';
			this.scoreboardDisplay.style.display = 'none';
			this.playerListDisplay.innerHTML = Array.from(this.players.keys())
				.map(
					(name) =>
						`<span style="color: ${name === animatedScene.host ? 'yellow' : 'white'}" >${name}</span>`
				)
				.join('');
<<<<<<< HEAD

			const isHost = animatedScene.isHost;
			const canHostStart = isHost && this.players.size >= 2;

			if (isHost) {
				this.startButtion.textContent = 'Start Game';
				this.startButtion.disabled = !canHostStart;
			} else {
				this.startButtion.textContent = 'Waiting for host to start the game';
				this.startButtion.disabled = true;
			}
=======
			this.startButtion.disabled =
				this.players.size < 2 || !animatedScene.isHost;
>>>>>>> main
		}
	})
);

animatedScene.start();
