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
