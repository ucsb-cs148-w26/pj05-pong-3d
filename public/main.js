import * as THREE from 'three';
import { AnimatedScene } from './game/animatedScene.js';
import { GameObjectCustom } from './game/common/GameObject.js';
import { Arena } from './game/client/Arena.js';
import { Ball } from './game/client/Ball.js';
import { Paddle } from './game/client/Paddle.js';
import { KeyboardController } from './game/controllers.js';
import PongSocketClient from './socket.js';
import { initChat } from './chat.js';

const socket = new PongSocketClient();
initChat(socket);
socket.connect();

const animatedScene = new AnimatedScene();

animatedScene.registerGameObject(
	new Arena('gameArena'),
	new GameObjectCustom('ambientLight', {
		visual: new THREE.AmbientLight(0xffffff, 0.2)
	}),
	new GameObjectCustom('light1', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(0, 0, 0);
		}
	}),
	new GameObjectCustom('light2', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(-8, 0, 0);
		}
	}),
	new GameObjectCustom('light3', {
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(8, 0, 0);
		}
	}),
	new GameObjectCustom('infoDiv', {
		self: document.createElement('div'),
		scores: { WASD: 0, IJKL: 0, ballSpeed: 0 },
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
			const pingText =
				this.socket?.lastLatencyMs == null
					? 'Ping: -- ms'
					: `Ping: ${this.socket.lastLatencyMs.toFixed(0)} ms`;
			this.self.innerText = `P1: WASD
				P2: IJKL
				Camera: ${animatedScene.camera.position.x.toFixed(1)}, ${animatedScene.camera.position.y.toFixed(1)}, ${animatedScene.camera.position.z.toFixed(1)}
				Scroll wheel zooms in and out
				Score: Green [${this.scores.WASD}], Red [${this.scores.IJKL}]
				Ball Speed: ${this.scores.ballSpeed.toFixed(2)}
				${pingText}`;
		}
	}),
	new Paddle(
		'paddleWASD',
		{ color: 0x00ff00, linewidth: 4 },
		'paddle',
		-23.5 / 2.125
	),
	new Paddle(
		'paddleIJKL',
		{ color: 0xff0000, linewidth: 4 },
		'paddle',
		23.5 / 2.125,
		new KeyboardController('yz', ['KeyJ', 'KeyL', 'KeyI', 'KeyK'])
	)
);

animatedScene.registerGameObject(
	new Ball('ball', animatedScene.getGameObject('infoDiv').config.scores)
);

animatedScene.animate();
