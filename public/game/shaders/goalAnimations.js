import * as THREE from 'three';
import { TWEEN, randomDirection, smoothstep } from './tweening.js';

const DEFAULT_RING_GEOMETRY = {
	type: 'ring',
	rotationAxis: 'y',
	rotationAngle: Math.PI / 2
};

const DEFAULT_CONFIG = {
	styleIndex: 0,
	label: 'Default Pulse',
	duration: 2.9,
	baseColor: 0x82d4ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;

				varying vec3 vNormal;
				varying vec3 vWorldPos;

				void main() {
					vNormal = normalize(normalMatrix * normal);
					float growthProgress = clamp(uProgress * 2.0, 0.0, 1.0);
					float pulse = smoothstep(0.0, 1.0, growthProgress);
					float ripple = sin((position.x + position.y + position.z) * 9.0 + growthProgress * 10.0);
					vec3 displaced = position + normal * (pulse * 0.24 + ripple * (1.0 - growthProgress) * 0.04);
					vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
					vWorldPos = worldPos.xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;

				varying vec3 vNormal;
				varying vec3 vWorldPos;

				void main() {
					float view = abs(dot(normalize(vNormal), normalize(vWorldPos)));
					float rim = pow(1.0 - view, 2.4);
					float core = smoothstep(1.2, 0.25, length(vWorldPos));
					float pulse = 1.0 - smoothstep(0.0, 1.0, uProgress);
					vec3 dissolveData = computeOrganicDissolveMask(vNormal, uProgress, 1.85);
					float dissolveMask = dissolveData.x;
					float dissolveEdge = dissolveData.y;
					float dissolveProgress = dissolveData.z;
					float terminalFade = 1.0 - smoothstep(0.92, 1.0, uProgress);
					float intensity = 0.55 + rim * 1.25 + core * 0.45 + pulse * 1.3;
					intensity += dissolveEdge * (1.0 - dissolveProgress) * 0.4;
					float alpha = clamp((rim * 0.6 + core * 0.25 + pulse * 0.95) * 0.68, 0.0, 0.82);
					alpha *= smoothstep(1.0, 0.72, uProgress);
					alpha *= dissolveMask;
					alpha *= terminalFade;
					gl_FragColor = vec4(uColor * intensity, alpha);
				}
			`,
			features: ['math', 'noise', 'dissolve']
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 5.4',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.14, d) * smoothstep(1.0, 0.66, uProgress)',
				CUSTOM_COLOR_LOGIC: 'uColor * 1.12'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'coreMesh',
			type: 'core',
			material: 'material',
			geometry: { type: 'icosahedron', radius: 1.05, detail: 2 }
		},
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 220
		}
	],
	particleSystems: [
		{ pointsKey: 'particlePoints', systemKey: 'particleSystem', drag: 0.98 }
	],
	configureVisibility(animation) {
		if (animation.coreMesh) animation.coreMesh.visible = true;
		if (animation.particlePoints) animation.particlePoints.visible = true;
	},
	initParticles(animation) {
		if (!animation.particleSystem) return;
		if (animation.particlePoints) animation.particlePoints.rotation.set(0, 0, 0);

		animation.particleSystem.init((i, system) => {
			const idx = i * 3;
			const dir = randomDirection();
			const speed = 7.6 + Math.random() * 10.0;

			system.positions[idx] = 0;
			system.positions[idx + 1] = 0;
			system.positions[idx + 2] = 0;

			system.velocities[idx] = dir.x * speed;
			system.velocities[idx + 1] = dir.y * speed * 1.02;
			system.velocities[idx + 2] = dir.z * speed;

			if (system.sizes) system.sizes[i] = 0.6 + Math.random() * 1.1;
		});
	},
	onUpdate(animation, dt, progress) {
		const easedBurst = TWEEN.Easing.Cubic.Out(progress);

		if (animation.coreMesh) {
			const coreScale = 1.0 + easedBurst * 1.8 + progress * 1.8;
			animation.coreMesh.scale.set(coreScale, coreScale, coreScale);
		}

		if (animation.particlePositions && animation.particleVelocities) {
			const outwardAccel = 3.2 + (1.0 - progress) * 2.0;
			for (let i = 0; i < animation.particleCount; i++) {
				const idx = i * 3;
				const x = animation.particlePositions[idx];
				const y = animation.particlePositions[idx + 1];
				const z = animation.particlePositions[idx + 2];
				const len = Math.sqrt(x * x + y * y + z * z);
				if (len < 0.0001) continue;
				const invLen = 1.0 / len;
				animation.particleVelocities[idx] += x * invLen * outwardAccel * dt;
				animation.particleVelocities[idx + 1] +=
					y * invLen * outwardAccel * dt;
				animation.particleVelocities[idx + 2] +=
					z * invLen * outwardAccel * dt;
			}
		}

		if (animation.particlePoints) animation.particlePoints.rotation.set(0, 0, 0);
	}
};


const PIXEL_BURST_CONFIG = {
	styleIndex: 1,
	label: 'Pixel Burst',
	duration: 4.0,
	baseColor: 0x5cffb5,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float burst = pow(uProgress, 1.2);
					vec3 displaced = position + normal * (burst * 2.6);
					float grid = 10.0;
					displaced = floor(displaced * grid) / grid;
					float flicker = sin(burst * 20.0 + displaced.x * 12.0 + displaced.y * 10.0) * 0.02;
					displaced += normal * flicker;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.0);
					float grid = step(0.5, fract(vWorldPos.x * 4.0)) *
						step(0.5, fract(vWorldPos.y * 4.0));
					float scan = step(0.65, fract(vWorldPos.z * 6.0 + uProgress * 6.0));
					float pix = max(grid, scan);
					float intensity = edge * 0.9 + pix * (1.0 - uProgress) * 2.2;
					float alpha = clamp(intensity, 0.0, 1.0) * 0.62;
					float fade = smoothstep(1.0, 0.75, uProgress);
					float dissolve = smoothstep(0.65, 1.0, uProgress);
					float hash = fract(sin(dot(vWorldPos, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
					float mask = step(dissolve, hash);
					gl_FragColor = vec4(uColor * intensity * 1.2, alpha * fade * mask);
				}
			`
		},
		ring: {
			template: 'STANDARD_RING_SHADER',
			injections: {
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.46, 0.44, dist) * smoothstep(0.26, 0.28, dist)',
				CUSTOM_INTENSITY_LOGIC:
					'ring * (1.1 + (1.0 - uProgress)) * (0.8 + step(0.55, fract(dist * 18.0 + uProgress * 3.0)) * 0.6)',
				CUSTOM_COLOR_LOGIC: 'uColor * intensity * 1.05',
				CUSTOM_ALPHA_LOGIC: 'intensity * 0.6'
			}
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0 * 2.2',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.2, max(abs(uv.x), abs(uv.y))) * smoothstep(1.0, 0.7, uProgress)',
				CUSTOM_COLOR_LOGIC: 'uColor * 1.4'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{ key: 'coreMesh', type: 'core', material: 'material' },
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 220
		},
		{
			key: 'sparkPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 160,
			visible: false
		},
		{ key: 'flareSprite', type: 'flare', visible: false },
		{ key: 'extraFlareA', type: 'flare', visible: false },
		{ key: 'extraFlareB', type: 'flare', visible: false }
	],
	particleSystems: [
		{ pointsKey: 'particlePoints', systemKey: 'particleSystem', drag: 0.98 },
		{ pointsKey: 'sparkPoints', systemKey: 'sparkSystem', drag: 0.965 }
	],
	setup(animation) {
		const flareA = animation.extraFlareA;
		const flareB = animation.extraFlareB;
		if (!flareA || !flareB) {
			animation.extraFlares = [];
			return;
		}

		flareA.scale.set(2.6, 2.6, 1.0);
		flareB.scale.set(4.0, 4.0, 1.0);
		flareA.visible = false;
		flareB.visible = false;
		animation.extraFlares = [flareA, flareB];
	},
	configureVisibility(animation) {
		if (animation.coreMesh) animation.coreMesh.visible = true;
	},
	initParticles(animation) {
		if (animation.particleSystem) {
			animation.particleSystem.init((i, system) => {
				const idx = i * 3;
				let dir = randomDirection();
				const axis = Math.floor(Math.random() * 3);
				dir.set(
					axis === 0 ? Math.sign(dir.x || 1) : 0,
					axis === 1 ? Math.sign(dir.y || 1) : 0,
					axis === 2 ? Math.sign(dir.z || 1) : 0
				);
				const speed = 6 + Math.random() * 10;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 1.0 + Math.random() * 1.5;
			});
		}
		if (animation.sparkSystem) {
			animation.sparkSystem.init((i, system) => {
				const idx = i * 3;
				const dir = randomDirection();
				const speed = 8 + Math.random() * 12;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.4 + Math.random() * 1.0;
			});
		}
	},
	onUpdate(animation, dt, progress) {
		const eased = TWEEN.Easing.Quintic.Out(progress);
		const scale = 1.0 + eased * 8.5;
		animation.coreMesh.scale.set(scale, scale, scale);
		animation.coreMesh.rotation.z += dt * 2.0;
		animation.coreMesh.rotation.x += dt * 1.2;
		if (animation.flareSprite) {
			animation.flareSprite.visible = true;
			const pulse = 1.0 - eased;
			animation.flareSprite.material.opacity = Math.min(1.0, pulse * 0.9);
			const flareScale = 2.2 + eased * 5.0;
			animation.flareSprite.scale.set(flareScale, flareScale, 1.0);
		}
		if (animation.extraFlares) {
			const pulse = 1.0 - eased;
			const baseScale = 1.6 + eased * 6.0;
			const rate = 0.65 + pulse * 0.6;
			for (let i = 0; i < animation.extraFlares.length; i++) {
				const flare = animation.extraFlares[i];
				flare.visible = true;
				flare.material.opacity = Math.min(1.0, pulse * (0.55 + i * 0.15));
				const scaleMod = 1.0 + i * 0.35;
				flare.scale.set(baseScale * scaleMod, baseScale * scaleMod * rate, 1.0);
			}
		}
	},
	resetCommonState(animation) {
		if (animation.flareSprite) animation.flareSprite.visible = false;
		if (animation.extraFlares) {
			for (const flare of animation.extraFlares) flare.visible = false;
		}
	}
};

