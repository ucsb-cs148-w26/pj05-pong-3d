import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Arena } from './arena.js';
import { Paddle } from './paddle.js';
import { Ball } from './ball.js';

export class AnimatedScene {
	#animateCallbacks = [];

	constructor() {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			110,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.enabled = true;
		this.isOrbiting = true;

		this.infoDiv = document.createElement('div');
		this.infoDiv.style.position = 'absolute';
		this.infoDiv.style.top = '10px';
		this.infoDiv.style.left = '10px';
		this.infoDiv.style.color = 'white';
		this.infoDiv.style.fontFamily = 'monospace';
		document.body.appendChild(this.infoDiv);

		window.addEventListener('pointerdown', (event) => {
			if (event.button === 1) {
				this.toggleCameraMode();
			}
		});

		this.init();

		this.time = 0;
		this.ballSpeed = 5;
		this.ballDirection = 1;
		this.zSpeed = 5;
		this.zDirection = 1;
		this.ySpeed = 2.5;
		this.yDirection = 1;

		this.clock = new THREE.Clock();
		this.renderer.setAnimationLoop(this.animate.bind(this));
	}

	addAnimateCallback(cb) {
		this.#animateCallbacks.push(cb);
	}

	animate() {
		const delta = this.clock.getDelta();
		this.update(delta);
		this.renderer.render(this.scene, this.camera);

		for (const cb of this.#animateCallbacks) {
			cb(delta);
		}
	}

	toggleCameraMode() {
		this.isOrbiting = !this.isOrbiting;
		this.controls.enabled = this.isOrbiting;

		if (this.isOrbiting) {
			this.camera.position.set(-37.5, 15, 22.5);
			this.camera.up.set(0, 1, 0);
			this.camera.lookAt(0, 0, 0);
			this.controls.target.set(0, 0, 0);
		} else {
			this.camera.position.set(0, 0, 0);
			this.camera.up.set(0, 0, 1);
		}
	}

	init() {
		// Add Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
		this.scene.add(ambientLight);

		const light = new THREE.PointLight(0xffffff, 1000, 100);
		light.position.set(0, 0, 0);
		this.scene.add(light);

		const light2 = new THREE.PointLight(0xffffff, 1000, 100);
		light2.position.set(-8, 0, 0);
		this.scene.add(light2);

		const light3 = new THREE.PointLight(0xffffff, 1000, 100);
		light3.position.set(8, 0, 0);
		this.scene.add(light3);

		// Add Arena
		this.arena = new Arena();
		this.scene.add(this.arena.mesh);

		// Add Paddles
		this.paddle1 = new Paddle(0x00ff00); // Green
		this.paddle1.mesh.position.set(-11.75, 0, 0);
		this.scene.add(this.paddle1.mesh);

		this.paddle2 = new Paddle(0x0000ff); // Blue
		this.paddle2.mesh.position.set(11.75, 0, 0);
		this.scene.add(this.paddle2.mesh);

		// Add Ball
		this.ball = new Ball();
		this.ball.mesh.position.y = 0;
		this.scene.add(this.ball.mesh);

		// Setup Camera
		this.camera.position.set(-37.5, 15, 22.5);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		window.addEventListener('resize', this.onWindowResize.bind(this));
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	update(delta) {
		this.time += delta;

		this.infoDiv.innerText = `Camera: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}\nPress Middle Mouse Button to Toggle Camera Mode\nWhile in Orbit mode:\n Hold left mouse button and drag to rotate camera view\nScroll wheel zooms in and out`;

		// Ball bouncing animation (X axis)
		this.ball.mesh.position.x += this.ballSpeed * delta * this.ballDirection;
		if (this.ball.mesh.position.x > 11.2) {
			this.ball.mesh.position.x = 11.2;
			this.ballDirection = -1;
		} else if (this.ball.mesh.position.x < -11.2) {
			this.ball.mesh.position.x = -11.2;
			this.ballDirection = 1;
		}

		if (this.isOrbiting) {
			this.controls.update();
		} else {
			this.camera.lookAt(this.ball.mesh.position);
		}
	}
}
