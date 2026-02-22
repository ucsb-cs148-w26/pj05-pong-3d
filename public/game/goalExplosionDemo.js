import * as THREE from 'three';
import { AnimatedScene } from './client/AnimatedScene.js';
import { GOAL_EXPLOSION_STYLES } from './shaders/goalAnimations.js';
import { GoalAnimationSpawner } from './shaders/goalAnimationSpawner.js';

/*
/  This is a Demo Scene to show off the various Goal Explosion Animations
/  Right now this is only for Development purposes, but time-permiting might can this to be usable as a User-facing Cosmetic Viewing UI Page
/  It also serves as a developer guide that shows how to use the goalExplosion system in the main game
*/
export function startGoalExplosionDemo() {
	const animatedScene = new AnimatedScene();
	animatedScene.controls.enabled = true;
	animatedScene.camera.position.set(8, 2, 0);
	animatedScene.controls.target.set(0, 0, 0);
	animatedScene.controls.update();

	animatedScene.registerGameObject(
		{
			key: 'ambientLight',
			visual: new THREE.AmbientLight(0xffffff, 0.25)
		},
		{
			key: 'keyLight',
			visual: new THREE.PointLight(0xffffff, 600, 60, 2),
			init() {
				this.visual.position.set(8, 8, 6);
			}
		},
		{
			key: 'demoGoal',
			visual: createGoalFrame(),
			init() {
				this.visual.position.set(0, 0, 0);
			}
		},
		{
			key: 'goalBackdrop',
			visual: new THREE.Mesh(
				new THREE.PlaneGeometry(100, 100),
				new THREE.MeshStandardMaterial({
					color: 0xffffff,
					roughness: 0.8,
					metalness: 0.0,
					side: THREE.DoubleSide
				})
			),
			init() {
				this.visual.position.set(0, 0, -60);
				this.visual.rotation.y = Math.PI;
			}
		},
		{
			key: 'demoBall',
			visual: new THREE.Mesh(
				new THREE.SphereGeometry(0.35, 24, 24),
				new THREE.MeshStandardMaterial({
					color: 0xffffff,
					roughness: 0.4,
					metalness: 0.1
				})
			),
			init() {
				this.visual.visible = false;
			}
		},
		{
			key: 'goalExplosion',
			object: new GoalAnimationSpawner({
				initialPoolSize: 1,
				maxPoolSize: 6
			})
		},
		{
			key: 'demoLoop',
			self: {
				delay: 2.0,
				cooldown: 0.0,
				runTime: 0.0,
				runDuration: 2.2,
				hasTriggered: false,
				styleIndex: GOAL_EXPLOSION_STYLES[0]?.styleIndex ?? 0,
				baseColor: new THREE.Color(0xffffff),
				overrideColor: null
			},
			update(dt) {
				const explosion = animatedScene.getGameObject('goalExplosion');
				const ball = animatedScene.getGameObject('demoBall');
				if (!explosion || !ball) return;

				if (this.self.runTime === 0.0 && explosion.active) {
					return;
				}

				if (this.self.cooldown < this.self.delay) {
					this.self.cooldown += dt;
					return;
				}

				if (this.self.runTime === 0.0) {
					this.self.hasTriggered = false;
					ball.visual.visible = true;
				}

				this.self.runTime += dt;
				const t = Math.min(1.0, this.self.runTime / this.self.runDuration);
				const x = -10 + 20 * t;
				ball.visual.position.set(x, 0, 0);

				if (!this.self.hasTriggered && x >= 0) {
					this.self.hasTriggered = true;
					ball.visual.visible = false;
					explosion.trigger(
						new THREE.Vector3(0, 0, 0),
						this.self.overrideColor,
						this.self.styleIndex
					);
				}

				if (t >= 1.0) {
					this.self.runTime = 0.0;
					this.self.cooldown = 0.0;
					ball.visual.visible = false;
				}
			}
		},
		{
			key: 'demoControls',
			self: document.createElement('div'),
			init() {
				this.self.style.position = 'absolute';
				this.self.style.top = '12px';
				this.self.style.left = '12px';
				this.self.style.padding = '10px 12px';
				this.self.style.background = 'rgba(0, 0, 0, 0.45)';
				this.self.style.border = '1px solid rgba(255, 255, 255, 0.2)';
				this.self.style.borderRadius = '8px';
				this.self.style.color = 'white';
				this.self.style.fontFamily = 'monospace';
				this.self.style.fontSize = '12px';
				this.self.style.userSelect = 'none';

				const label = document.createElement('div');
				label.innerText = 'Goal Explosion Demo';
				label.style.marginBottom = '8px';
				label.style.fontWeight = 'bold';
				this.self.appendChild(label);

				const select = document.createElement('select');
				for (const style of GOAL_EXPLOSION_STYLES) {
					const option = document.createElement('option');
					option.value = style.styleIndex;
					option.textContent = style.label;
					select.appendChild(option);
				}
				select.addEventListener('change', () => {
					const demoLoop = animatedScene.getGameObject('demoLoop');
					if (!demoLoop) return;
					demoLoop.self.styleIndex = Number(select.value);
					demoLoop.self.cooldown = demoLoop.self.delay;
					demoLoop.self.runTime = 0.0;
				});
				this.self.appendChild(select);

				const colorLabel = document.createElement('div');
				colorLabel.innerText = 'Color';
				colorLabel.style.marginTop = '8px';
				colorLabel.style.marginBottom = '4px';
				this.self.appendChild(colorLabel);

				const colorSelect = document.createElement('select');
				const colorOptions = [
					{ label: 'Base', value: 'base' },
					{ label: 'Cyan', value: 0x6fe7ff },
					{ label: 'Magenta', value: 0xff6bd6 },
					{ label: 'White', value: 0xffffff },
					{ label: 'Gold', value: 0xffd36b },
					{ label: 'Lime', value: 0x7bff5a },
					{ label: 'Blue', value: 0x5aa2ff },
					{ label: 'Crimson', value: 0xff3b4a },
					{ label: 'Orange', value: 0xff8a3d },
					{ label: 'Amber', value: 0xffc04a },
					{ label: 'Chartreuse', value: 0xb5ff3a },
					{ label: 'Mint', value: 0x5cffb5 },
					{ label: 'Teal', value: 0x22f0d6 },
					{ label: 'Sky', value: 0x5cd6ff },
					{ label: 'Indigo', value: 0x5c6bff },
					{ label: 'Violet', value: 0xa35cff },
					{ label: 'Lavender', value: 0xd7b3ff },
					{ label: 'Rose', value: 0xff7ab8 },
					{ label: 'Coral', value: 0xff6f61 },
					{ label: 'Peach', value: 0xffb28a },
					{ label: 'Seafoam', value: 0x78ffd6 },
					{ label: 'Ice', value: 0xb8f1ff }
				];
				for (const optionData of colorOptions) {
					const option = document.createElement('option');
					option.value = optionData.value;
					option.textContent = optionData.label;
					colorSelect.appendChild(option);
				}
				colorSelect.addEventListener('change', () => {
					const demoLoop = animatedScene.getGameObject('demoLoop');
					const explosion = animatedScene.getGameObject('goalExplosion');
					if (!demoLoop || !explosion) return;
					const selectedValue = colorSelect.value;
					if (selectedValue === 'base') {
						demoLoop.self.overrideColor = null;
					} else {
						demoLoop.self.overrideColor = new THREE.Color(
							Number(selectedValue)
						);
					}
					demoLoop.self.cooldown = demoLoop.self.delay;
					demoLoop.self.runTime = 0.0;
				});
				this.self.appendChild(colorSelect);

				const spacer = document.createElement('div');
				spacer.style.height = '8px';
				this.self.appendChild(spacer);

				const backButton = document.createElement('button');
				backButton.innerText = 'Back to Game';
				backButton.style.fontFamily = 'monospace';
				backButton.style.fontSize = '11px';
				backButton.style.padding = '4px 8px';
				backButton.addEventListener('click', () => {
					window.location.search = '';
				});
				this.self.appendChild(backButton);

				document.body.appendChild(this.self);

				const demoLoop = animatedScene.getGameObject('demoLoop');
				const explosion = animatedScene.getGameObject('goalExplosion');
				if (demoLoop && explosion) {
					demoLoop.self.cooldown = demoLoop.self.delay;
					demoLoop.self.runTime = 0.0;
					const selectedValue = colorSelect.value;
					demoLoop.self.overrideColor =
						selectedValue === 'base'
							? null
							: new THREE.Color(Number(selectedValue) || 0xffffff);
				}
			}
		}
	);

	animatedScene.animate();
}

function createGoalFrame() {
	const frameMaterial = new THREE.MeshStandardMaterial({
		color: 0x202a3a,
		roughness: 0.6,
		metalness: 0.1
	});
	const thickness = 0.15;
	const width = 4;
	const height = 4;

	const horizontalGeometry = new THREE.BoxGeometry(thickness, thickness, width);
	const verticalGeometry = new THREE.BoxGeometry(thickness, height, thickness);

	const top = new THREE.Mesh(horizontalGeometry, frameMaterial);
	top.position.y = height / 2 - thickness / 2;
	const bottom = new THREE.Mesh(horizontalGeometry, frameMaterial);
	bottom.position.y = -height / 2 + thickness / 2;
	const left = new THREE.Mesh(verticalGeometry, frameMaterial);
	left.position.z = -width / 2 + thickness / 2;
	const right = new THREE.Mesh(verticalGeometry, frameMaterial);
	right.position.z = width / 2 - thickness / 2;

	const frame = new THREE.Group();
	frame.add(top, bottom, left, right);
	return frame;
}