const VORTEX_CONFIG = {
	styleIndex: 2,
	label: 'Vortex',
	duration: 3.5,
	autoParticles: false,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				vec3 twist(vec3 p, float k) {
					float c = cos(k);
					float s = sin(k);
					return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
				}
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float burst = pow(uProgress, 1.25);
					float r = length(position.xz) + 0.001;
					float spin = uTime * 2.4 + (1.0 - uProgress) * 4.0 + r * 2.2;
					vec3 displaced = position + normal * (burst * 2.4);
					displaced = twist(displaced, spin);
					displaced.xz += normalize(displaced.xz) * sin(uTime * 6.0 + r * 8.0) * 0.15;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.1);
					float r = length(vWorldPos.xz);
					float angle = atan(vWorldPos.z, vWorldPos.x);
					float arms = sin(angle * 12.0 + r * 16.0 - uTime * 5.0) * 0.5 + 0.5;
					float bands = smoothstep(0.25, 0.85, arms);
					float core = smoothstep(0.8, 0.0, r);
					float intensity = edge * 0.8 + bands * (1.0 - uProgress) * 1.8 + core * 1.2;
					float alpha = clamp(intensity, 0.0, 1.0) * 0.55;
					float fade = smoothstep(1.0, 0.75, uProgress);
					float dissolve = smoothstep(0.65, 1.0, uProgress);
					float hash = fract(sin(dot(vWorldPos, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
					float mask = step(dissolve, hash);
					gl_FragColor = vec4(uColor * intensity * 1.05, alpha * fade * mask);
				}
			`
		},
		ring: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec2 vUv;
				void main() {
					vUv = uv;
					vec3 displaced = position * (1.0 + uProgress * 6.0);
					float angle = uTime * 2.2;
					float c = cos(angle);
					float s = sin(angle);
					displaced.xz = mat2(c, -s, s, c) * displaced.xz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec2 vUv;
				void main() {
					float dist = distance(vUv, vec2(0.5));
					float ring = smoothstep(0.5, 0.44, dist) * smoothstep(0.28, 0.34, dist);
					float swirl = sin(dist * 30.0 + uTime * 6.0) * 0.5 + 0.5;
					float intensity = ring * (1.2 + (1.0 - uProgress)) * (0.8 + swirl * 0.6);
					float fade = smoothstep(1.0, 0.72, uProgress);
					gl_FragColor = vec4(uColor * intensity * 1.05, intensity * 0.6 * fade);
				}
			`
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.1, d) * smoothstep(1.0, 0.75, uProgress)',
				CUSTOM_COLOR_LOGIC: 'uColor * 1.1'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{ key: 'coreMesh', type: 'core', material: 'material' },
		{
			key: 'ringMesh',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY
		},
		{
			key: 'ringMesh2',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY,
			transform: { rotation: [Math.PI / 2, 0, 0] }
		},
		{
			key: 'ringMesh3',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY,
			transform: { rotation: [0, 0, Math.PI / 2] }
		},
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 360
		},
		{
			key: 'sparkPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 200,
			visible: false
		}
	],
	particleSystems: [
		{
			pointsKey: 'particlePoints',
			systemKey: 'particleSystem',
			drag: 0.98,
			autoUpdate: false
		},
		{
			pointsKey: 'sparkPoints',
			systemKey: 'sparkSystem',
			drag: 0.965,
			autoUpdate: false
		}
	],
	configureVisibility(animation) {
		animation.coreMesh.visible = true;
		animation.ringMesh.visible = true;
		animation.ringMesh2.visible = true;
		animation.ringMesh3.visible = true;
		if (animation.ringMesh?.material) animation.ringMesh.material.opacity = 1.0;
		if (animation.ringMesh2?.material)
			animation.ringMesh2.material.opacity = 1.0;
		if (animation.ringMesh3?.material)
			animation.ringMesh3.material.opacity = 1.0;
	},
	initParticles(animation) {
		animation.particleTime = 0.0;
		if (!animation.particlePoints.userData.vortexParticleData) {
			animation.particlePoints.userData.vortexParticleData = {
				radius: new Float32Array(animation.particleCount),
				angle: new Float32Array(animation.particleCount),
				speed: new Float32Array(animation.particleCount),
				height: new Float32Array(animation.particleCount),
				size: new Float32Array(animation.particleCount)
			};
		}
		const data = animation.particlePoints.userData.vortexParticleData;
		for (let i = 0; i < animation.particleCount; i++) {
			const idx = i * 3;
			const radius = 0.8 + Math.random() * 2.8;
			const angle = Math.random() * Math.PI * 2;
			const speed = 1.2 + Math.random() * 2.6;
			const height = (Math.random() - 0.5) * 2.4;
			const size = 1.6 + Math.random() * 2.2;
			data.radius[i] = radius;
			data.angle[i] = angle;
			data.speed[i] = speed;
			data.height[i] = height;
			data.size[i] = size;
			animation.particlePositions[idx] = Math.cos(angle) * radius;
			animation.particlePositions[idx + 1] = height;
			animation.particlePositions[idx + 2] = Math.sin(angle) * radius;
			animation.particleVelocities[idx] = 0;
			animation.particleVelocities[idx + 1] = 0;
			animation.particleVelocities[idx + 2] = 0;
			animation.particleSizes[i] = size;
		}
		animation.markParticleBuffersDirty();

		if (animation.sparkSystem) {
			animation.sparkSystem.init((i, system) => {
				const idx = i * 3;
				const dir = randomDirection();
				const speed = 6 + Math.random() * 10;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.4 + Math.random() * 1.0;
			});
		}
	},
	onUpdate(animation, dt, progress) {
		animation.particleTime += dt;
		if (animation.sparkSystem && animation.sparkPoints?.geometry) {
			animation.sparkSystem.update(dt);
			animation.sparkSystem.markDirty(animation.sparkPoints.geometry);
		}
		const eased = TWEEN.Easing.Quintic.Out(progress);
		const scale = 1.0 + eased * 6.0;
		animation.coreMesh.scale.set(scale, scale, scale);
		animation.ringMesh.scale.set(scale, scale, scale);
		animation.ringMesh2.scale.set(scale * 1.1, scale * 1.1, scale * 1.1);
		animation.ringMesh3.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
		animation.coreMesh.rotation.y += dt * 3.4;
		animation.ringMesh.rotation.x += dt * 1.8;
		animation.ringMesh2.rotation.z += dt * 2.2;
		if (animation.particlePoints)
			animation.particlePoints.rotation.y += dt * 3.4;

		const data = animation.particlePoints?.userData?.vortexParticleData;
		if (!data) return;
		for (let i = 0; i < animation.particleCount; i++) {
			const idx = i * 3;
			const t = eased;
			const radius = data.radius[i] * (0.6 + t * 1.9);
			const spinFalloff = 0.4;
			const spinSpeed = (2.2 + data.speed[i] * 2.0) * spinFalloff;
			const angle =
				data.angle[i] + animation.particleTime * spinSpeed + t * 10.0;
			animation.particlePositions[idx] = Math.cos(angle) * radius;
			animation.particlePositions[idx + 1] = data.height[i] * (1.0 + t * 4.2);
			animation.particlePositions[idx + 2] = Math.sin(angle) * radius;
			animation.particleSizes[i] = data.size[i] * (1.0 - progress * 0.2);
		}
		animation.particlePoints.geometry.attributes.position.needsUpdate = true;
		animation.particlePoints.geometry.attributes.aSize.needsUpdate = true;
	}
};

