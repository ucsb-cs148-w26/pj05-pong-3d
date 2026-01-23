import * as THREE from 'three';

export class Paddle {
    // Square paddle
    constructor(color = 0xffffff) {
        const geometry = new THREE.BoxGeometry(0.5, 2, 2);
        const material = new THREE.MeshStandardMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }
}