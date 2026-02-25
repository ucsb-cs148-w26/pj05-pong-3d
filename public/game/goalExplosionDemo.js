import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AnimatedScene } from './client/AnimatedScene.js';
import { GameObjectCustom } from './common/GameObject.js';
import { GOAL_EXPLOSION_STYLES } from './shaders/goalAnimations.js';
import { GoalAnimationSpawner } from './shaders/goalAnimationSpawner.js';
/*
/  This is a Demo Scene to show off the various Goal Explosion Animations
/  Right now this is only for Development purposes, but time-permiting might can this to be usable as a User-facing Cosmetic Viewing UI Page
/  It also serves as a developer guide that shows how to use the goalExplosion system in the main game
*/
export function startGoalExplosionDemo() {
	const demoSocket = {
		addHandler() {}
	};

	const animatedScene = new AnimatedScene(demoSocket);
	animatedScene.camera.position.set(8, 2, 0);
	animatedScene.camera.lookAt(0, 0, 0);
	const orbitControls = new OrbitControls(
		animatedScene.camera,
		animatedScene.renderer.domElement
	);
	orbitControls.target.set(0, 0, 0);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.08;
	orbitControls.update();

	//Disabling built-in animatedScene stuff we don't need here
	const arena = animatedScene.getGameObject('gameArena');
	if (arena?.visual) arena.visual.visible = false;
	const ball = animatedScene.getGameObject('ball');
	if (ball?.visual) ball.visual.visible = false;
	if (ball) ball.enabled = false;

	const goalSpawner = new GoalAnimationSpawner();
	animatedScene.scene.add(goalSpawner.visual);

	const state = {
		delay: 2.0,
		cooldown: 1.0,
		styleIndex: GOAL_EXPLOSION_STYLES[0]?.styleIndex ?? 0,
		useBaseColor: true,
		colorHex: '#ffffff'
	};

	animatedScene.registerGameObject(
		new GameObjectCustom('gradientSky', {
			visual: createGradientSkybox()
		}),
		new GameObjectCustom('goalExplosionLoop', {
			update(dt) {
				orbitControls.update();
				goalSpawner.update(dt);

				if (goalSpawner.active) return;

				state.cooldown += dt;
				if (state.cooldown < state.delay) return;
				state.cooldown = 0.0;

				const color = state.useBaseColor
					? null
					: new THREE.Color(state.colorHex);

				goalSpawner.triggerGoalAnimation(
					state.styleIndex,
					color,
					new THREE.Vector3(0, 0, 0)
				);
			},
			kill() {
				orbitControls.dispose();
			}
		}),
		new GameObjectCustom('goalExplosionControls', {
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

				const title = document.createElement('div');
				title.innerText = 'Goal Explosion Demo';
				title.style.marginBottom = '8px';
				title.style.fontWeight = 'bold';
				this.self.appendChild(title);

				const styleLabel = document.createElement('div');
				styleLabel.innerText = 'Style';
				styleLabel.style.marginBottom = '4px';
				this.self.appendChild(styleLabel);

				const styleSelect = document.createElement('select');
				styleSelect.style.display = 'block';
				styleSelect.style.marginBottom = '8px';
				for (const style of GOAL_EXPLOSION_STYLES) {
					const option = document.createElement('option');
					option.value = String(style.styleIndex);
					option.textContent = style.label;
					styleSelect.appendChild(option);
				}
				styleSelect.value = String(state.styleIndex);
				styleSelect.addEventListener('change', () => {
					state.styleIndex = Number(styleSelect.value);
					state.cooldown = state.delay;
				});
				this.self.appendChild(styleSelect);

				const colorModeLabel = document.createElement('div');
				colorModeLabel.innerText = 'Color';
				colorModeLabel.style.marginBottom = '4px';
				this.self.appendChild(colorModeLabel);

				const colorModeSelect = document.createElement('select');
				colorModeSelect.style.display = 'block';
				colorModeSelect.style.marginBottom = '8px';
				const baseOption = document.createElement('option');
				baseOption.value = 'base';
				baseOption.textContent = 'Base';
				colorModeSelect.appendChild(baseOption);
				const customOption = document.createElement('option');
				customOption.value = 'custom';
				customOption.textContent = 'Custom';
				colorModeSelect.appendChild(customOption);
				colorModeSelect.value = 'base';
				this.self.appendChild(colorModeSelect);

				const colorPicker = document.createElement('input');
				colorPicker.type = 'color';
				colorPicker.value = state.colorHex;
				colorPicker.disabled = true;
				colorPicker.style.display = 'block';
				colorPicker.style.marginBottom = '8px';
				colorPicker.addEventListener('input', () => {
					state.colorHex = colorPicker.value;
					state.cooldown = state.delay;
				});
				this.self.appendChild(colorPicker);

				colorModeSelect.addEventListener('change', () => {
					state.useBaseColor = colorModeSelect.value === 'base';
					colorPicker.disabled = state.useBaseColor;
					state.cooldown = state.delay;
				});

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
			},
			kill() {
				this.self.remove();
			}
		})
	);

	animatedScene.start();
	return animatedScene;
}

function createGradientSkybox() {
	const geometry = new THREE.SphereGeometry(200, 32, 16);
	const material = new THREE.ShaderMaterial({
		vertexShader: `
			varying vec3 vWorldPosition;
			void main() {
				vec4 worldPosition = modelMatrix * vec4(position, 1.0);
				vWorldPosition = worldPosition.xyz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 topColor;
			uniform vec3 midColor;
			uniform vec3 botColor;
			varying vec3 vWorldPosition;

			void main() {
				vec3 dir = normalize(vWorldPosition);
				float h = dir.y * 0.5 + 0.5;

				vec3 color = mix(botColor, midColor, smoothstep(0.0, 0.45, h));
				color = mix(color, topColor, smoothstep(0.42, 1.0, h));

				float centerBand = 1.0 - smoothstep(0.18, 0.55, abs(dir.y));
				color += midColor * centerBand * 0.22;

				gl_FragColor = vec4(color, 1.0);
			}
		`,
		uniforms: {
			topColor: { value: new THREE.Color(0x0b2247) },
			midColor: { value: new THREE.Color(0x16215e) },
			botColor: { value: new THREE.Color(0x3e6fa0) }
		},
		side: THREE.BackSide,
		depthWrite: false
	});

	const sky = new THREE.Mesh(geometry, material);
	return sky;
}