const BOOM_HEADSHOT_CONFIG = {
	styleIndex: 3,
	label: 'Boom Headshot',
	duration: 4.0,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vec3 displaced = position + normal * (pow(uProgress, 1.4) * 2.5);
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.0);
					float burst = smoothstep(0.8, 0.0, length(vWorldPos));
					float intensity = edge * 0.5 +
						burst * (1.0 - uProgress) * 1.2;
					gl_FragColor = vec4(uColor * intensity * 0.95, clamp(intensity, 0.0, 1.0) * 0.4);
				}
			`
		},
		ring: {
			template: 'STANDARD_RING_SHADER',
			injections: {
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.5, 0.46, dist) * smoothstep(0.26, 0.3, dist)',
				CUSTOM_INTENSITY_LOGIC: 'ring * (1.3 + (1.0 - uProgress) * 1.6)',
				CUSTOM_COLOR_LOGIC: 'uColor * intensity * 1.05',
				CUSTOM_ALPHA_LOGIC: 'intensity * 0.55'
			}
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0',
				CUSTOM_ALPHA_LOGIC: 'smoothstep(0.5, 0.1, d)',
				CUSTOM_COLOR_LOGIC: 'uColor * 0.7'
			}
		}
	},
	assets: [
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 160
		},
		{
			key: 'sparkPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 110,
			visible: false
		}
	],
	particleSystems: [
		{ pointsKey: 'particlePoints', systemKey: 'particleSystem', drag: 0.98 },
		{ pointsKey: 'sparkPoints', systemKey: 'sparkSystem', drag: 0.965 }
	],
	setup(animation) {
		const boomCanvas = document.createElement('canvas');
		boomCanvas.width = 512;
		boomCanvas.height = 256;
		const boomCtx = boomCanvas.getContext('2d');
		boomCtx.clearRect(0, 0, boomCanvas.width, boomCanvas.height);
		boomCtx.fillStyle = 'rgba(0, 0, 0, 0)';
		boomCtx.fillRect(0, 0, boomCanvas.width, boomCanvas.height);
		boomCtx.font = 'bold 128px sans-serif';
		boomCtx.textAlign = 'center';
		boomCtx.textBaseline = 'middle';
		boomCtx.fillStyle = 'rgba(255, 80, 80, 0.9)';
		boomCtx.fillText('Boom!', boomCanvas.width / 2, boomCanvas.height / 2);
		boomCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
		boomCtx.lineWidth = 6;
		boomCtx.strokeText('Boom!', boomCanvas.width / 2, boomCanvas.height / 2);

		const boomTexture = new THREE.CanvasTexture(boomCanvas);
		boomTexture.needsUpdate = true;
		const boomMaterial = new THREE.SpriteMaterial({
			map: boomTexture,
			transparent: true,
			opacity: 0.0,
			depthWrite: false,
			depthTest: false
		});
		animation.boomText = new THREE.Sprite(boomMaterial);
		animation.boomText.scale.set(5.5, 2.8, 1.0);
		animation.boomText.renderOrder = 10;
		animation.boomText.visible = false;

		const reticleCanvas = document.createElement('canvas');
		reticleCanvas.width = 256;
		reticleCanvas.height = 256;
		const reticleCtx = reticleCanvas.getContext('2d');
		reticleCtx.clearRect(0, 0, reticleCanvas.width, reticleCanvas.height);

		const center = reticleCanvas.width / 2;
		reticleCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
		reticleCtx.lineWidth = 10;
		reticleCtx.beginPath();
		reticleCtx.arc(center, center, 88, 0, Math.PI * 2);
		reticleCtx.stroke();

		reticleCtx.lineWidth = 6;
		reticleCtx.beginPath();
		reticleCtx.arc(center, center, 26, 0, Math.PI * 2);
		reticleCtx.stroke();

		const reticleTexture = new THREE.CanvasTexture(reticleCanvas);
		reticleTexture.needsUpdate = true;
		const reticleMaterial = new THREE.SpriteMaterial({
			map: reticleTexture,
			transparent: true,
			opacity: 0.0,
			depthWrite: false,
			depthTest: false
		});
		animation.flareSprite = new THREE.Sprite(reticleMaterial);
		animation.flareSprite.scale.set(4.2, 4.2, 1.0);
		animation.flareSprite.renderOrder = 10;
		animation.flareSprite.visible = false;

		animation.visual.add(animation.boomText, animation.flareSprite);
	},
	configureVisibility(animation) {
		if (animation.boomText) animation.boomText.visible = true;
		if (animation.sparkPoints) animation.sparkPoints.visible = true;
		if (animation.flareSprite) animation.flareSprite.visible = true;
	},
	initParticles(animation) {
		if (animation.particleSystem) {
			animation.particleSystem.init((i, system) => {
				const idx = i * 3;
				const axis = Math.floor(Math.random() * 3);
				const sign = Math.random() > 0.5 ? 1 : -1;
				const dir = new THREE.Vector3(
					axis === 0 ? sign : 0,
					axis === 1 ? sign : 0,
					axis === 2 ? sign : 0
				);
				const speed = 7 + Math.random() * 9;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.9 + Math.random() * 1.4;
			});
		}
		if (animation.sparkSystem) {
			animation.sparkSystem.init((i, system) => {
				const idx = i * 3;
				const axis = Math.floor(Math.random() * 3);
				const sign = Math.random() > 0.5 ? 1 : -1;
				const dir = new THREE.Vector3(
					axis === 0 ? sign : 0,
					axis === 1 ? sign : 0,
					axis === 2 ? sign : 0
				);
				const speed = 10 + Math.random() * 12;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.4 + Math.random() * 1.0;
			});
		}
	},
	onUpdate(animation, _dt, progress) {
		const eased = TWEEN.Easing.Quintic.Out(progress);
		const pulse = 1.0 - eased;
		animation.boomText.material.opacity = Math.min(1.0, Math.pow(pulse, 0.7));
		animation.boomText.position.set(0, 3.6 + pulse * 1.2, 0);
		if (animation.flareSprite) {
			animation.flareSprite.material.opacity = Math.min(1.0, pulse * 1.1);
			const flareScale = 2.4 + pulse * 3.2;
			animation.flareSprite.scale.set(flareScale, flareScale, 1.0);
		}
	},
	resetCommonState(animation) {
		if (animation.boomText) animation.boomText.visible = false;
		if (animation.flareSprite) animation.flareSprite.visible = false;
	}
};

const BLACK_HOLE_CONFIG = {
	styleIndex: 4,
	label: 'Black Hole',
	duration: 4.0,
	baseColor: 0xff6bd6,
	autoParticles: false,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;
				uniform float uRadius;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vec3 displaced = position * uRadius;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 3.0);
					vec3 edgeColor = uColor * fresnel * 0.25;
					gl_FragColor = vec4(edgeColor, 1.0);
				}
			`
		},
		ring: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform float uRotationSpeed;
				varying vec2 vUv;
				varying float vRadius;
				void main() {
					vUv = uv;
					vec3 displaced = position;
					float radius = length(displaced.xz);
					float wobble = sin(radius * 12.0 + uTime * 4.0) * 0.08;
					displaced.y += wobble;
					float angle = uTime * uRotationSpeed;
					float c = cos(angle);
					float s = sin(angle);
					displaced.xz = mat2(c, -s, s, c) * displaced.xz;
					displaced *= (1.0 + uProgress * 1.2);
					vRadius = radius;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				uniform vec3 uColorA;
				uniform vec3 uColorB;
				uniform float uNoiseDensity;
				varying vec2 vUv;
				varying float vRadius;
				void main() {
					float dist = distance(vUv, vec2(0.5));
					float innerFade = smoothstep(0.22, 0.28, dist);
					float outerFade = smoothstep(0.52, 0.45, dist);
					float ringMask = innerFade * outerFade;
					vec2 uv = (vUv - 0.5) * uNoiseDensity;
					float n1 = noise(uv + uTime * 0.2);
					float n2 = noise(uv * 2.1 - uTime * 0.35);
					float plasma = smoothstep(0.35, 0.85, n1 * 0.7 + n2 * 0.6);
					vec3 heat = mix(uColorA, uColorB, plasma);
					vec3 hot = mix(heat, vec3(1.0), plasma * 0.6);
					float feed = 0.8 + uProgress * 0.8;
					float intensity = ringMask * (0.6 + plasma * 1.2) * feed;
					gl_FragColor = vec4(hot * intensity, intensity * 0.75);
				}
			`,
			features: ['math', 'noise']
		},
		particles: {
			vertexShader: `
				uniform float uProgress;
				attribute float aSize;
				varying float vDist;
				varying float vFade;
				void main() {
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					vDist = length(position);
					vFade = 1.0 - smoothstep(0.88, 1.0, uProgress);
					float shrink = smoothstep(0.0, 1.2, vDist);
					gl_PointSize = aSize * (1.2 + shrink * 4.8) * (1.0 - uProgress * 0.2) * vFade;
					gl_Position = projectionMatrix * mvPosition;
				}
			`,
			fragmentShader: `
				uniform vec3 uColor;
				varying float vDist;
				varying float vFade;
				void main() {
					vec2 uv = gl_PointCoord - vec2(0.5);
					float d = length(uv);
					float glow = exp(-d * d * 6.0);
					float core = smoothstep(0.5, 0.0, d);
					float heat = smoothstep(0.0, 1.0, vDist);
					vec3 color = mix(vec3(1.0), uColor, heat);
					gl_FragColor = vec4(color, glow * core * vFade);
				}
			`
		}
	},
	uniforms: {
		core: {
			uRadius: { value: 0.85 }
		},
		ring: {
			uRotationSpeed: { value: 0.05 },
			uColorA: { value: new THREE.Color(0x2b0a5b) },
			uColorB: { value: new THREE.Color(0xff6a00) },
			uNoiseDensity: { value: 3.5 }
		}
	},
	assets: [
		{
			key: 'ringMesh',
			type: 'ring',
			material: 'ringMaterial',
			geometry: { type: 'ring', rotationAxis: 'x', rotationAngle: Math.PI / 2 }
		},
		{
			key: 'ringMesh2',
			type: 'ring',
			material: 'ringMaterial',
			geometry: { type: 'ring', rotationAxis: 'x', rotationAngle: Math.PI / 2 },
			transform: { rotation: [Math.PI / 2, 0, 0] }
		},
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 160
		},
		{
			key: 'sparkPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 110,
			visible: false
		},
		{ key: 'flareSprite', type: 'flare', visible: false }
	],
	particleSystems: [
		{
			pointsKey: 'sparkPoints',
			systemKey: 'sparkSystem',
			drag: 0.965,
			autoUpdate: false
		}
	],
	setup(animation, materials) {
		materials.material.blending = THREE.NormalBlending;
		materials.material.depthWrite = true;
		materials.material.needsUpdate = true;

		const blackHoleGeometry = new THREE.SphereGeometry(1.0, 64, 64);
		animation.blackHoleMesh = new THREE.Mesh(
			blackHoleGeometry,
			materials.material
		);
		animation.blackHoleMesh.rotateY(Math.PI / 2);

		const lensGeometry = new THREE.RingGeometry(0.9, 1.35, 80, 1);
		animation.lensMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0.0 },
				uProgress: { value: 0.0 },
				uStrength: { value: 0.4 },
				uInnerRadius: { value: 0.18 },
				uCenter: { value: new THREE.Vector2(0.5, 0.5) }
			},
			vertexShader: `
				uniform float uTime;
				uniform float uStrength;
				varying vec2 vUv;
				void main() {
					vUv = uv;
					float wobble = sin(uTime * 6.0 + uv.x * 12.0) * 0.03;
					vec3 displaced = position + normal * wobble * uStrength;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform float uStrength;
				uniform float uInnerRadius;
				uniform vec2 uCenter;
				varying vec2 vUv;
				void main() {
					vec2 delta = vUv - uCenter;
					float dist = length(delta);
					float bend = uStrength / max(dist, 0.05);
					float ring = smoothstep(uInnerRadius + 0.12, uInnerRadius, dist) *
						smoothstep(0.55, 0.45, dist);
					float shimmer = sin((dist + uProgress) * 40.0 - uStrength * 6.0) * 0.5 + 0.5;
					float glow = ring * (0.6 + shimmer * 0.6) * (0.8 + bend * 0.3);
					vec3 color = vec3(0.45, 0.7, 1.0) * glow;
					gl_FragColor = vec4(color, glow);
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});
		animation.lensMesh = new THREE.Mesh(lensGeometry, animation.lensMaterial);
		animation.lensMesh.rotateY(Math.PI / 2);

		const gammaBurstGeometry = new THREE.CylinderGeometry(
			0.12,
			0.35,
			4.8,
			24,
			1,
			true
		);
		animation.gammaBurstMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0.0 },
				uProgress: { value: 0.0 },
				uIntensity: { value: 0.0 },
				uColor: { value: new THREE.Color(0xffffff) }
			},
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec2 vUv;
				varying float vHeight;
				void main() {
					vUv = uv;
					vHeight = position.y;
					float pulse = sin(uTime * 10.0 + position.y * 2.0) * 0.03;
					vec3 displaced = position + normal * pulse * (0.2 + uProgress);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform float uIntensity;
				uniform vec3 uColor;
				varying vec2 vUv;
				varying float vHeight;
				void main() {
					float radial = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
					float vertical = smoothstep(2.4, 0.0, abs(vHeight));
					float core = smoothstep(0.35, 0.0, abs(vUv.x - 0.5));
					float flicker = sin((vUv.y + uProgress) * 40.0) * 0.5 + 0.5;
					float glow = (radial * 0.7 + core * 1.2) * vertical;
					float alpha = glow * (0.4 + flicker * 0.6) * uIntensity;
					vec3 color = mix(uColor, vec3(1.0), core * 0.7);
					gl_FragColor = vec4(color * alpha, alpha);
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide
		});
		animation.gammaBurstMesh = new THREE.Mesh(
			gammaBurstGeometry,
			animation.gammaBurstMaterial
		);
		animation.gammaBurstMesh.rotation.z = Math.PI / 2;
		animation.gammaBurstMesh.visible = false;

		animation.visual.add(
			animation.blackHoleMesh,
			animation.lensMesh,
			animation.gammaBurstMesh
		);
	},
	configureVisibility(animation) {
		if (animation.visual?.scale) animation.visual.scale.setScalar(4.0);
		animation.ringMesh.visible = true;
		animation.ringMesh2.visible = true;
		animation.blackHoleMesh.visible = true;
		animation.blackHoleMesh.scale.set(1, 1, 1);
		animation.lensMesh.visible = true;
		if (animation.gammaBurstMesh) animation.gammaBurstMesh.visible = false;
		if (animation.flareSprite) animation.flareSprite.visible = true;
		if (animation.blackHoleMesh) animation.blackHoleMesh.scale.setScalar(0);
		if (animation.ringMesh) animation.ringMesh.scale.setScalar(0);
		if (animation.ringMesh2) animation.ringMesh2.scale.setScalar(0);
		if (animation.lensMesh) animation.lensMesh.scale.setScalar(0);
		if (animation.flareSprite) animation.flareSprite.scale.set(0, 0, 1.0);
		if (animation.ringMesh?.material) {
			animation.ringMesh.material.side = THREE.DoubleSide;
			animation.ringMesh.material.needsUpdate = true;
		}
		if (animation.ringMesh2?.material) {
			animation.ringMesh2.material.side = THREE.DoubleSide;
			animation.ringMesh2.material.needsUpdate = true;
		}
		if (animation.gammaBurstMaterial?.uniforms?.uColor?.value?.copy) {
			animation.gammaBurstMaterial.uniforms.uColor.value.copy(animation.color);
		}
		if (animation.sparkPoints) animation.sparkPoints.visible = false;
		if (animation.particlePoints) {
			animation.particlePoints.visible = true;
			animation.particlePoints.scale.setScalar(0);
		}
	},
	initParticles(animation) {
		if (!animation.particlePoints.userData.blackHoleParticleData) {
			animation.particlePoints.userData.blackHoleParticleData = {
				radius: new Float32Array(animation.particleCount),
				angle: new Float32Array(animation.particleCount),
				speed: new Float32Array(animation.particleCount),
				offset: new Float32Array(animation.particleCount),
				height: new Float32Array(animation.particleCount),
				size: new Float32Array(animation.particleCount)
			};
		}
		const data = animation.particlePoints.userData.blackHoleParticleData;
		for (let i = 0; i < animation.particleCount; i++) {
			const idx = i * 3;
			const theta = Math.random() * Math.PI * 2;
			const radius = 0.9 + Math.random() * 1.6;
			const height = (Math.random() - 0.5) * 0.8;
			data.radius[i] = radius;
			data.angle[i] = theta;
			data.speed[i] = 0.6 + Math.random() * 1.4;
			data.offset[i] = Math.random();
			data.height[i] = height;
			const size = 0.7 + Math.random() * 1.1;
			data.size[i] = size;
			animation.particlePositions[idx] = Math.cos(theta) * radius;
			animation.particlePositions[idx + 1] = height * 0.4;
			animation.particlePositions[idx + 2] = Math.sin(theta) * radius;
			animation.particleVelocities[idx] = 0;
			animation.particleVelocities[idx + 1] = 0;
			animation.particleVelocities[idx + 2] = 0;
			animation.particleSizes[i] = size;
		}
		if (animation.sparkSystem) {
			animation.sparkSystem.init((i, system) => {
				const idx = i * 3;
				const dir = randomDirection();
				const speed = 6 + Math.random() * 10;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.4 + Math.random() * 1.0;
			});
		}
	},
	onUpdate(animation, dt, progress) {
		if (animation.sparkSystem && animation.sparkPoints?.geometry) {
			animation.sparkSystem.update(dt);
			animation.sparkSystem.markDirty(animation.sparkPoints.geometry);
		}

		const time =
			animation.uniforms?.uTime?.value ??
			animation.blackHoleMesh?.material?.uniforms?.uTime?.value ??
			0.0;
		const feed = Math.min(1.0, progress * 1.1);
		const ringUniforms =
			animation.ringMesh?.material?.uniforms ??
			animation.ringMesh2?.material?.uniforms ??
			null;
		if (ringUniforms?.uRotationSpeed) {
			ringUniforms.uRotationSpeed.value = 0.5 + feed * 1.1;
		}
		animation.lensMaterial.uniforms.uTime.value += dt;
		animation.lensMaterial.uniforms.uProgress.value = progress;
		animation.lensMaterial.uniforms.uStrength.value =
			0.35 + feed * 0.55 + Math.sin(time * 6.0) * 0.08;
		animation.lensMaterial.uniforms.uInnerRadius.value = 0.18;
		if (animation.blackHoleMesh?.material?.uniforms?.uRadius) {
			animation.blackHoleMesh.material.uniforms.uRadius.value = 0.85;
		}

		const burstT = Math.min(1, Math.max(0, (progress - 0.78) / 0.22));
		const burst = Math.sin(burstT * Math.PI);
		const collapse = smoothstep(0.6, 1.0, progress);
		const collapseScale = Math.max(0.0, 1.0 - collapse);
		const growIn = smoothstep(0.0, 0.1, progress);
		const visibleScale = collapseScale * growIn;
		const vanish = progress >= 0.9 && burstT > 0.6;
		const osc = 0.08 * Math.sin(time * 3.2) + 0.04 * Math.sin(time * 7.1);
		animation.blackHoleMesh.scale.setScalar(
			(1.0 + burst * 0.3 + osc) * visibleScale
		);
		animation.blackHoleMesh.rotation.x += dt * 0.6;
		if (animation.ringMesh) animation.ringMesh.scale.setScalar(visibleScale);
		if (animation.ringMesh2)
			animation.ringMesh2.scale.setScalar(visibleScale * 1.05);
		if (animation.lensMesh) animation.lensMesh.scale.setScalar(visibleScale);
		if (animation.particlePoints)
			animation.particlePoints.scale.setScalar(visibleScale);

		animation.gammaBurstMesh.visible = false;
		if (animation.gammaBurstMesh) {
			animation.gammaBurstMesh.visible = burst > 0.01;
			animation.gammaBurstMaterial.uniforms.uProgress.value = burst;
			animation.gammaBurstMaterial.uniforms.uTime.value = time;
			animation.gammaBurstMaterial.uniforms.uIntensity.value = 0.9;
		}

		if (animation.flareSprite) {
			animation.flareSprite.material.opacity = Math.min(
				1.0,
				0.25 + burst * 0.9
			);
			const flareScale = 2.0 + burst * 3.0;
			animation.flareSprite.position.set(0, 0, 0);
			animation.flareSprite.scale.set(
				flareScale * 0.6 * visibleScale,
				flareScale * 2.4 * visibleScale,
				1.0
			);
		}

		if (vanish) {
			animation.blackHoleMesh.visible = false;
			animation.ringMesh.visible = false;
			animation.ringMesh2.visible = false;
			animation.lensMesh.visible = false;
			if (animation.gammaBurstMesh) animation.gammaBurstMesh.visible = false;
			if (animation.flareSprite) animation.flareSprite.visible = false;
			if (animation.particlePoints) animation.particlePoints.visible = false;
		}

		const data = animation.particlePoints?.userData?.blackHoleParticleData;
		if (!data) return;
		for (let i = 0; i < animation.particleCount; i++) {
			const idx = i * 3;
			const localProgress = Math.min(
				1.0,
				Math.max(0.0, progress * 1.2 - data.offset[i] * 0.7)
			);
			const eased = 1.0 - Math.pow(1.0 - localProgress, 2.6);
			const theta = -(
				data.angle[i] +
				time * (0.8 + data.speed[i] * 1.4) +
				eased * 7.5
			);
			const timePull = 0.18 + time * 0.08;
			const spiralRadius =
				data.radius[i] * Math.exp(-eased * (0.9 + timePull) * 0.22);
			const attraction = 0.35 / (spiralRadius * spiralRadius + 0.25);
			const pulledRadius = Math.max(
				0.03,
				spiralRadius - attraction * (0.35 + eased)
			);
			const collapse = smoothstep(0.72, 1.0, localProgress);
			const finalRadius = Math.max(0.0, pulledRadius * (1.0 - collapse));
			const x = Math.cos(theta) * finalRadius;
			const y = data.height[i] * (1.0 - eased) * 0.5;
			const z = Math.sin(theta) * finalRadius;
			animation.particlePositions[idx] = x;
			animation.particlePositions[idx + 1] = y;
			animation.particlePositions[idx + 2] = z;
			animation.particleVelocities[idx] = 0;
			animation.particleVelocities[idx + 1] = 0;
			animation.particleVelocities[idx + 2] = 0;
			const dist = Math.sqrt(x * x + y * y + z * z);
			const sizeFade = Math.min(1.0, Math.max(0.0, (dist - 0.05) / 0.5));
			const popFade = 1.0 - smoothstep(0.9, 1.0, localProgress);
			animation.particleSizes[i] = data.size[i] * sizeFade * popFade;
		}
		animation.particlePoints.geometry.attributes.aSize.needsUpdate = true;
		animation.particlePoints.geometry.attributes.position.needsUpdate = true;
	},
	resetCommonState(animation) {
		if (animation.uniforms?.uTime) animation.uniforms.uTime.value = 0.0;
		if (animation.ringUniforms?.uTime) animation.ringUniforms.uTime.value = 0.0;
		if (animation.particleUniforms?.uTime)
			animation.particleUniforms.uTime.value = 0.0;
		if (animation.lensMaterial?.uniforms?.uTime)
			animation.lensMaterial.uniforms.uTime.value = 0.0;
		if (animation.gammaBurstMaterial?.uniforms?.uTime)
			animation.gammaBurstMaterial.uniforms.uTime.value = 0.0;
		if (animation.blackHoleMesh?.rotation)
			animation.blackHoleMesh.rotation.set(0, 0, 0);
		if (animation.lensMesh?.rotation) animation.lensMesh.rotation.set(0, 0, 0);
		if (animation.gammaBurstMesh?.rotation)
			animation.gammaBurstMesh.rotation.set(0, 0, 0);
		if (animation.visual?.scale) animation.visual.scale.setScalar(4.0);
		if (animation.blackHoleMesh) animation.blackHoleMesh.scale.setScalar(0);
		if (animation.ringMesh) animation.ringMesh.scale.setScalar(0);
		if (animation.ringMesh2) animation.ringMesh2.scale.setScalar(0);
		if (animation.lensMesh) animation.lensMesh.scale.setScalar(0);
		if (animation.particlePoints) animation.particlePoints.scale.setScalar(0);
		if (animation.flareSprite) animation.flareSprite.scale.set(0, 0, 1.0);
		if (animation.gammaBurstMaterial?.uniforms) {
			animation.gammaBurstMaterial.uniforms.uProgress.value = 0.0;
			animation.gammaBurstMaterial.uniforms.uIntensity.value = 0.0;
		}
		if (animation.blackHoleMesh) animation.blackHoleMesh.visible = false;
		if (animation.lensMesh) animation.lensMesh.visible = false;
		if (animation.gammaBurstMesh) animation.gammaBurstMesh.visible = false;
		if (animation.flareSprite) animation.flareSprite.visible = false;
	}
};

