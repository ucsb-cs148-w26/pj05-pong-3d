import * as THREE from 'three';

export class Ball {
	constructor() {
		const geometry = new THREE.SphereGeometry(0.3, 32, 16);
		const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.castShadow = true;
	}
}
