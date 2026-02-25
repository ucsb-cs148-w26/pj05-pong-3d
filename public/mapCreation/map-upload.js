import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls, animFrameId;

function showErrors(errors) {
    const container = document.getElementById('errors');
    container.style.display = errors.length ? 'block' : 'none';
    container.innerHTML = errors
        .map(e => `<div class="error-item">⚠ ${e}</div>`)
        .join('');
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

    // Validate vertices
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

    // Validate edges
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

function buildScene(data) {
    const container = document.getElementById('canvas-container');

    // Clean up previous scene
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (renderer) {
        renderer.dispose();
        container.innerHTML = '';
    }

    container.style.display = 'block';
    document.getElementById('scene-card').style.display = 'block';

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);

    camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 10000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Build geometry from vertices + edges
    const positions = [];
    data.edges.forEach(([a, b]) => {
        const va = data.vertices[a];
        const vb = data.vertices[b];
        positions.push(...va, ...vb);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.85
    });

    const wireframe = new THREE.LineSegments(geometry, material);
    scene.add(wireframe);

    // Fit camera to object
    const box = new THREE.Box3().setFromObject(wireframe);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.copy(center);
    camera.position.z += maxDim * 2;
    controls.target.copy(center);
    controls.update();

    // Stats
    document.getElementById('stats').textContent =
        `${data.vertices.length} vertices · ${data.edges.length} edges`;

    // Animate
    function animate() {
        animFrameId = requestAnimationFrame(animate);
        wireframe.rotation.y += 0.003;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
}

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
        if (data) buildScene(data);
    };
    reader.readAsText(file);
});