const MONSOON_CONFIG = {
	styleIndex: 5,
	label: 'Monsoon',
	duration: 4.0,
	baseColor: 0x4fa3ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vec3 displaced = position + normal * (pow(uProgress, 1.4) * 2.5);
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.0);
					float splash = sin((vWorldPos.x + vWorldPos.z) * 8.0 + uProgress * 6.0) * 0.5 + 0.5;
					float droplets = step(0.8, fract(vWorldPos.y * 8.0 + vWorldPos.x * 3.0));
					float intensity = edge * 0.6 +
						splash * (1.0 - uProgress) * 1.4 +
						droplets * (1.0 - uProgress) * 0.8;
					gl_FragColor = vec4(uColor * intensity * 0.95, clamp(intensity, 0.0, 1.0) * 0.55);
				}
			`
		},
		ring: {
			template: 'STANDARD_RING_SHADER',
			injections: {
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.5, 0.45, dist) * smoothstep(0.28, 0.32, dist)',
				CUSTOM_INTENSITY_LOGIC: 'ring * (0.8 + (1.0 - uProgress) * 1.2)',
				CUSTOM_COLOR_LOGIC: 'uColor * intensity',
				CUSTOM_ALPHA_LOGIC: 'intensity * 0.45'
			}
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0',
				CUSTOM_ALPHA_LOGIC: 'smoothstep(0.5, 0.1, d)',
				CUSTOM_COLOR_LOGIC:
					'mix(uColor * 0.55, mix(uColor, vec3(1.0), 0.35), 1.0 - d)'
			}
		}
	},
	assets: [],
	setup(animation, materials) {
		const cloudCanvas = document.createElement('canvas');
		cloudCanvas.width = 512;
		cloudCanvas.height = 256;
		const cloudCtx = cloudCanvas.getContext('2d');
		cloudCtx.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);

		const drawPuff = (x, y, r, alpha) => {
			const gradient = cloudCtx.createRadialGradient(x, y, 0, x, y, r);
			gradient.addColorStop(0, `rgba(185, 210, 255, ${alpha})`);
			gradient.addColorStop(0.6, `rgba(140, 175, 235, ${alpha * 0.8})`);
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
			cloudCtx.fillStyle = gradient;
			cloudCtx.beginPath();
			cloudCtx.arc(x, y, r, 0, Math.PI * 2);
			cloudCtx.fill();
		};

		drawPuff(160, 150, 120, 0.55);
		drawPuff(260, 120, 140, 0.6);
		drawPuff(350, 150, 120, 0.5);
		drawPuff(220, 170, 130, 0.55);
		drawPuff(120, 170, 90, 0.45);
		drawPuff(420, 170, 90, 0.45);
		drawPuff(80, 130, 80, 0.4);
		drawPuff(200, 110, 95, 0.45);
		drawPuff(300, 185, 110, 0.5);
		drawPuff(430, 130, 85, 0.4);
		drawPuff(380, 95, 70, 0.35);

		const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
		cloudTexture.needsUpdate = true;
		const cloudOffsets = [
			new THREE.Vector3(0.0, 2.6, 0.0),
			new THREE.Vector3(-2.1, 1.6, 0.0),
			new THREE.Vector3(2.1, 1.6, 0.0),
			new THREE.Vector3(0.0, 1.4, -1.8),
			new THREE.Vector3(0.0, 1.4, 1.8)
		];
		const cloudScales = [
			new THREE.Vector3(4.6, 2.2, 1.0),
			new THREE.Vector3(4.0, 2.0, 1.0),
			new THREE.Vector3(4.0, 2.0, 1.0),
			new THREE.Vector3(3.6, 1.8, 1.0),
			new THREE.Vector3(3.6, 1.8, 1.0)
		];
		animation.cloudMeshes = cloudOffsets.map((offset, index) => {
			const cloudMaterial = new THREE.SpriteMaterial({
				map: cloudTexture,
				transparent: true,
				opacity: 0.0,
				depthWrite: false
			});
			const cloudMesh = new THREE.Sprite(cloudMaterial);
			cloudMesh.position.copy(offset);
			cloudMesh.scale.copy(cloudScales[index] ?? cloudScales[0]);
			return cloudMesh;
		});
		animation.cloudMaterials = animation.cloudMeshes.map(
			(mesh) => mesh.material
		);
		animation.cloudOffsets = cloudOffsets;

		animation.rainCount = 220;
		animation.rainPositions = new Float32Array(animation.rainCount * 3);
		animation.rainVelocities = new Float32Array(animation.rainCount * 3);
		animation.rainSizes = new Float32Array(animation.rainCount);
		animation.rainGeometry = new THREE.BufferGeometry();
		animation.rainGeometry.setAttribute(
			'position',
			new THREE.BufferAttribute(animation.rainPositions, 3)
		);
		animation.rainGeometry.setAttribute(
			'aSize',
			new THREE.BufferAttribute(animation.rainSizes, 1)
		);
		animation.rainPoints = new THREE.Points(
			animation.rainGeometry,
			materials.particleMaterial
		);

		animation.visual.add(...animation.cloudMeshes, animation.rainPoints);
	},
	configureVisibility(animation) {
		if (animation.cloudMeshes) {
			for (const mesh of animation.cloudMeshes) mesh.visible = true;
		}
		if (animation.rainPoints) animation.rainPoints.visible = true;
	},
	afterTrigger(animation) {
		for (let i = 0; i < animation.rainCount; i++) {
			const idx = i * 3;
			animation.rainPositions[idx] = (Math.random() - 0.5) * 6.0;
			animation.rainPositions[idx + 1] = 1.1 + Math.random() * 0.9;
			animation.rainPositions[idx + 2] = (Math.random() - 0.5) * 6.0;
			animation.rainVelocities[idx] = (Math.random() - 0.5) * 0.4;
			animation.rainVelocities[idx + 1] = -4.0 - Math.random() * 6.5;
			animation.rainVelocities[idx + 2] = (Math.random() - 0.5) * 0.4;
			animation.rainSizes[i] = 0.8 + Math.random() * 0.6;
		}
		if (animation.rainGeometry?.attributes?.position) {
			animation.rainGeometry.attributes.position.needsUpdate = true;
		}
		if (animation.rainGeometry?.attributes?.aSize) {
			animation.rainGeometry.attributes.aSize.needsUpdate = true;
		}
	},
	onUpdate(animation, dt, progress) {
		animation.cloudTime = (animation.cloudTime ?? 0) + dt;
		if (
			animation.cloudMeshes &&
			animation.cloudMaterials &&
			animation.cloudOffsets
		) {
			for (let i = 0; i < animation.cloudMeshes.length; i++) {
				const material = animation.cloudMaterials[i];
				const mesh = animation.cloudMeshes[i];
				const base = animation.cloudOffsets[i];
				const baseY = base ? base.y : 0.0;
				const fadeT = Math.max(0.0, Math.min(1.0, (1.0 - progress) / 0.3));
				const easedFade = TWEEN.Easing.Quadratic.Out(fadeT);
				const targetOpacity = 0.7 * easedFade;
				material.opacity = Math.min(targetOpacity, material.opacity + dt * 1.5);
				mesh.position.y =
					baseY + Math.sin(animation.cloudTime * 1.2 + i) * 0.24;
				mesh.position.z =
					base.z + Math.sin(animation.cloudTime * 1.2 + i * 0.7) * 0.12;
			}
		}
		for (let i = 0; i < animation.rainCount; i++) {
			const idx = i * 3;
			animation.rainVelocities[idx + 1] -= 9.8 * dt * 0.35;
			animation.rainPositions[idx] += animation.rainVelocities[idx] * dt;
			animation.rainPositions[idx + 1] +=
				animation.rainVelocities[idx + 1] * dt;
			animation.rainPositions[idx + 2] +=
				animation.rainVelocities[idx + 2] * dt;
			if (animation.rainPositions[idx + 1] < -2.0) {
				animation.rainPositions[idx] = (Math.random() - 0.5) * 6.0;
				animation.rainPositions[idx + 1] = 1.1 + Math.random() * 0.9;
				animation.rainPositions[idx + 2] = (Math.random() - 0.5) * 6.0;
				animation.rainVelocities[idx] = (Math.random() - 0.5) * 0.4;
				animation.rainVelocities[idx + 1] = -4.0 - Math.random() * 6.5;
				animation.rainVelocities[idx + 2] = (Math.random() - 0.5) * 0.4;
			}
		}
		animation.rainGeometry.attributes.position.needsUpdate = true;
	},
	resetCommonState(animation) {
		animation.cloudTime = 0;
		if (animation.cloudMaterials) {
			for (const material of animation.cloudMaterials) material.opacity = 0.0;
		}
		if (animation.cloudMeshes) {
			for (const mesh of animation.cloudMeshes) mesh.visible = false;
		}
		if (animation.rainPoints) animation.rainPoints.visible = false;
	},
	markParticleBuffersDirty(animation) {
		if (animation.rainGeometry?.attributes?.position) {
			animation.rainGeometry.attributes.position.needsUpdate = true;
		}
		if (animation.rainGeometry?.attributes?.aSize) {
			animation.rainGeometry.attributes.aSize.needsUpdate = true;
		}
	}
};

const ORBITAL_STRIKE_CONFIG = {
	styleIndex: 6,
	label: 'Orbital Strike',
	duration: 3.2,
	baseColor: 0x86d6ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec2 vUv;
				varying vec3 vWorldPos;
				void main() {
					vUv = uv;
					vec3 displaced = position;
					float taper = smoothstep(1.0, -0.2, uv.y);
					displaced.xz *= mix(0.7, 1.2, taper);
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec2 vUv;
				varying vec3 vWorldPos;
				void main() {
					float radial = smoothstep(0.5, 0.1, abs(vUv.x - 0.5));
					float flow = sin(vUv.y * 44.0 - uTime * 24.0) * 0.5 + 0.5;
					float turbulence = noise(vec3(vUv * vec2(5.0, 24.0), uTime * 2.0));
					float strikeIn = smoothstep(0.0, 0.08, uProgress);
					float strikeOut = 1.0 - smoothstep(0.2, 0.55, uProgress);
					float beamMask = strikeIn * strikeOut;
					float intensity = radial * (1.2 + flow * 0.8 + turbulence * 0.7) * beamMask;
					float alpha = clamp(intensity, 0.0, 1.0) * 0.95;
					vec3 color = mix(uColor, vec3(1.0), 0.35) * intensity;
					gl_FragColor = vec4(color, alpha);
				}
			`,
			features: ['math', 'noise']
		},
		ring: {
			template: 'STANDARD_RING_SHADER',
			injections: {
				RING_EXPANSION_MULTIPLIER: '10.5',
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.52, 0.44, dist) * smoothstep(0.18, 0.24, dist)',
				CUSTOM_INTENSITY_LOGIC:
					'ring * (1.6 + (1.0 - uProgress) * 2.8) * (0.75 + sin(dist * 34.0 - uTime * 7.0) * 0.25)',
				CUSTOM_COLOR_LOGIC: 'mix(uColor, vec3(1.0), 0.35) * intensity',
				CUSTOM_ALPHA_LOGIC: 'clamp(intensity, 0.0, 1.0) * 0.72'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'beamMesh',
			type: 'core',
			material: 'material',
			geometry: {
				type: 'cylinder',
				radiusTop: 0.1,
				radiusBottom: 0.18,
				height: 12.0,
				radialSegments: 20,
				openEnded: true
			},
			transform: {
				position: [0, 4.0, 0],
				scale: [0.001, 1.0, 0.001]
			}
		},
		{
			key: 'impactRing',
			type: 'ring',
			material: 'ringMaterial',
			geometry: {
				type: 'ring',
				inner: 0.22,
				outer: 0.64,
				segments: 72,
				rotationAxis: 'x',
				rotationAngle: Math.PI / 2
			},
			transform: {
				position: [0, -1.95, 0],
				scale: [0.2, 0.2, 0.2]
			}
		},
		{
			key: 'scorchMark',
			type: 'custom',
			build({ THREE }) {
				const material = new THREE.MeshBasicMaterial({
					color: 0x140f10,
					transparent: true,
					opacity: 0.0,
					side: THREE.DoubleSide,
					depthWrite: false
				});
				const mesh = new THREE.Mesh(
					new THREE.PlaneGeometry(3.8, 3.8, 1, 1),
					material
				);
				mesh.userData.scorchMaterial = material;
				return mesh;
			},
			transform: {
				position: [0, -1.94, 0],
				rotation: [-Math.PI / 2, 0, 0]
			},
			visible: false
		}
	],
	configureVisibility(animation) {
		if (animation.beamMesh) {
			animation.beamMesh.visible = true;
			animation.beamMesh.scale.set(0.001, 1.0, 0.001);
			if (animation.beamMesh.material)
				animation.beamMesh.material.opacity = 0.0;
		}
		if (animation.impactRing) {
			animation.impactRing.visible = true;
			animation.impactRing.scale.set(0.2, 0.2, 0.2);
			if (animation.impactRing.material)
				animation.impactRing.material.opacity = 1.0;
		}
		if (animation.scorchMark) {
			const material =
				animation.scorchMark.userData.scorchMaterial ??
				animation.scorchMark.material;
			animation.scorchMark.visible = false;
			animation.scorchMark.scale.set(1, 1, 1);
			if (material) material.opacity = 0.0;
		}
	},
	onUpdate(animation, _dt, progress) {
		const globalAlpha = 1.0 - smoothstep(0.8, 1.0, progress);
		if (animation.beamMesh) {
			const strikeIn = smoothstep(0.0, 0.08, progress);
			const strikeOut = 1.0 - smoothstep(0.2, 0.55, progress);
			const width = Math.max(0.001, (0.1 + strikeIn * 0.95) * strikeOut);
			animation.beamMesh.scale.set(width, 1.0 + progress * 0.08, width);
			if (animation.beamMesh.material) {
				animation.beamMesh.material.opacity =
					Math.min(1.0, width * 2.4) * globalAlpha;
			}
			animation.beamMesh.visible = width > 0.004;
		}

		if (animation.impactRing) {
			const shock = Math.pow(progress, 0.62);
			const ringScale = 0.2 + shock * 11.5;
			animation.impactRing.scale.set(ringScale, ringScale, ringScale);
			if (animation.impactRing.material) {
				animation.impactRing.material.opacity = globalAlpha;
			}
		}

		if (animation.scorchMark) {
			const material =
				animation.scorchMark.userData.scorchMaterial ??
				animation.scorchMark.material;
			const scorchIn = smoothstep(0.08, 0.2, progress);
			const scorchOut = 1.0 - smoothstep(0.78, 1.0, progress);
			const opacity = scorchIn * scorchOut * 0.55 * globalAlpha;
			const markScale = 1.0 + scorchIn * 2.1;
			animation.scorchMark.visible = opacity > 0.01;
			animation.scorchMark.scale.set(markScale, markScale, markScale);
			if (material) material.opacity = opacity;
		}
	},
	resetCommonState(animation) {
		if (animation.beamMesh) {
			animation.beamMesh.visible = false;
			animation.beamMesh.scale.set(0.001, 1.0, 0.001);
			if (animation.beamMesh.material)
				animation.beamMesh.material.opacity = 0.0;
		}
		if (animation.impactRing?.material) {
			animation.impactRing.material.opacity = 1.0;
		}
		if (animation.scorchMark) {
			const material =
				animation.scorchMark.userData.scorchMaterial ??
				animation.scorchMark.material;
			animation.scorchMark.visible = false;
			animation.scorchMark.scale.set(1, 1, 1);
			if (material) material.opacity = 0.0;
		}
	}
};

