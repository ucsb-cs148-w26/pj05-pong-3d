import * as THREE from 'three';
import { AnimatedScene } from './game/client/AnimatedScene.js';
import { GameObjectCustom } from './game/common/GameObject.js';

import PongSocketClient from './socket.js';
import { initChat } from './chat.js';

const socket = new PongSocketClient();
initChat(socket);
socket.connect();

const initialCosmetics = window.__PONG_BOOTSTRAP__?.cosmetics;
const animatedScene = new AnimatedScene(socket, initialCosmetics);
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
				animatedScene.scores && Object.keys(animatedScene.scores).length
					? Object.entries(animatedScene.scores)
							.map(([name, score]) => `${name}: ${score}`)
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
	})
);

animatedScene.start();
