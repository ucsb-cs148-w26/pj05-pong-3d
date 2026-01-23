import * as THREE from 'three';

export class Arena {
    //Long Hallway Arena
    constructor() {
        const geometry = new THREE.BoxGeometry(23.5, 15, 15);
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            side: THREE.BackSide
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0;
        this.mesh.receiveShadow = true;
    }
}