const SHATTERED_REALITY_CONFIG = {
	styleIndex: 7,
	label: 'Shattered Reality',
	duration: 3.8,
	baseColor: 0xa8a9ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vCrack;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float burst = pow(uProgress, 1.25);
					float cell = voronoi(position * 4.6 + vec3(uTime * 0.5));
					float crack = smoothstep(0.04, 0.12, cell);
					float fracture = (1.0 - crack) * burst * 2.0;
					vec3 displaced = position + normal * (burst * 2.2 + fracture);
					displaced += normalize(position + vec3(0.001)) * burst * 1.4;
					vCrack = cell;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vCrack;
				void main() {
					float crackMask = smoothstep(0.03, 0.06, vCrack);
					float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.1);
					float shell = smoothstep(2.8, 0.0, length(vWorldPos));
					float flicker = sin((vWorldPos.x + vWorldPos.y + vWorldPos.z) * 22.0 + uProgress * 24.0) * 0.5 + 0.5;
					float intensity = (edge * 1.1 + shell * 0.7 + flicker * 0.35) * crackMask;
					vec3 color = mix(uColor * 0.75, vec3(1.0), edge * 0.35);
					float fade = 1.0 - smoothstep(0.74, 1.0, uProgress);
					float alpha = clamp(intensity, 0.0, 1.0) * 0.72 * fade;
					gl_FragColor = vec4(color * intensity, alpha);
				}
			`,
			features: ['math', 'noise']
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress * 0.65) * 8.5',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.12, d) * smoothstep(1.0, 0.72, uProgress)',
				CUSTOM_COLOR_LOGIC: 'mix(uColor, vec3(1.0), 0.25)'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'shardSphere',
			type: 'core',
			material: 'material',
			geometry: { type: 'icosahedron', radius: 1.0, detail: 5 }
		},
		{
			key: 'debrisPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 320
		}
	],
	particleSystems: [
		{ pointsKey: 'debrisPoints', systemKey: 'debrisSystem', drag: 0.992 }
	],
	configureVisibility(animation) {
		if (animation.shardSphere) animation.shardSphere.visible = true;
		if (animation.debrisPoints) animation.debrisPoints.visible = true;
	},
	initParticles(animation) {
		if (!animation.debrisSystem) return;
		animation.debrisSystem.init((i, system) => {
			const idx = i * 3;
			const dir = randomDirection();
			const speed = 7.5 + Math.random() * 17.0;
			system.positions[idx] = dir.x * 0.12;
			system.positions[idx + 1] = dir.y * 0.12;
			system.positions[idx + 2] = dir.z * 0.12;
			system.velocities[idx] = dir.x * speed;
			system.velocities[idx + 1] = dir.y * speed;
			system.velocities[idx + 2] = dir.z * speed;
			if (system.sizes) system.sizes[i] = 0.65 + Math.random() * 1.3;
		});
	},
	onUpdate(animation, dt, progress) {
		if (!animation.shardSphere) return;
		const burst = TWEEN.Easing.Cubic.Out(progress);
		const scale = 1.0 + burst * 7.4;
		animation.shardSphere.scale.set(scale, scale, scale);
		animation.shardSphere.rotation.x += dt * 1.9;
		animation.shardSphere.rotation.y += dt * 2.8;
	}
};

const BASS_DROP_CONFIG = {
	styleIndex: 8,
	label: 'Bass Drop',
	duration: 3.6,
	baseColor: 0x6ca8ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vBand;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float beat = sin(uTime * 9.5) * 0.5 + 0.5;
					float bars = sin(position.y * 20.0 + uTime * 12.0) * 0.5 + 0.5;
					float displacement = (bars * 1.1 + beat * 0.45) * (1.0 - uProgress * 0.45);
					vec3 displaced = position + normal * displacement;
					vBand = bars;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vBand;
				void main() {
					float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.2);
					float pulse = sin(uTime * 9.0) * 0.5 + 0.5;
					float bars = smoothstep(0.15, 0.95, vBand);
					float intensity = rim * 1.1 + bars * (1.2 + pulse * 0.8);
					float fade = 1.0 - smoothstep(0.82, 1.0, uProgress);
					float alpha = clamp(intensity, 0.0, 1.0) * 0.62 * fade;
					vec3 color = mix(uColor * 0.7, vec3(1.0), bars * 0.25 + rim * 0.2);
					gl_FragColor = vec4(color * intensity, alpha);
				}
			`
		},
		ring: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec2 vUv;
				void main() {
					vUv = uv;
					float expansion = 1.0 + uProgress * 8.0;
					vec3 displaced = position * expansion;
					float wobble = sin((uv.x + uTime * 3.2) * 24.0) * 0.18;
					displaced.y += wobble * (1.0 - uProgress * 0.6);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec2 vUv;
				void main() {
					float dist = distance(vUv, vec2(0.5));
					float ring = smoothstep(0.52, 0.45, dist) * smoothstep(0.2, 0.28, dist);
					float wave = sin(dist * 42.0 - uTime * 8.0) * 0.5 + 0.5;
					float intensity = ring * (0.9 + wave * 0.9 + (1.0 - uProgress));
					float alpha = intensity * 0.6 * (1.0 - smoothstep(0.84, 1.0, uProgress));
					gl_FragColor = vec4(uColor * intensity * 1.1, alpha);
				}
			`
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'equalizerSphere',
			type: 'core',
			material: 'material',
			geometry: {
				type: 'sphere',
				radius: 0.95,
				widthSegments: 36,
				heightSegments: 32
			}
		},
		{
			key: 'waveRingA',
			type: 'ring',
			material: 'ringMaterial',
			geometry: {
				type: 'ring',
				inner: 0.22,
				outer: 0.5,
				segments: 72,
				rotationAxis: 'x',
				rotationAngle: Math.PI / 2
			}
		},
		{
			key: 'waveRingB',
			type: 'ring',
			material: 'ringMaterial',
			geometry: {
				type: 'ring',
				inner: 0.24,
				outer: 0.55,
				segments: 72,
				rotationAxis: 'x',
				rotationAngle: Math.PI / 2
			},
			transform: { rotation: [Math.PI / 2, 0, 0] }
		},
		{
			key: 'waveRingC',
			type: 'ring',
			material: 'ringMaterial',
			geometry: {
				type: 'ring',
				inner: 0.2,
				outer: 0.48,
				segments: 72,
				rotationAxis: 'x',
				rotationAngle: Math.PI / 2
			},
			transform: { rotation: [0, 0, Math.PI / 2] }
		}
	],
	configureVisibility(animation) {
		if (animation.equalizerSphere) animation.equalizerSphere.visible = true;
		if (animation.waveRingA) animation.waveRingA.visible = true;
		if (animation.waveRingB) animation.waveRingB.visible = true;
		if (animation.waveRingC) animation.waveRingC.visible = true;
	},
	onUpdate(animation, dt, progress) {
		const time = animation.uniforms?.uTime?.value ?? 0.0;
		const beat = Math.sin(time * 9.5) * 0.5 + 0.5;
		const fade = 1.0 - smoothstep(0.84, 1.0, progress);
		const pulse = 1.0 + beat * 0.8 + (1.0 - progress) * 0.25;
		if (animation.equalizerSphere) {
			const sphereScale = 1.1 + pulse * 2.5;
			animation.equalizerSphere.scale.set(
				sphereScale,
				sphereScale,
				sphereScale
			);
			animation.equalizerSphere.rotation.y += dt * 1.5;
			animation.equalizerSphere.rotation.z += dt * 0.7;
			if (animation.equalizerSphere.material) {
				animation.equalizerSphere.material.opacity = 0.85 * fade;
			}
		}
		if (animation.waveRingA) {
			const scale = 1.0 + progress * 10.5 + beat * 0.35;
			animation.waveRingA.scale.set(scale, scale, scale);
			animation.waveRingA.rotation.y += dt * 1.1;
		}
		if (animation.waveRingB) {
			const scale = 1.0 + progress * 8.6 + beat * 0.4;
			animation.waveRingB.scale.set(scale, scale, scale);
			animation.waveRingB.rotation.x += dt * 1.4;
		}
		if (animation.waveRingC) {
			const scale = 1.0 + progress * 7.2 + beat * 0.3;
			animation.waveRingC.scale.set(scale, scale, scale);
			animation.waveRingC.rotation.z += dt * 1.9;
		}
	}
};

const TOXIC_BLOOM_CONFIG = {
	styleIndex: 9,
	label: 'Toxic Bloom',
	duration: 4.0,
	autoParticles: false,
	baseColor: 0x69ff54,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vNoise;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float boil = noise(position * 4.8 + vec3(uTime * 0.9, uTime * 1.1, uTime * 0.7));
					float displacement = (boil - 0.5) * 1.15 + pow(uProgress, 1.2) * 2.0;
					vec3 displaced = position + normal * displacement;
					vNoise = boil;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vNoise;
				void main() {
					float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.5);
					float slime = noise(vWorldPos * 2.5 + vec3(0.0, uTime * 1.8, 0.0));
					vec3 toxicA = vec3(0.24, 0.95, 0.2);
					vec3 toxicB = vec3(0.95, 1.0, 0.24);
					vec3 toxic = mix(toxicA, toxicB, clamp(slime * 0.8 + vNoise * 0.4, 0.0, 1.0));
					float intensity = 0.7 + fresnel * 1.6 + slime * 0.4;
					float fade = 1.0 - smoothstep(0.78, 1.0, uProgress);
					float alpha = clamp((0.35 + fresnel * 0.6 + slime * 0.2) * fade, 0.0, 1.0);
					gl_FragColor = vec4(mix(uColor * 0.7, toxic, 0.8) * intensity, alpha);
				}
			`,
			features: ['noise']
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress * 0.45) * 7.2',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.08, d) * smoothstep(1.0, 0.72, uProgress)',
				CUSTOM_COLOR_LOGIC: 'mix(uColor, vec3(1.0, 1.0, 0.35), 0.35)'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'bubbleMesh',
			type: 'core',
			material: 'material',
			geometry: {
				type: 'sphere',
				radius: 0.9,
				widthSegments: 30,
				heightSegments: 26
			}
		},
		{
			key: 'gasPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 280
		}
	],
	particleSystems: [
		{
			pointsKey: 'gasPoints',
			systemKey: 'gasSystem',
			drag: 0.965,
			autoUpdate: false
		}
	],
	configureVisibility(animation) {
		if (animation.bubbleMesh) animation.bubbleMesh.visible = true;
		if (animation.gasPoints) animation.gasPoints.visible = true;
	},
	initParticles(animation) {
		if (!animation.gasSystem) return;
		animation.gasSystem.init((i, system) => {
			const idx = i * 3;
			const dir = randomDirection();
			const radius = Math.random() * 0.35;
			const speed = 4.2 + Math.random() * 8.5;
			system.positions[idx] = dir.x * radius;
			system.positions[idx + 1] = -0.45 + Math.random() * 0.35;
			system.positions[idx + 2] = dir.z * radius;
			system.velocities[idx] = dir.x * speed * 1.3;
			system.velocities[idx + 1] = 8.5 + Math.random() * 9.5;
			system.velocities[idx + 2] = dir.z * speed * 1.3;
			if (system.sizes) system.sizes[i] = 1.3 + Math.random() * 2.8;
		});
	},
	onUpdate(animation, dt, progress) {
		const rise = TWEEN.Easing.Cubic.Out(progress);
		if (animation.bubbleMesh) {
			const scale = 1.0 + rise * 6.8;
			animation.bubbleMesh.scale.set(scale, scale, scale);
			animation.bubbleMesh.rotation.y += dt * 1.3;
		}
		if (animation.gasSystem) {
			animation.gasSystem.drag = progress < 0.4 ? 0.99 : 0.985;
		}
		if (animation.gasVelocities) {
			const gravityMix = smoothstep(0.4, 0.82, progress);
			const gravity = 24.0 * gravityMix;
			const turbulence = (1.0 - gravityMix) * 4.0 + gravityMix * 1.8;
			for (let i = 0; i < animation.gasCount; i++) {
				const idx = i * 3;
				if (progress < 0.4) {
					animation.gasVelocities[idx + 1] += dt * 3.6;
				} else {
					animation.gasVelocities[idx + 1] -= gravity * dt;
				}
				animation.gasVelocities[idx] += (Math.random() - 0.5) * dt * turbulence;
				animation.gasVelocities[idx + 2] +=
					(Math.random() - 0.5) * dt * turbulence;
			}
		}
		if (animation.gasSystem && animation.gasPoints?.geometry) {
			animation.gasSystem.update(dt);
			animation.gasSystem.markDirty(animation.gasPoints.geometry);
		}
	}
};

