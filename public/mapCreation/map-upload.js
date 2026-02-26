import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class MapScene {
    #renderer = null;
    #scene = null;
    #camera = null;
    #controls = null;
    #animFrameId = null;
    #wireframe = null;

    constructor(container) {
        this.container = container;

        const w = container.clientWidth;
        const h = container.clientHeight;

        this.#scene = new THREE.Scene();
        this.#scene.background = new THREE.Color(0x050810);

        this.#camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 10000);

        this.#renderer = new THREE.WebGLRenderer({ antialias: true });
        this.#renderer.setSize(w, h);
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.#renderer.domElement);

        this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        this.#controls.enableDamping = true;

        window.addEventListener('resize', () => this.#onResize());
    }

    load(data) {
        // Remove previous wireframe if any
        if (this.#wireframe) {
            this.#scene.remove(this.#wireframe);
            this.#wireframe.geometry.dispose();
            this.#wireframe.material.dispose();
            this.#wireframe = null;
        }

        // Build geometry from vertices + edges
        const positions = [];
        data.edges.forEach(([a, b]) => {
            positions.push(...data.vertices[a], ...data.vertices[b]);
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.85,
        });

        this.#wireframe = new THREE.LineSegments(geometry, material);
        this.#scene.add(this.#wireframe);

        // Fit camera to object
        const box = new THREE.Box3().setFromObject(this.#wireframe);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        this.#camera.position.copy(center);
        this.#camera.position.z += maxDim * 2;
        this.#controls.target.copy(center);
        this.#controls.update();

        return { vertexCount: data.vertices.length, edgeCount: data.edges.length };
    }

    start() {
        if (this.#animFrameId) return;
        this.#animate();
    }

    stop() {
        if (this.#animFrameId) {
            cancelAnimationFrame(this.#animFrameId);
            this.#animFrameId = null;
        }
    }

    #animate() {
        this.#animFrameId = requestAnimationFrame(() => this.#animate());
        if (this.#wireframe) this.#wireframe.rotation.y += 0.003;
        this.#controls.update();
        this.#renderer.render(this.#scene, this.#camera);
    }

    #onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.#camera.aspect = w / h;
        this.#camera.updateProjectionMatrix();
        this.#renderer.setSize(w, h);
    }
}

function validateAndParse(json) {
    const errors = [];
    let data;

    try {
        data = JSON.parse(json);
    } catch (e) {
        errors.push(`Invalid JSON: ${e.message}`);
        return { errors, data: null };
    }

    if (!data || typeof data !== 'object') {
        errors.push('Root must be a JSON object.');
        return { errors, data: null };
    }

    if (!Array.isArray(data.vertices)) {
        errors.push('"vertices" must be an array.');
    } else {
        data.vertices.forEach((v, i) => {
            if (!Array.isArray(v) || v.length !== 3) {
                errors.push(`vertices[${i}]: must be an array of 3 numbers, got ${JSON.stringify(v)}`);
            } else {
                v.forEach((val, j) => {
                    if (typeof val !== 'number' || !isFinite(val)) {
                        errors.push(`vertices[${i}][${j}]: expected a finite float, got ${val}`);
                    }
                });
            }
        });
    }

    if (!Array.isArray(data.edges)) {
        errors.push('"edges" must be an array.');
    } else {
        const vCount = Array.isArray(data.vertices) ? data.vertices.length : 0;
        data.edges.forEach((e, i) => {
            if (!Array.isArray(e) || e.length !== 2) {
                errors.push(`edges[${i}]: must be an array of 2 integers, got ${JSON.stringify(e)}`);
            } else {
                e.forEach((idx, j) => {
                    if (!Number.isInteger(idx) || idx < 0) {
                        errors.push(`edges[${i}][${j}]: expected a non-negative integer, got ${idx}`);
                    } else if (idx >= vCount) {
                        errors.push(`edges[${i}][${j}]: index ${idx} is out of bounds (only ${vCount} vertices)`);
                    }
                });
            }
        });
    }

    return { errors, data: errors.length === 0 ? data : null };
}

function showErrors(errors) {
    const container = document.getElementById('errors');
    container.style.display = errors.length ? 'block' : 'none';
    container.innerHTML = errors
        .map(e => `<div class="error-item">⚠ ${e}</div>`)
        .join('');
}

const canvasContainer = document.getElementById('canvas-container');
let mapScene = null;

document.getElementById('upload-btn').addEventListener('click', () => {
    const file = document.getElementById('file-input').files[0];
    if (!file) {
        showErrors(['Please select a JSON file first.']);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const { errors, data } = validateAndParse(e.target.result);
        showErrors(errors);
        if (data) {
            canvasContainer.style.display = 'block';
            document.getElementById('scene-card').style.display = 'block';

            // Create scene only once, after container is visible and has dimensions
            if (!mapScene) mapScene = new MapScene(canvasContainer);

            const { vertexCount, edgeCount } = mapScene.load(data);
            mapScene.start();
            document.getElementById('stats').textContent =
                `${vertexCount} vertices · ${edgeCount} edges`;
        }
    };
    reader.readAsText(file);
});