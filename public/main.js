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

function leaveGame() {
	socket.disconnect(1000, 'User left game');
	window.location = '/';
}

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
			const scoresText =
				animatedScene.state.players.size > 0
					? Array.from(animatedScene.state.players)
							.map(([username, player]) => `${username}: ${player.score}`)
							.join(', ')
					: 'N/A';
			this.self.innerText = `Control with WASD
				Camera tracks the ball
				Score: ${scoresText}
				Ball Speed: ${ball.body.v.norm().toFixed(2)}

				Camera: ${animatedScene.camera.position.x.toFixed(1)}, ${animatedScene.camera.position.y.toFixed(1)}, ${animatedScene.camera.position.z.toFixed(1)}

                FPS: ${(1 / dt).toFixed(0)}
				Ping: ${pingText}`;
		}
	}),
	new GameObjectCustom('waitingScreen', {
		component: document.getElementById('waiting'),
		playerListDisplay: document.getElementById('waiting__players'),
		startButtion: document.getElementById('startButton'),
		publicButton: document.getElementById('waitingPublicButton'),
		privateButton: document.getElementById('waitingPrivateButton'),
		leaveButton: document.getElementById('waitingLeaveButton'),
		players: animatedScene.state.players,
		lobbyMembers: [],
		isPublic: true,
		socket,
		init() {
			this.startButtion.addEventListener('click', () => {
				socket.send({ type: 'start' });
			});

			this.publicButton.addEventListener('click', () => {
				this.sendVisibility(true);
			});
			this.privateButton.addEventListener('click', () => {
				this.sendVisibility(false);
			});
			this.leaveButton.addEventListener('click', () => {
				leaveGame();
			});

			socket.addHandler('lobbyState', (msg) => {
				animatedScene.host = msg.host;
				this.lobbyMembers = msg.members ?? [];
				this.isPublic = Boolean(msg.isPublic);
				this.updateVisibilityButtons();
			});
		},
		sendVisibility(isPublic) {
			this.isPublic = isPublic;
			this.updateVisibilityButtons();
			socket.send({
				type: 'setLobbyVisibility',
				isPublic
			});
		},
		updateVisibilityButtons() {
			this.publicButton.classList.toggle('active', this.isPublic);
			this.privateButton.classList.toggle('active', !this.isPublic);
		},
		update(dt) {
			if (animatedScene.enabled) {
				this.component.style.display = 'none';
				return;
			}

			this.component.style.display = 'flex';
			const isHost = animatedScene.isHost;
			this.publicButton.disabled = !isHost;
			this.privateButton.disabled = !isHost;
			this.updateVisibilityButtons();

			this.playerListDisplay.innerHTML = this.lobbyMembers
				.map(({ clientId: name }) => {
					const kickControl =
						isHost && name !== animatedScene.username
							? `<button class="kick-button" data-player="${name}">Kick</button>`
							: '';
					const hostTag =
						name === animatedScene.host
							? '<em style="color:#ffd447; margin-left:0.4rem;">(Host)</em>'
							: '';
					return `<span style="color: ${name === animatedScene.host ? 'yellow' : 'white'}"><strong>${name}</strong>${hostTag}${kickControl}</span>`;
				})
				.join('');

			for (const button of this.playerListDisplay.querySelectorAll('.kick-button')) {
				button.onclick = () => {
					socket.send({ type: 'kick', target: button.dataset.player });
				};
			}

			this.startButtion.disabled =
				this.players.size < 2 || !animatedScene.isHost;
		}
	}),
	new GameObjectCustom('gameControls', {
		component: document.getElementById('game-controls'),
		hostBadge: document.getElementById('host-badge'),
		kickButton: document.getElementById('inGameKickButton'),
		leaveButton: document.getElementById('inGameLeaveButton'),
		socket,
		init() {
			this.kickButton.addEventListener('click', () => {
				const opponent = this.getOpponentName();
				if (!opponent) return;
				socket.send({ type: 'kick', target: opponent });
			});
			this.leaveButton.addEventListener('click', () => {
				leaveGame();
			});
		},
		getOpponentName() {
			for (const username of animatedScene.state.players.keys()) {
				if (username !== animatedScene.username) return username;
			}
			return null;
		},
		update(dt) {
			if (!animatedScene.enabled) {
				this.component.style.display = 'none';
				return;
			}

			this.component.style.display = 'flex';
			const isHost = animatedScene.isHost;
			const opponent = this.getOpponentName();
			this.hostBadge.textContent = isHost
				? 'You are Host'
				: `Host: ${animatedScene.host ?? 'N/A'}`;
			this.kickButton.style.display = isHost ? 'block' : 'none';
			this.kickButton.disabled = !opponent;
		}
	})
);

animatedScene.start();
