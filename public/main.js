import * as THREE from 'three';
import { AnimatedScene } from './game/client/AnimatedScene.js';
import { GameObjectCustom } from './game/common/GameObject.js';
import { Arena } from './game/client/Arena.js';
import { Ball } from './game/client/Ball.js';
import { Paddle } from './game/client/Paddle.js';
import { KeyboardController } from './game/controllers.js';
import { CameraController } from './game/client/CameraController.js';

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
			const paddle1 = animatedScene.getGameObject('paddleWASD');
			const paddle2 = animatedScene.getGameObject('paddleIJKL');

			const p1Speed =
				paddle1 && paddle1.body ? paddle1.body.v.norm().toFixed(2) : '--';

			const p2Speed =
				paddle2 && paddle2.body ? paddle2.body.v.norm().toFixed(2) : '--';

			const pingText =
				this.socket?.lastLatencyMs == null
					? 'Ping: -- ms'
					: `Ping: ${this.socket.lastLatencyMs.toFixed(0)} ms`;
			this.self.innerText = `P1: WASD
				P2: IJKL
				Camera: ${animatedScene.camera.position.x.toFixed(1)}, ${animatedScene.camera.position.y.toFixed(1)}, ${animatedScene.camera.position.z.toFixed(1)}
				Follow camera tracks the ball
				Score: Green [${this.scores.WASD}], Red [${this.scores.IJKL}]
				Ball Speed: ${this.scores.ballSpeed.toFixed(2)}

				Paddle Green Speed: ${p1Speed}
				Paddle Red Speed: ${p2Speed}
				${pingText}`;
		}
	})
);

// Order matters: Sync with ServerScene.js
animatedScene.registerGameObject(
	new Arena('gameArena'),
	new Ball('ball', animatedScene.getGameObject('infoDiv').config.scores),
	new Paddle('paddleWASD', 'paddle', -23.5 / 2.125, {
		color: 0x00ff00,
		linewidth: 4
	})
	// new Paddle(
	// 	'paddleIJKL',
	// 	'paddle',
	// 	23.5 / 2.125,
	// 	{ color: 0xff0000, linewidth: 4 },
	// 	new KeyboardController(['KeyJ', 'KeyL', 'KeyI', 'KeyK'])
	// )
);

animatedScene.registerGameObject(
	new CameraController(
		'cameraController',
		animatedScene.getGameObject('paddleWASD'),
		animatedScene.getGameObject('ball'),
		{
			offset: new THREE.Vector3(-4, 3, 0)
		}
	)
);

animatedScene.start();
