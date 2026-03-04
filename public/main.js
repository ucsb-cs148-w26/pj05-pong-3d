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
	new GameObjectCustom('infoDiv', {
		self: document.createElement('div'),
		socket,
		init() {
			this.self.style.position = 'absolute';
			this.self.style.textAlign = 'right';
			this.self.style.top = '10px';
			this.self.style.right = '10px';
			this.self.style.color = 'white';
			this.self.style.fontFamily = 'monospace';
			document.body.appendChild(this.self);
		},
		update(dt) {
			const ball = animatedScene.getGameObject('ball');
			const pingText =
				this.socket?.lastLatencyMs == null
					? '-- ms'
					: `${this.socket.lastLatencyMs.toFixed(0)} ms`;
			const livesText =
				animatedScene.state.players.size > 0
					? Array.from(animatedScene.state.players)
							.map(([username, player]) => `${username}: ${player.lives}`)
							.join(', ')
					: 'N/A';
			this.self.innerText = `Control with WASD
				Camera tracks the ball
				Lives: ${livesText}
				Ball Speed: ${ball.body.v.norm().toFixed(2)}

				Camera: ${animatedScene.camera.position.x.toFixed(1)}, ${animatedScene.camera.position.y.toFixed(1)}, ${animatedScene.camera.position.z.toFixed(1)}

                FPS: ${(1 / dt).toFixed(0)}
				Ping: ${pingText}`;
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
			this.startButtion.disabled =
				this.players.size < 2 || !animatedScene.isHost;
		}
	})
);

animatedScene.start();