const CRYSTAL_SPIRE_CONFIG = {
	styleIndex: 10,
	label: 'Crystal Spire',
	duration: 3.7,
	baseColor: 0x77d5ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					vec3 displaced = position;
					float shimmer = sin((position.y + position.x * 0.5) * 12.0 + uTime * 5.0) * 0.02;
					displaced += normal * shimmer;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				void main() {
					float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.6);
					float facet = step(0.35, fract(vWorldPos.y * 2.8 + vWorldPos.x * 1.7 + vWorldPos.z * 1.9));
					float pulse = sin((vWorldPos.y + uProgress) * 18.0) * 0.5 + 0.5;
					float intensity = 0.55 + rim * 1.6 + facet * 0.5 + pulse * 0.15;
					float fade = 1.0 - smoothstep(0.9, 1.0, uProgress);
					float alpha = clamp((0.3 + rim * 0.65 + facet * 0.2) * fade, 0.0, 1.0);
					vec3 color = mix(uColor * 0.7, vec3(1.0), rim * 0.4 + facet * 0.2);
					gl_FragColor = vec4(color * intensity, alpha);
				}
			`
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [],
	setup(animation, materials) {
		if (!animation.baseMesh) {
			const sourceMaterial = materials?.material;
			const baseMaterial = sourceMaterial?.clone
				? sourceMaterial.clone()
				: new THREE.MeshBasicMaterial({
					color: 0x3f6f8f,
					transparent: true,
					opacity: 0.88
				});
			baseMaterial.depthWrite = true;
			baseMaterial.transparent = true;
			baseMaterial.opacity = 0.88;
			if (
				baseMaterial.uniforms?.uColor?.value?.copy &&
				baseMaterial.uniforms?.uColor?.value?.clone
			) {
				baseMaterial.uniforms.uColor.value.copy(
					baseMaterial.uniforms.uColor.value.clone().multiplyScalar(0.55)
				);
			} else if (baseMaterial.color?.clone) {
				baseMaterial.color = baseMaterial.color.clone().multiplyScalar(0.55);
			}

			const baseGeometry = new THREE.IcosahedronGeometry(1.35, 1);
			animation.baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
			animation.baseMesh.position.set(0, -2.0, 0);
			animation.baseMesh.scale.set(2.7, 0.46, 2.7);

			animation.baseMesh.visible = false;
			animation.visual.add(animation.baseMesh);
		}

		const spireCount = 8 + Math.floor(Math.random() * 5);
		animation.spireMeshes = [];
		for (let i = 0; i < spireCount; i++) {
			const angle =
				(i / spireCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
			const distance = 0.08 + Math.random() * 0.42;
			const height = 1.9 + Math.random() * 2.1;
			const radiusBottom = 0.2 + Math.random() * 0.28;
			const geometry = new THREE.CylinderGeometry(
				0.0,
				radiusBottom,
				height,
				6,
				1,
				false
			);
			const mesh = new THREE.Mesh(geometry, materials.material.clone());
			const tilt = 0.2 + Math.random() * 0.45;
			mesh.position.set(
				Math.cos(angle) * distance,
				-2.0 + height * 0.5,
				Math.sin(angle) * distance
			);
			mesh.rotation.set(
				Math.sin(angle) * tilt,
				Math.random() * Math.PI * 2,
				Math.cos(angle) * tilt
			);
			mesh.userData.baseY = mesh.position.y;
			mesh.userData.height = height;
			mesh.userData.widthScale = 0.75 + Math.random() * 0.6;
			mesh.userData.heightScale = 1.0 + Math.random() * 0.35;
			mesh.scale.set(0.001, 0.001, 0.001);
			mesh.visible = false;
			animation.spireMeshes.push(mesh);
			animation.visual.add(mesh);
		}
	},
	configureVisibility(animation) {
		if (animation.baseMesh) {
			animation.baseMesh.visible = true;
			animation.baseMesh.scale.set(2.7, 0.46, 2.7);
			if (animation.baseMesh.material)
				animation.baseMesh.material.opacity = 0.88;
		}
		if (!animation.spireMeshes) return;
		for (const mesh of animation.spireMeshes) {
			mesh.visible = true;
			mesh.scale.set(0.001, 0.001, 0.001);
		}
	},
	onUpdate(animation, dt, progress) {
		const fade = 1.0 - smoothstep(0.9, 1.0, progress);
		if (animation.baseMesh) {
			const baseRise = smoothstep(0.0, 0.25, progress);
			const basePulse = 1.0 + Math.sin(progress * Math.PI * 2.0) * 0.02;
			animation.baseMesh.visible = fade > 0.01;
			animation.baseMesh.scale.set(
				2.7 * basePulse,
				(0.42 + baseRise * 0.04) * basePulse,
				2.7 * basePulse
			);
			if (animation.baseMesh.material) {
				animation.baseMesh.material.opacity = (0.52 + baseRise * 0.36) * fade;
			}
		}

		if (!animation.spireMeshes) return;
		for (let i = 0; i < animation.spireMeshes.length; i++) {
			const mesh = animation.spireMeshes[i];
			const startTime = i * 0.05;
			const growthDuration = 0.14;
			const localProgress = Math.min(
				1.0,
				Math.max(0.0, (progress - startTime) / growthDuration)
			);
			const rise =
				localProgress <= 0.0
					? 0.0
					: Math.max(
						0.0,
						TWEEN.Easing.Elastic.Out(localProgress) +
						Math.sin(localProgress * Math.PI * 7.0) *
						(1.0 - localProgress) *
						0.14
					);
			const width = mesh.userData.widthScale * (0.12 + rise * 0.88);
			const height = mesh.userData.heightScale * rise;
			mesh.visible = fade > 0.01;
			mesh.scale.set(width, height, width);
			mesh.position.y =
				mesh.userData.baseY - (1.0 - rise) * mesh.userData.height * 0.45;
			mesh.rotation.y += dt * (0.24 + i * 0.08);
			if (mesh.material)
				mesh.material.opacity = (0.26 + Math.min(1.0, rise) * 0.7) * fade;
		}
	},
	resetCommonState(animation) {
		if (animation.baseMesh) {
			animation.baseMesh.visible = false;
			animation.baseMesh.scale.set(2.7, 0.46, 2.7);
			if (animation.baseMesh.material)
				animation.baseMesh.material.opacity = 0.88;
		}
		if (!animation.spireMeshes) return;
		for (const mesh of animation.spireMeshes) {
			mesh.visible = false;
			mesh.scale.set(0.001, 0.001, 0.001);
			mesh.position.y = mesh.userData.baseY;
		}
	}
};

const GRAVITY_WELL_CONFIG = {
	styleIndex: 11,
	label: 'Gravity Well',
	duration: 3.8,
	autoParticles: false,
	baseColor: 0x7fd9ff,
	shaders: {
		core: {
			vertexShader: `
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying vec3 vViewPos;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float expand = 1.0 + uProgress * 2.6;
					float swell = (1.0 - uProgress) * 0.04;
					vec3 displaced = position * expand + normal * swell;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					vec4 viewPos = modelViewMatrix * vec4(displaced, 1.0);
					vViewPos = viewPos.xyz;
					gl_Position = projectionMatrix * viewPos;
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying vec3 vViewPos;
				void main() {
					vec3 normalDir = normalize(vNormal);
					vec3 viewDir = normalize(-vViewPos);
					float fresnel = pow(1.0 - max(dot(normalDir, viewDir), 0.0), 2.2);
					float body = 0.55 + (1.0 - fresnel) * 0.45;
					float refractionHint = clamp(body + fresnel * 1.1, 0.0, 1.6);
					float fade = 1.0 - smoothstep(0.86, 1.0, uProgress);
					vec3 color = mix(vec3(0.24, 0.72, 1.0), uColor, 0.6);
					float alpha = clamp((0.34 + refractionHint * 0.36) * fade, 0.0, 1.0);
					gl_FragColor = vec4(color * (0.38 + refractionHint * 1.15), alpha);
				}
			`
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress * 0.5) * 7.0',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.1, d) * smoothstep(1.0, 0.75, uProgress)',
				CUSTOM_COLOR_LOGIC: 'mix(uColor, vec3(1.0), 0.25)'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'horizonSphere',
			type: 'core',
			material: 'material',
			geometry: {
				type: 'sphere',
				radius: 0.72,
				widthSegments: 32,
				heightSegments: 28
			},
			transform: {
				scale: [0.2, 0.2, 0.2]
			}
		},
		{
			key: 'debrisPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 280
		}
	],
	particleSystems: [
		{
			pointsKey: 'debrisPoints',
			systemKey: 'debrisSystem',
			drag: 0.985,
			autoUpdate: false
		}
	],
	configureVisibility(animation) {
		animation.debrisBursted = false;
		if (animation.horizonSphere) animation.horizonSphere.visible = true;
		if (animation.debrisPoints) animation.debrisPoints.visible = true;
	},
	initParticles(animation) {
		animation.debrisBursted = false;
		animation.debrisBurstScale = new Float32Array(animation.debrisCount);
		animation.debrisDirections = new Float32Array(animation.debrisCount * 3);
		if (!animation.debrisSystem) return;
		animation.debrisSystem.drag = 0.9;
		animation.debrisSystem.init((i, system) => {
			const idx = i * 3;
			const dir = randomDirection();
			const radius = 0.04 + Math.random() * 0.45;
			const speed = 0.08 + Math.random() * 0.32;
			system.positions[idx] = dir.x * radius;
			system.positions[idx + 1] = dir.y * radius;
			system.positions[idx + 2] = dir.z * radius;
			system.velocities[idx] = dir.x * speed;
			system.velocities[idx + 1] = dir.y * speed;
			system.velocities[idx + 2] = dir.z * speed;
			if (system.sizes) system.sizes[i] = 0.5 + Math.random() * 1.2;
			animation.debrisDirections[idx] = dir.x;
			animation.debrisDirections[idx + 1] = dir.y;
			animation.debrisDirections[idx + 2] = dir.z;
			animation.debrisBurstScale[i] = 14.0 + Math.random() * 16.0;
		});
	},
	onUpdate(animation, dt, progress) {
		if (animation.horizonSphere) {
			let scale = 0.5;
			if (progress < 0.2) {
				const suction = smoothstep(0.0, 0.2, progress);
				scale = 0.5 - suction * 0.34;
			} else {
				const burstProgress = Math.min(1.0, (progress - 0.2) / 0.8);
				const easedBurst = TWEEN.Easing.Cubic.Out(burstProgress);
				scale = 0.16 + easedBurst * 8.9;
			}
			animation.horizonSphere.scale.set(scale, scale, scale);
			animation.horizonSphere.rotation.y += dt * 1.2;
			animation.horizonSphere.rotation.z += dt * 0.45;
		}
		if (animation.debrisPositions && animation.debrisVelocities) {
			const suctionPhase = progress < 0.2;
			if (animation.debrisSystem) {
				animation.debrisSystem.drag = suctionPhase ? 0.9 : 0.992;
			}

			if (
				!animation.debrisBursted &&
				progress >= 0.2 &&
				animation.debrisDirections
			) {
				for (let i = 0; i < animation.debrisCount; i++) {
					const idx = i * 3;
					const burstSpeed = animation.debrisBurstScale?.[i] ?? 18.0;
					animation.debrisVelocities[idx] =
						animation.debrisDirections[idx] * burstSpeed;
					animation.debrisVelocities[idx + 1] =
						animation.debrisDirections[idx + 1] * burstSpeed;
					animation.debrisVelocities[idx + 2] =
						animation.debrisDirections[idx + 2] * burstSpeed;
				}
				animation.debrisBursted = true;
			}

			const repelStrength = 24.0 + (1.0 - progress) * 28.0;
			for (let i = 0; i < animation.debrisCount; i++) {
				const idx = i * 3;
				const x = animation.debrisPositions[idx];
				const y = animation.debrisPositions[idx + 1];
				const z = animation.debrisPositions[idx + 2];
				const lenSq = x * x + y * y + z * z;
				const len = Math.sqrt(lenSq) + 0.0001;
				const invLen = 1.0 / len;
				if (suctionPhase) {
					const pull = Math.min(35.0, 12.0 / (0.08 + lenSq));
					animation.debrisVelocities[idx] -= x * invLen * pull * dt;
					animation.debrisVelocities[idx + 1] -= y * invLen * pull * dt;
					animation.debrisVelocities[idx + 2] -= z * invLen * pull * dt;
				} else {
					const accel = Math.min(58.0, repelStrength / (0.12 + lenSq));
					animation.debrisVelocities[idx] += x * invLen * accel * dt;
					animation.debrisVelocities[idx + 1] += y * invLen * accel * dt * 0.9;
					animation.debrisVelocities[idx + 2] += z * invLen * accel * dt;
				}
				if (animation.debrisSizes) {
					animation.debrisSizes[i] = Math.max(
						0.2,
						animation.debrisSizes[i] * (1.0 - progress * 0.0017)
					);
				}
			}
		}
		if (animation.debrisSystem && animation.debrisPoints?.geometry) {
			animation.debrisSystem.update(dt);
			animation.debrisSystem.markDirty(animation.debrisPoints.geometry);
		}
	},
	resetCommonState(animation) {
		animation.debrisBursted = false;
		if (animation.debrisSystem) animation.debrisSystem.drag = 0.9;
	}
};

const SPOOKY_CONFIG = {
	styleIndex: 12,
	label: 'Spooky',
	duration: 4.2,
	autoParticles: false,
	baseColor: 0x5f6a86,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vDensity;
				void main() {
					vNormal = normalize(normalMatrix * normal);
					float smoke = fbm(position * 2.6 + vec3(0.0, uTime * 0.7, 0.0));
					float ripple = sin(uTime * 2.8 + position.y * 7.0) * 0.08;
					vec3 displaced = position + normal * ((smoke - 0.5) * 1.1 + ripple);
					displaced.y += uProgress * 0.85;
					vDensity = smoke;
					vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;
				varying vec3 vNormal;
				varying vec3 vWorldPos;
				varying float vDensity;
				void main() {
					float smoke = fbm(vWorldPos * 1.45 + vec3(0.0, uTime * 0.85, 0.0));
					float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.5);
					float body = smoothstep(0.2, 0.9, smoke * 0.65 + vDensity * 0.55);
					float pulse = 0.5 + 0.5 * sin(uTime * 3.2);
					float fade = smoothstep(0.0, 0.22, uProgress) *
						(1.0 - smoothstep(0.76, 1.0, uProgress));
					float alpha = clamp((body * 0.7 + rim * 0.55 + pulse * 0.1) * fade, 0.0, 1.0);
					vec3 shadowColor = mix(vec3(0.02, 0.03, 0.05), uColor, body * 0.55 + rim * 0.3);
					gl_FragColor = vec4(shadowColor, alpha * 0.85);
				}
			`,
			features: ['noise']
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress * 0.45) * 6.5',
				CUSTOM_ALPHA_LOGIC:
					'smoothstep(0.5, 0.08, d) * smoothstep(1.0, 0.74, uProgress)',
				CUSTOM_COLOR_LOGIC: 'mix(vec3(0.02, 0.02, 0.03), uColor, 0.18)'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{
			key: 'totemMesh',
			type: 'core',
			material: 'material',
			geometry: {
				type: 'icosahedron',
				radius: 1.0,
				detail: 4
			},
			transform: {
				position: [0, -1.55, 0],
				scale: [1.15, 1.6, 1.15]
			}
		},
		{
			key: 'smokePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 260
		},
		{
			key: 'shardPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 340
		},
		{
			key: 'watcherSprite',
			type: 'custom',
			build() {
				const canvas = document.createElement('canvas');
				canvas.width = 256;
				canvas.height = 128;
				const ctx = canvas.getContext('2d');
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				const drawEye = (x) => {
					const gradient = ctx.createRadialGradient(x, 64, 2, x, 64, 30);
					gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
					gradient.addColorStop(0.12, 'rgba(255, 120, 120, 1.0)');
					gradient.addColorStop(0.5, 'rgba(220, 20, 40, 0.85)');
					gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
					ctx.fillStyle = gradient;
					ctx.beginPath();
					ctx.ellipse(x, 64, 32, 22, 0, 0, Math.PI * 2);
					ctx.fill();
				};

				drawEye(90);
				drawEye(166);

				const texture = new THREE.CanvasTexture(canvas);
				texture.needsUpdate = true;

				const material = new THREE.SpriteMaterial({
					map: texture,
					transparent: true,
					opacity: 0.0,
					depthWrite: false,
					depthTest: false,
					blending: THREE.AdditiveBlending
				});

				const sprite = new THREE.Sprite(material);
				sprite.scale.set(1.6, 0.8, 1.0);
				sprite.visible = false;
				sprite.renderOrder = 14;
				return sprite;
			},
			transform: {
				position: [0, -0.82, 0]
			},
			visible: false
		}
	],
	particleSystems: [
		{
			pointsKey: 'smokePoints',
			systemKey: 'smokeSystem',
			drag: 0.985,
			autoUpdate: false
		},
		{
			pointsKey: 'shardPoints',
			systemKey: 'shardSystem',
			drag: 0.988,
			autoUpdate: false
		}
	],
	configureVisibility(animation) {
		if (animation.totemMesh) animation.totemMesh.visible = true;
		if (animation.smokePoints) animation.smokePoints.visible = true;
		if (animation.shardPoints) animation.shardPoints.visible = true;
		if (animation.watcherSprite) animation.watcherSprite.visible = true;
	},
	initParticles(animation) {
		animation.spookyTime = 0.0;
		animation.lastTotemY = -1.55;
		animation.smokeAngles = new Float32Array(animation.smokeCount);
		animation.smokeSpin = new Float32Array(animation.smokeCount);
		animation.shardAngles = new Float32Array(animation.shardCount ?? 0);
		animation.shardSpin = new Float32Array(animation.shardCount ?? 0);
		animation.shardBaseSizes = new Float32Array(animation.shardCount ?? 0);
		if (!animation.smokeSystem) return;
		animation.smokeSystem.init((i, system) => {
			const idx = i * 3;
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * 1.15;
			const height = -1.9 + Math.random() * 0.45;
			system.positions[idx] = Math.cos(angle) * radius;
			system.positions[idx + 1] = height;
			system.positions[idx + 2] = Math.sin(angle) * radius;
			system.velocities[idx] = (Math.random() - 0.5) * 0.2;
			system.velocities[idx + 1] = 0.35 + Math.random() * 0.7;
			system.velocities[idx + 2] = (Math.random() - 0.5) * 0.2;
			if (system.sizes) system.sizes[i] = 0.55 + Math.random() * 1.1;
			animation.smokeAngles[i] = angle;
			animation.smokeSpin[i] = 0.2 + Math.random() * 0.8;
		});
		if (!animation.shardSystem) return;
		animation.shardSystem.init((i, system) => {
			const idx = i * 3;
			const angle = Math.random() * Math.PI * 2;
			const radius = 1.18 + Math.random() * 0.68;
			const yOffset = -0.95 + Math.random() * 1.1;
			system.positions[idx] =
				Math.cos(angle) * radius + (Math.random() - 0.5) * 0.08;
			system.positions[idx + 1] = animation.lastTotemY + yOffset;
			system.positions[idx + 2] =
				Math.sin(angle) * radius + (Math.random() - 0.5) * 0.08;
			system.velocities[idx] = (Math.random() - 0.5) * 0.18;
			system.velocities[idx + 1] = 0.28 + Math.random() * 0.55;
			system.velocities[idx + 2] = (Math.random() - 0.5) * 0.18;
			if (system.sizes) {
				const size = 1.1 + Math.random() * 1.7;
				system.sizes[i] = size;
				animation.shardBaseSizes[i] = size;
			}
			animation.shardAngles[i] = angle;
			animation.shardSpin[i] = 0.5 + Math.random() * 1.2;
		});
	},
	onUpdate(animation, dt, progress) {
		animation.spookyTime = (animation.spookyTime ?? 0.0) + dt;
		const rise = smoothstep(0.0, 0.58, progress);
		const fade = 1.0 - smoothstep(0.76, 1.0, progress);
		const totemY =
			-1.55 + rise * 2.55 + Math.sin(animation.spookyTime * 2.3) * 0.08;
		const totemDeltaY = totemY - (animation.lastTotemY ?? totemY);
		animation.lastTotemY = totemY;

		if (animation.totemMesh) {
			animation.totemMesh.position.y = totemY;
			animation.totemMesh.rotation.y += dt * 0.45;
			animation.totemMesh.rotation.x += dt * 0.14;
			const stretch = 1.0 + rise * 0.35;
			animation.totemMesh.scale.set(1.15, 1.6 * stretch, 1.15);
			if (animation.totemMesh.material) {
				animation.totemMesh.material.opacity = 0.8 * fade;
			}
		}

		if (animation.watcherSprite?.material) {
			const eyePulse = 0.6 + Math.sin(animation.spookyTime * 7.8) * 0.25;
			animation.watcherSprite.position.set(0, totemY + 0.62, 0);
			animation.watcherSprite.material.opacity = Math.max(0.0, eyePulse * fade);
			const eyeScale = 1.35 + Math.sin(animation.spookyTime * 4.2) * 0.12;
			animation.watcherSprite.scale.set(eyeScale, eyeScale * 0.5, 1.0);
		}

		if (
			animation.smokePositions &&
			animation.smokeVelocities &&
			animation.smokeAngles &&
			animation.smokeSpin
		) {
			for (let i = 0; i < animation.smokeCount; i++) {
				const idx = i * 3;
				animation.smokePositions[idx + 1] += totemDeltaY * 0.55;
				const angle =
					animation.smokeAngles[i] + dt * (0.6 + animation.smokeSpin[i] * 1.3);
				animation.smokeAngles[i] = angle;
				animation.smokeVelocities[idx] += Math.cos(angle) * dt * 0.28;
				animation.smokeVelocities[idx + 1] += dt * 0.7;
				animation.smokeVelocities[idx + 2] += Math.sin(angle) * dt * 0.28;

				const top = totemY + 1.25;
				if (animation.smokePositions[idx + 1] > top) {
					const resetRadius = 0.2 + Math.random() * 0.95;
					const resetAngle = Math.random() * Math.PI * 2;
					animation.smokePositions[idx] = Math.cos(resetAngle) * resetRadius;
					animation.smokePositions[idx + 1] =
						totemY - 0.8 + Math.random() * 0.35;
					animation.smokePositions[idx + 2] =
						Math.sin(resetAngle) * resetRadius;
					animation.smokeVelocities[idx] = (Math.random() - 0.5) * 0.22;
					animation.smokeVelocities[idx + 1] = 0.15 + Math.random() * 0.5;
					animation.smokeVelocities[idx + 2] = (Math.random() - 0.5) * 0.22;
					animation.smokeAngles[i] = resetAngle;
				}
				if (animation.smokeSizes) {
					animation.smokeSizes[i] = Math.max(
						0.2,
						animation.smokeSizes[i] * (1.0 - progress * 0.0025)
					);
				}
			}
		}

		if (
			animation.shardPositions &&
			animation.shardVelocities &&
			animation.shardAngles &&
			animation.shardSpin
		) {
			if (animation.shardSystem) {
				animation.shardSystem.drag = progress < 0.7 ? 0.992 : 0.985;
			}
			for (let i = 0; i < animation.shardCount; i++) {
				const idx = i * 3;
				animation.shardPositions[idx + 1] += totemDeltaY * 0.82;

				const x = animation.shardPositions[idx];
				const z = animation.shardPositions[idx + 2];
				const radial = Math.sqrt(x * x + z * z) + 0.0001;
				const invRadial = 1.0 / radial;
				const tangentialX = -z * invRadial;
				const tangentialZ = x * invRadial;
				const spin = 1.8 + animation.shardSpin[i] * 2.0;
				const targetRadius =
					1.15 + Math.sin(animation.spookyTime * 1.2 + i * 0.19) * 0.22;
				const radiusError = targetRadius - radial;
				const radialX = x * invRadial;
				const radialZ = z * invRadial;

				animation.shardVelocities[idx] +=
					(tangentialX * spin + radialX * radiusError * 1.5) * dt;
				animation.shardVelocities[idx + 1] +=
					(0.7 + Math.sin(animation.spookyTime * 1.9 + i * 0.33) * 0.35) * dt;
				animation.shardVelocities[idx + 2] +=
					(tangentialZ * spin + radialZ * radiusError * 1.5) * dt;

				const top = totemY + 1.45;
				const base = totemY - 1.08;
				if (animation.shardPositions[idx + 1] > top) {
					const angle = Math.random() * Math.PI * 2;
					const resetRadius = 1.05 + Math.random() * 0.7;
					animation.shardPositions[idx] = Math.cos(angle) * resetRadius;
					animation.shardPositions[idx + 1] = base + Math.random() * 0.22;
					animation.shardPositions[idx + 2] = Math.sin(angle) * resetRadius;
					animation.shardVelocities[idx] = (Math.random() - 0.5) * 0.16;
					animation.shardVelocities[idx + 1] = 0.12 + Math.random() * 0.36;
					animation.shardVelocities[idx + 2] = (Math.random() - 0.5) * 0.16;
					animation.shardAngles[i] = angle;
				}

				if (animation.shardSizes && animation.shardBaseSizes) {
					const heightFade = smoothstep(
						totemY + 0.2,
						top,
						animation.shardPositions[idx + 1]
					);
					animation.shardSizes[i] = Math.max(
						0.12,
						animation.shardBaseSizes[i] * (1.0 - heightFade * 0.92)
					);
				}
			}
		}

		if (animation.smokeSystem && animation.smokePoints?.geometry) {
			animation.smokeSystem.update(dt);
			animation.smokeSystem.markDirty(animation.smokePoints.geometry);
		}
		if (animation.shardSystem && animation.shardPoints?.geometry) {
			animation.shardSystem.update(dt);
			animation.shardSystem.markDirty(animation.shardPoints.geometry);
		}
	},
	resetCommonState(animation) {
		animation.spookyTime = 0.0;
		animation.lastTotemY = -1.55;
		if (animation.shardPoints) animation.shardPoints.visible = false;
		if (animation.watcherSprite) animation.watcherSprite.visible = false;
	}
};

