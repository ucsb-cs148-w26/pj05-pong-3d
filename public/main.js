import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

let txt;

fetch('/hello').then(async (res) => {
	const loader = new FontLoader();
	const font = await loader.loadAsync('fonts/helvetiker_regular.typeface.json');
	const txtgeom = new TextGeometry(await res.text(), {
		font,
		size: 1,
		depth: 0.2,
		curveSegments: 12
	});
	const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
	txt = new THREE.Mesh(txtgeom, material);

	txt.position.x = -7;
	scene.add(txt);
});

camera.position.z = 10;

function animate() {
	const delta = clock.getDelta();
	if (txt) {
		txt.rotation.x += 0.5 * delta;
		txt.rotation.y += 0.5 * delta;
		txt.rotation.z += 0.5 * delta;
	}
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// location.host
// `ws://${location.host}/

const CLIENT_ID_KEY = 'pong3d_client_id';
let clientId = localStorage.getItem(CLIENT_ID_KEY) || '';

function buildWsUrl() {
	const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
	const url = new URL(`${scheme}://${location.host}/ws`);
	if (clientId) url.searchParams.set('clientId', clientId);
	return url.toString();
}

let ws = null;
let reconnectTimer = null;
let isOpen = false;

function send(obj) {
	if (!ws || ws.readyState !== WebSocket.OPEN) return false;
	ws.send(JSON.stringify(obj));
	return true;
}

function connectWs() {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	const wsUrl = buildWsUrl();
	console.log('[ws] connecting:', wsUrl);

	ws = new WebSocket(wsUrl);

	ws.onopen = () => {
		isOpen = true;
		console.log('[ws] connected');
		send({ type: 'ping' });
	};

	ws.onmessage = (event) => {
		let msg;
		try {
			msg = JSON.parse(event.data);
		} catch (e) {
			console.warn('[ws] invalid json:', event.data);
			return;
		}

		switch (msg.type) {
			case 'connected': {
				if (msg.clientId && msg.clientId !== clientId) {
					clientId = String(msg.clientId);
					localStorage.setItem(CLIENT_ID_KEY, clientId);
					console.log('[ws] assigned clientId:', clientId);
				}

				send({ type: 'game_join', gameId: 'demo' });
				break;
			}

			case 'pong':
				console.log('[ws] pong ts=', msg.ts);
				break;

			case 'game_join_ok':
				console.log('[ws] joined game:', msg.gameId);
				break;

			case 'game_join_error':
				console.warn('[ws] join error:', msg.message);
				break;

			case 'input_ok':
				console.log('[ws] input ok', msg.ts);
				break;

			case 'error':
				console.warn('[ws] server error:', msg.message);
				break;

			default:
				console.log('[ws] message:', msg);
		}
	};

	ws.onclose = () => {
		isOpen = false;
		console.log('[ws] closed - will retry');
		reconnectTimer = setTimeout(connectWs, 1000);
	};

	ws.onerror = (err) => {
		console.error('[ws] error:', err);
	};
}

connectWs();

window.addEventListener('keydown', (e) => {
	if (!isOpen) return;

	if (e.key === 'ArrowUp') {
		send({ type: 'input', action: 'paddle_move', dy: -1 });
	}
	if (e.key === 'ArrowDown') {
		send({ type: 'input', action: 'paddle_move', dy: 1 });
	}
	if (e.key.toLowerCase() === ' ') {
		send({ type: 'ping' });
	}
});
