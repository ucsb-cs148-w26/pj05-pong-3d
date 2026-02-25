import * as THREE from 'three';
import * as Constants from '../constants.js';
import { Scene } from '../common/Scene.js';
import { Paddle } from './Paddle.js';
import { KeyboardController } from '../controllers.js';
import { Arena } from './Arena.js';
import { Ball } from './Ball.js';
import { CameraController } from './CameraController.js';
import { GameState, Player } from '../common/GameState.js';
import { GoalAnimationSpawner } from '../shaders/goalAnimationSpawner.js';
import { GameObjectCustom } from '../common/GameObject.js';

/**
 * Scene with rendering capabilities. Uses the `visual` on each game object.
 */
export class AnimatedScene extends Scene {
	#ball = null;

	constructor(socket) {
		super(new GameState());

		this.host = null;
		this.username = null;
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		document.body.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			110,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);

		const goalSpawner = new GoalAnimationSpawner('goalSpawner');
		this.registerGameObject(goalSpawner);

		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		});

		this.camera.position.set(-16, 0, 0);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		this.physicsClock = new THREE.Clock();
		this.physicsInterval = null;

		this._isRunning = false;
		this._hiddenHtml = new Map();

		this.isReplaying = false;

		socket.addHandler('sync', this.#sync.bind(this));
		socket.addHandler('playerSync', this.#playerSync.bind(this));

		// Order matters: Sync with ServerScene.js
		this.registerGameObject(new Arena('gameArena'));

		this.#ball = new Ball('ball', goalSpawner);
		this.registerGameObject(this.#ball);

		const p1 = new Paddle('paddle1', socket, 'paddle', -23.5 / 2.125, null);

		const p2 = new Paddle('paddle2', socket, 'paddle', 23.5 / 2.125, null);
		p2.visual.rotation.y = Math.PI;

		this.registerGameObject(p1, p2);

		this.registerGameObject(
			new CameraController(
				'cameraController',
				null,
				this.getGameObject('ball'),
				{
					offset: new THREE.Vector3(-4, 3, 0)
				}
			)
		);
	}

	get active() {
		return this.#ball.enabled;
	}

	registerGameObject(...objs) {
		super.registerGameObject(...objs);

		for (const obj of objs) {
			if (obj.visual) {
				this.scene.add(obj.visual);
			}
		}
	}

	deleteGameObject(key) {
		const obj = this.getGameObject(key);
		if (!obj) return false;

		if (obj.visual) {
			this.scene.remove(obj.visual);
			this.#disposeVisual(obj.visual);
		}

		return super.deleteGameObject(key);
	}

	simulate() {
		const delta = this.physicsClock.getDelta();
		this.step(Math.min(delta, 2 / Constants.SIMULATION_RATE));
	}

	animate() {
		if (!this._isRunning) {
			this.renderer.clear();
			return;
		}

		requestAnimationFrame(() => this.animate());
		this.renderer.render(this.scene, this.camera);
	}

	start() {
		if (this._isRunning) return;
		this._isRunning = true;
		this._showNonThreeElements();

		// FIXME: this is not precise
		this.physicsInterval = setInterval(
			() => this.simulate(),
			1000 / Constants.SIMULATION_RATE
		);

		this.animate();
	}

	stop() {
		if (!this._isRunning) return;
		this._isRunning = false;
		this._hideNonThreeElements();
		this.renderer.render(this.scene, this.camera);

		if (this.physicsInterval) clearInterval(this.physicsInterval);
		this.physicsInterval = null;
	}

	_hideNonThreeElements() {
		this._hiddenHtml.clear();
		for (const el of document.body.children) {
			if (el === this.renderer.domElement) continue;
			this._hiddenHtml.set(el, el.style.display);
			el.style.display = 'none';
		}
	}

	_showNonThreeElements() {
		for (const [el, display] of this._hiddenHtml.entries()) {
			el.style.display = display;
		}
		this._hiddenHtml.clear();
	}

	#disposeVisual(root) {
		root.traverse((obj) => {
			if (obj.geometry) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) {
					for (const mat of obj.material) this.#disposeMaterial(mat);
				} else {
					this.#disposeMaterial(obj.material);
				}
			}
		});
	}

	#disposeMaterial(mat) {
		for (const key in mat) {
			const value = mat[key];
			if (value && value.isTexture) value.dispose();
		}
		mat.dispose?.();
	}

	#sync(msg) {
		this.state.physics.importState(msg.physics);

		this.#ball.enabled = msg.active;

		for (const [username, score] of Object.entries(msg.gameInfo)) {
			const player = this.state.players.get(username);
			if (player) player.score = score;
		}

		const controller = this.state.players.get(this.username).paddle.controller;

		// prediction!
		let idx = -1;
		for (let i = 0; i < controller.inputBuffer.length; i++) {
			if (controller.inputBuffer[i].seq <= msg.ack) continue;

			idx = i;
			break;
		}

		if (idx === -1) return; // all inputs ack'd

		controller.inputBuffer = controller.inputBuffer.slice(idx); // drop ack'd inputs
		controller.useInputBuffer = true;
		this.isReplaying = true;

		for (let i = 0; i < controller.inputBuffer.length; i++) {
			controller.inputBufferIdx = i;
			this.step(1 / Constants.SIMULATION_RATE); // Is this not good enough? If not, we can store the physics time in the packets themselves
		}

		this.isReplaying = false;
		controller.useInputBuffer = false;
	}

	get isHost() {
		return this.host === this.username;
	}

	get enabled() {
		return this.#ball.enabled;
	}

	#playerSync(msg) {
		this.username = msg.username;
		this.host = msg.host;

		const cameraController = this.getGameObject('cameraController');
		if (cameraController) cameraController.followTarget = null;

		this.state.players.clear();

		for (const player of msg.players) {
			const paddle = this.getGameObject(player.key);
			this.state.players.set(
				player.username,
				new Player(player.username, paddle)
			);

			const socket = this.getGameObject('socket').config.socket;

			if (!player.remote) {
				// TODO: this is silly
				cameraController.followTarget = paddle;
				if (player.pos[0] < 0) {
					cameraController.offset = new THREE.Vector3(-4, 3, 0);
					paddle.controller = new KeyboardController(socket);
				} else {
					cameraController.offset = new THREE.Vector3(4, 3, 0);
					paddle.controller = new KeyboardController(socket, [
						'KeyD',
						'KeyA',
						'KeyW',
						'KeyS'
					]);
				}
			}
		}
	}
}
