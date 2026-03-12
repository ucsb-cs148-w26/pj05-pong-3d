import * as THREE from 'three';
import * as Constants from '/game/constants.js';
import { BallSkin } from '/game/shaders/ballSkin.js';
import { GoalAnimationSpawner } from '/game/shaders/goalAnimationSpawner.js';
import { resolveCosmeticItemSelection } from '/game/cosmetics.js';
import { PaddleSkin } from '/game/shaders/paddleSkin.js';

const previewManagers = [];
const previewTarget = new THREE.Vector3(0, 0, 0);
let previewLoopStarted = false;

function addPreviewLights(scene) {
	scene.add(new THREE.AmbientLight(0xffffff, 0.82));

	const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
	keyLight.position.set(4, 5, 6);
	scene.add(keyLight);

	const fillLight = new THREE.DirectionalLight(0x8dc8ff, 0.35);
	fillLight.position.set(-4, 2, -3);
	scene.add(fillLight);

	const rimLight = new THREE.DirectionalLight(0xfff0c2, 0.28);
	rimLight.position.set(1, 6, -5);
	scene.add(rimLight);
}

function createPedestal(radius, y, color = 0x9bdcff) {
	const mesh = new THREE.Mesh(
		new THREE.CircleGeometry(radius, 48),
		new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 0.08
		})
	);
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = y;
	return mesh;
}

function createPreviewContext(stage, cameraPosition) {
	if (!stage) return null;

	const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	stage.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.copy(cameraPosition);
	camera.lookAt(previewTarget);

	addPreviewLights(scene);

	let previousWidth = 0;
	let previousHeight = 0;

	const resize = (force = false) => {
		const width = stage.clientWidth || 180;
		const height = stage.clientHeight || width;
		if (!force && width === previousWidth && height === previousHeight) return;

		previousWidth = width;
		previousHeight = height;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	resize(true);
	window.addEventListener('resize', () => resize());

	return {
		scene,
		camera,
		render() {
			resize();
			renderer.render(scene, camera);
		}
	};
}

function readItemName(item, fallbackLabel) {
	return item?.querySelector('strong')?.innerText || fallbackLabel;
}

function setPreviewLabel(label, name) {
	label.textContent = `Preview:\n${name}`;
}

function getInitialPreviewItem(listSelector) {
	return (
		document.querySelector(`${listSelector} .item.equipped`) ||
		document.querySelector(`${listSelector} .item:not(.locked):not(:disabled)`)
	);
}

function registerPreviewManager(manager) {
	if (!manager) return;
	previewManagers.push(manager);

	if (previewLoopStarted) return;
	previewLoopStarted = true;

	const clock = new THREE.Clock();
	const animate = () => {
		requestAnimationFrame(animate);
		const dt = Math.min(0.05, clock.getDelta());
		for (const previewManager of previewManagers) {
			previewManager.update(dt);
		}
	};

	animate();
}

function initializeBallPreview() {
	const stage = document.getElementById('ball-preview-stage');
	const label = document.getElementById('ball-preview-label');
	const context = createPreviewContext(
		stage,
		new THREE.Vector3(0.45, 1.1, 3.9)
	);
	if (!context || !label) return;

	const ballSkin = new BallSkin({
		widthSegments: 48,
		heightSegments: 32
	});
	const ball = ballSkin.visual;
	ball.scale.setScalar(1.85);
	context.scene.add(ball);
	context.scene.add(createPedestal(1.55, -1.12));

	let elapsed = 0;

	window.triggerBallPreview = (name, styleIndexRaw) => {
		const styleIndex = Number(styleIndexRaw);
		if (!Number.isFinite(styleIndex)) return;
		setPreviewLabel(label, name);
		ballSkin.setStyle(styleIndex);
	};

	registerPreviewManager({
		update(dt) {
			elapsed += dt;
			ball.rotation.y += dt * 0.72;
			ball.rotation.x = 0.22 + Math.sin(elapsed * 0.9) * 0.08;
			ballSkin.update(dt, 3.0);
			context.render();
		}
	});

	const initialItem = getInitialPreviewItem('#ball-skins');
	if (initialItem) {
		window.triggerBallPreview(
			readItemName(initialItem, 'Ball Skin'),
			initialItem.dataset.styleIndex
		);
	}
}

function initializePaddlePreview() {
	const stage = document.getElementById('paddle-preview-stage');
	const label = document.getElementById('paddle-preview-label');
	const context = createPreviewContext(
		stage,
		new THREE.Vector3(6.4, 1.35, 0.0)
	);
	if (!context || !label) return;

	const paddleSkin = new PaddleSkin({
		dimensions: {
			width: Constants.PADDLE_THICKNESS,
			height: Constants.PADDLE_HEIGHT,
			depth: Constants.PADDLE_DEPTH
		}
	});
	const paddleRoot = new THREE.Group();
	paddleRoot.add(paddleSkin.visual);
	paddleRoot.scale.setScalar(0.96);
	paddleRoot.rotation.set(0.0, 0.0, 0.0);
	context.scene.add(paddleRoot);
	context.scene.add(createPedestal(2.3, -1.9));
	const hiddenBallPosition = new THREE.Vector3(0, 0, -6);

	window.triggerPaddlePreview = (name, styleIndexRaw) => {
		const selection = resolveCosmeticItemSelection(styleIndexRaw);
		if (!Number.isFinite(selection.styleIndex)) return;
		setPreviewLabel(label, name);
		paddleSkin.setStyle(selection.styleIndex);

		if (selection.paintColor !== null) {
			paddleSkin.setColor(selection.paintColor);
		}
	};

	registerPreviewManager({
		update(dt) {
			paddleRoot.rotation.y += dt * 0.55;
			paddleSkin.update(dt, 2.4, hiddenBallPosition);
			context.render();
		}
	});

	const initialItem = getInitialPreviewItem('#paddle-skins');
	if (initialItem) {
		window.triggerPaddlePreview(
			readItemName(initialItem, 'Paddle Skin'),
			initialItem.dataset.styleIndex
		);
	}
}

function initializeGoalPreview() {
	const stage = document.getElementById('goal-preview-stage');
	const label = document.getElementById('goal-preview-label');
	const context = createPreviewContext(stage, new THREE.Vector3(4.5, 2.1, 4.5));
	if (!context || !label) return;

	const previewSpawner = new GoalAnimationSpawner('profileGoalPreview');
	context.scene.add(previewSpawner.visual);

	const burstPosition = new THREE.Vector3(0, 0, 0);

	window.triggerGoalPreview = (name, styleIndexRaw) => {
		const selection = resolveCosmeticItemSelection(styleIndexRaw);
		if (!Number.isFinite(selection.styleIndex)) return;
		setPreviewLabel(label, name);
		burstPosition.set(0, selection.styleIndex === 3 ? -1.9 : 0, 0);
		previewSpawner.triggerGoalAnimation(
			selection.styleIndex,
			selection.paintColor,
			burstPosition
		);
	};

	registerPreviewManager({
		update(dt) {
			previewSpawner.update(dt);
			context.render();
		}
	});

	const initialItem = getInitialPreviewItem('#goal-explosions');
	if (initialItem) {
		window.triggerGoalPreview(
			readItemName(initialItem, 'Goal Explosion'),
			initialItem.dataset.styleIndex
		);
	}
}

initializePaddlePreview();
initializeBallPreview();
initializeGoalPreview();