const NOVA_CONFIG = {
	styleIndex: 13,
	label: 'Nova',
	duration: 4.0,
	baseColor: 0xff6f61,
	shaders: {
		core: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;

				varying vec3 vNormal;
				varying vec3 vWorldPos;

				void main() {
					vNormal = normalize(normalMatrix * normal);
					float burst = pow(uProgress, 1.3);
					float jitter = noise(position * 4.0 + uTime * 2.0) * 0.45;
					float spike = pow(
						abs(sin((position.x + position.y + position.z) * 10.0 + uTime * 1.4)),
						2.0
					);
					float displacement = burst * 2.8 + jitter * (1.0 - uProgress);
					vec3 displaced = position + normal * (displacement + spike * (1.1 - uProgress));
					float radial = length(position) + 0.001;
					displaced += normalize(position) * sin(uTime * 6.0 + radial * 8.0)
						* (1.0 - uProgress) * 0.25;
					vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
					vWorldPos = worldPos.xyz;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uProgress;
				uniform vec3 uColor;

				varying vec3 vNormal;
				varying vec3 vWorldPos;

				void main() {
					float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vWorldPos))), 2.2);
					float core = smoothstep(0.7, 0.0, length(vWorldPos));
					float ring = smoothstep(0.35, 0.0, abs(length(vWorldPos) - (1.2 + uProgress * 2.2)));
					float plasma = sin(
						uTime * 8.0 + vWorldPos.x * 6.0 + vWorldPos.y * 7.0 + vWorldPos.z * 6.5
					) * 0.5 + 0.5;
					float streaks = pow(
						abs(sin((vWorldPos.x + vWorldPos.y + vWorldPos.z) * 12.0 + uTime * 5.0)),
						2.0
					);
					float intensity =
						rim * 1.4 +
						core * 2.3 +
						ring * 1.6 +
						plasma * (1.0 - uProgress) * 0.8 +
						streaks * (1.0 - uProgress) * 1.2;
					float flare = pow(1.0 - uProgress, 2.0);
					intensity += flare * 2.0;
					vec3 color = uColor * intensity * 1.05;
					float alpha = clamp(intensity, 0.0, 1.0) * 0.55;
					float dissolve = smoothstep(0.65, 1.0, uProgress);
					float hash = fract(sin(dot(vWorldPos, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
					float mask = step(dissolve, hash);
					gl_FragColor = vec4(color, alpha * mask);
				}
			`,
			features: ['math', 'noise']
		},
		ring: {
			template: 'STANDARD_RING_SHADER',
			injections: {
				RING_EXPANSION_MULTIPLIER: '6.0',
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.5, 0.45, dist) * smoothstep(0.3, 0.33, dist)',
				CUSTOM_INTENSITY_LOGIC:
					'ring * (1.1 + (1.0 - uProgress) * 1.4) * (1.0 + (sin((dist * 60.0) - uTime * 12.0 - uProgress * 18.0) * 0.5 + 0.5) * 0.6) * 1.1',
				CUSTOM_COLOR_LOGIC: 'uColor * intensity * 1.1',
				CUSTOM_ALPHA_LOGIC:
					'clamp(intensity, 0.0, 1.0) * 0.6 * smoothstep(1.0, 0.7, uProgress) * step(smoothstep(0.65, 1.0, uProgress), fract(sin(dot(vec3(vUv, uTime), vec3(12.9898, 78.233, 37.719))) * 43758.5453))'
			},
			features: ['math']
		},
		particles: {
			template: 'STANDARD_PARTICLE_SHADER',
			injections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0',
				CUSTOM_ALPHA_LOGIC:
					'clamp(smoothstep(0.5, 0.1, d) + (smoothstep(0.16, 0.0, abs(uv.x)) + smoothstep(0.16, 0.0, abs(uv.y))) * 0.35, 0.0, 1.0)',
				CUSTOM_COLOR_LOGIC:
					'uColor * (1.15 + (smoothstep(0.16, 0.0, abs(uv.x)) + smoothstep(0.16, 0.0, abs(uv.y))) * 0.1)'
			}
		}
	},
	materialOptions: {
		default: {
			side: THREE.DoubleSide
		}
	},
	assets: [
		{ key: 'coreMesh', type: 'core', material: 'material' },
		{
			key: 'ringMesh',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY
		},
		{
			key: 'ringMesh2',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY,
			transform: { rotation: [Math.PI / 2, 0, 0] }
		},
		{
			key: 'ringMesh3',
			type: 'ring',
			material: 'ringMaterial',
			geometry: DEFAULT_RING_GEOMETRY,
			transform: { rotation: [0, 0, Math.PI / 2] }
		},
		{
			key: 'particlePoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 280
		},
		{
			key: 'sparkPoints',
			type: 'particles',
			material: 'particleMaterial',
			count: 200,
			visible: false
		},
		{ key: 'flareSprite', type: 'flare', visible: false }
	],
	particleSystems: [
		{ pointsKey: 'particlePoints', systemKey: 'particleSystem', drag: 0.98 },
		{ pointsKey: 'sparkPoints', systemKey: 'sparkSystem', drag: 0.965 }
	],
	configureVisibility(animation) {
		animation.coreMesh.visible = true;
		animation.ringMesh.visible = true;
		animation.ringMesh2.visible = true;
		animation.ringMesh3.visible = true;
		if (animation.sparkPoints) animation.sparkPoints.visible = true;
		if (animation.flareSprite) {
			animation.flareSprite.visible = false;
			animation.flareSprite.material.opacity = 0.0;
		}
	},
	initParticles(animation) {
		if (animation.particleSystem) {
			animation.particleSystem.init((i, system) => {
				const idx = i * 3;
				const dir = randomDirection();
				const speed = 8 + Math.random() * 14;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 1.0 + Math.random() * 1.5;
			});
		}
		if (animation.sparkSystem) {
			animation.sparkSystem.init((i, system) => {
				const idx = i * 3;
				const dir = randomDirection();
				const speed = 10 + Math.random() * 16;
				system.positions[idx] = 0;
				system.positions[idx + 1] = 0;
				system.positions[idx + 2] = 0;
				system.velocities[idx] = dir.x * speed;
				system.velocities[idx + 1] = dir.y * speed;
				system.velocities[idx + 2] = dir.z * speed;
				if (system.sizes) system.sizes[i] = 0.4 + Math.random() * 1.0;
			});
		}
	},
	onUpdate(animation, dt, progress) {
		const eased = TWEEN.Easing.Quintic.Out(progress);
		const scale = 1.0 + eased * 8.5;
		animation.coreMesh.scale.set(scale, scale, scale);
		animation.ringMesh.scale.set(scale, scale, scale);
		animation.ringMesh2.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
		animation.ringMesh3.scale.set(scale * 0.8, scale * 0.8, scale * 0.8);
		animation.coreMesh.rotation.z += dt * 1.2;
		animation.ringMesh.rotation.y += dt * 1.8;
		if (animation.flareSprite) {
			animation.flareSprite.visible = true;
			const pulse = 1.0 - progress;
			animation.flareSprite.material.opacity = Math.min(1.0, pulse * 0.9);
			const flareScale = 2.4 + progress * 4.6;
			animation.flareSprite.scale.set(flareScale, flareScale, 1.0);
		}
	}
};


export const GOAL_ANIMATION_CONFIGS = [
	DEFAULT_CONFIG,
	PIXEL_BURST_CONFIG,
	VORTEX_CONFIG,
	BOOM_HEADSHOT_CONFIG,
	BLACK_HOLE_CONFIG,
	MONSOON_CONFIG,
	ORBITAL_STRIKE_CONFIG,
	SHATTERED_REALITY_CONFIG,
	BASS_DROP_CONFIG,
	TOXIC_BLOOM_CONFIG,
	CRYSTAL_SPIRE_CONFIG,
	GRAVITY_WELL_CONFIG,
	SPOOKY_CONFIG,
	NOVA_CONFIG,
];

export const GOAL_EXPLOSION_STYLES = GOAL_ANIMATION_CONFIGS.map((config) => ({
	styleIndex: config.styleIndex,
	label: config.label
}));

const DEFAULT_GOAL_CONFIG = GOAL_ANIMATION_CONFIGS[0];
const CONFIGS_BY_STYLE_INDEX = new Map(
	GOAL_ANIMATION_CONFIGS.map((config) => [config.styleIndex, config])
);

export function resolveGoalAnimationConfig(styleIndex) {
	if (!Number.isFinite(styleIndex)) {
		return DEFAULT_GOAL_CONFIG;
	}

	return CONFIGS_BY_STYLE_INDEX.get(styleIndex) ?? DEFAULT_GOAL_CONFIG;
}
