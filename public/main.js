import * as THREE from 'three';
import { AnimatedScene } from './game/animatedScene.js';
import { Arena, Ball, Paddle } from './game/gameObjects.js';
import { KeyboardController } from './game/controllers.js';

const animatedScene = new AnimatedScene();

animatedScene.registerGameObject(
	{
		key: 'gameArena',
		object: new Arena()
	},
	{
		key: 'ambientLight',
		visual: new THREE.AmbientLight(0xffffff, 0.2)
	},
	{
		key: 'light1',
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(0, 0, 0);
		}
	},
	{
		key: 'light2',
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(-8, 0, 0);
		}
	},
	{
		key: 'light3',
		visual: new THREE.PointLight(0xffffff, 1000, 100),
		init() {
			this.visual.position.set(8, 0, 0);
		}
	},
	{
		key: 'infoDiv',
		self: document.createElement('div'),
		scores: { WASD: 0, IJKL: 0, ballSpeed: 0 },
		init() {
			this.self.style.position = 'absolute';
			this.self.style.top = '10px';
			this.self.style.left = '10px';
			this.self.style.color = 'white';
			this.self.style.fontFamily = 'monospace';
			document.body.appendChild(this.self);
		},
		update(dt) {
			this.self.innerText = `P1: WASD
				P2: IJKL
				Camera: ${animatedScene.camera.position.x.toFixed(1)}, ${animatedScene.camera.position.y.toFixed(1)}, ${animatedScene.camera.position.z.toFixed(1)}
				Scroll wheel zooms in and out
				Score: Green [${this.scores.WASD}], Red [${this.scores.IJKL}]
				Ball Speed: ${this.scores.ballSpeed.toFixed(2)}`;
		}
	},
	{
		key: 'authDiv',
		self: document.createElement('div'),
		init() {
			this.self.style.position = 'absolute';
			this.self.style.top = '10px';
			this.self.style.right = '10px';
			this.self.style.color = 'white';
			this.self.style.fontFamily = 'monospace';
			this.self.style.display = 'flex';
			this.self.style.gap = '8px';
			this.self.style.alignItems = 'center';

			const status = document.createElement('span');
			status.id = 'auth-status';
			status.innerText = 'Checking login...';

			const loginButton = document.createElement('button');
			loginButton.id = 'login-button';
			loginButton.innerText = 'Login with Google';
			loginButton.style.display = 'none';

			const logoutButton = document.createElement('button');
			logoutButton.id = 'logout-button';
			logoutButton.innerText = 'Logout';
			logoutButton.style.display = 'none';

			for (const button of [loginButton, logoutButton]) {
				button.style.cursor = 'pointer';
				button.style.padding = '6px 10px';
				button.style.borderRadius = '6px';
				button.style.border = '1px solid rgba(255,255,255,0.35)';
				button.style.background = 'rgba(0,0,0,0.35)';
				button.style.color = 'white';
				button.style.fontFamily = 'monospace';
			}

			loginButton.addEventListener('click', () => {
				window.location.href = '/auth/google';
			});

			logoutButton.addEventListener('click', async () => {
				await fetch('/auth/logout', { method: 'POST' });
				await this.refresh();
			});

			this.self.appendChild(status);
			this.self.appendChild(loginButton);
			this.self.appendChild(logoutButton);
			document.body.appendChild(this.self);

			this.statusEl = status;
			this.loginButton = loginButton;
			this.logoutButton = logoutButton;

			this.refresh();
		},

		async refresh() {
			try {
				const res = await fetch('/auth/me');
				if (!res.ok) {
					this.statusEl.innerText = 'Not logged in';
					this.loginButton.style.display = '';
					this.logoutButton.style.display = 'none';
					return;
				}

				const { user } = await res.json();
				const name = user?.displayName || 'User';
				this.statusEl.innerText = `Logged in as ${name}`;
				this.loginButton.style.display = 'none';
				this.logoutButton.style.display = '';
			} catch {
				this.statusEl.innerText = 'Auth error';
				this.loginButton.style.display = '';
				this.logoutButton.style.display = 'none';
			}
		}
	},
	{
		key: 'paddleWASD',
		object: new Paddle({ color: 0x00ff00, linewidth: 4 }),
		init() {
			this.object.body.applyTransform((vec) => vec.add(-23.5 / 4.125, 0, 0));
			animatedScene.physics.registerForce(this.object.forceApplier);
		}
	},
	{
		key: 'paddleIJKL',
		object: new Paddle(
			{ color: 0xff0000, linewidth: 4 },
			new KeyboardController('yz', ['KeyJ', 'KeyL', 'KeyI', 'KeyK'])
		),
		init() {
			this.object.body.applyTransform((vec) => vec.add(23.5 / 4.125, 0, 0));
			animatedScene.physics.registerForce(this.object.forceApplier);
		}
	}
);

animatedScene.registerGameObject({
	key: 'ball',
	object: new Ball(
		animatedScene.getGameObject('paddleWASD'),
		animatedScene.getGameObject('paddleIJKL'),
		animatedScene.getGameObject('infoDiv').scores
	),
	init() {
		this.object.reset();
	}
});

animatedScene.animate();
