import * as THREE from 'three';
import {
	GOAL_EXPLOSION_STYLES,
	resolveGoalAnimationConfig
} from './goalAnimations.js';
import {
	ShaderLibrary,
	ShaderRepository,
	joinShaderChunks
} from './shaderLibrary.js';

const FEATURE_CHUNKS = {
	math: ShaderLibrary.MathChunks,
	noise: ShaderLibrary.NoiseChunks,
	lighting: ShaderLibrary.LightingChunks,
	physics: ShaderLibrary.PhysicsChunks
};

function toVector3(position) {
	if (position instanceof THREE.Vector3) return position;
	if (Array.isArray(position)) {
		return new THREE.Vector3(
			position[0] ?? 0,
			position[1] ?? 0,
			position[2] ?? 0
		);
	}
	if (position && typeof position === 'object') {
		return new THREE.Vector3(position.x ?? 0, position.y ?? 0, position.z ?? 0);
	}
	return new THREE.Vector3(0, 0, 0);
}

function cloneUniformMap(uniforms = {}) {
	return THREE.UniformsUtils.clone(uniforms ?? {});
}

function resolveShaderFeatures(featureConfig, key) {
	return Array.isArray(featureConfig?.[key]) ? featureConfig[key] : [];
}

function resolveConfigFeatures(shaderDefinition) {
	if (Array.isArray(shaderDefinition?.features)) {
		return shaderDefinition.features;
	}
	return [];
}

function buildShader(chunks, source) {
	return `${chunks}\n${source}`;
}

function resolveMaterialOptions(materialOptions) {
	if (!materialOptions || Array.isArray(materialOptions)) return {};
	if (Object.hasOwn(materialOptions, 'default')) {
		return materialOptions.default ?? {};
	}
	return materialOptions;
}

function createGoalMaterial({
	vertexShader,
	fragmentShader,
	uniforms,
	features = [],
	blending = THREE.AdditiveBlending,
	depthWrite = false,
	transparent = true,
	side
}) {
	const chunkSource = joinShaderChunks(
		...features.map((feature) => FEATURE_CHUNKS[feature]).filter(Boolean)
	);

	const materialOptions = {
		uniforms,
		vertexShader: buildShader(chunkSource, vertexShader),
		fragmentShader: buildShader(chunkSource, fragmentShader),
		transparent,
		depthWrite,
		blending
	};

	if (side !== undefined) {
		materialOptions.side = side;
	}

	return new THREE.ShaderMaterial(materialOptions);
}

function createGoalMaterialBundle({
	vertexShader,
	fragmentShader,
	ringVertexShader,
	ringFragmentShader,
	particleVertexShader,
	particleFragmentShader,
	features = [],
	coreUniforms,
	ringUniforms,
	particleUniforms,
	materialOptions = {}
}) {
	const baseUniforms = () => ({
		uTime: { value: 0.0 },
		uProgress: { value: 0.0 },
		uColor: { value: new THREE.Color(0xffffff) }
	});

	const uniforms = { ...baseUniforms(), ...coreUniforms };
	const ringUniformsFinal = { ...baseUniforms(), ...ringUniforms };
	const particleUniformsFinal = { ...baseUniforms(), ...particleUniforms };
	const materialOverrides = resolveMaterialOptions(materialOptions);

	const material = createGoalMaterial({
		vertexShader,
		fragmentShader,
		uniforms,
		features: resolveShaderFeatures(features, 'core'),
		...materialOverrides
	});

	const ringMaterial = createGoalMaterial({
		vertexShader: ringVertexShader,
		fragmentShader: ringFragmentShader,
		uniforms: ringUniformsFinal,
		features: resolveShaderFeatures(features, 'ring'),
		...materialOverrides
	});

	const particleMaterial = createGoalMaterial({
		vertexShader: particleVertexShader,
		fragmentShader: particleFragmentShader,
		uniforms: particleUniformsFinal,
		features: resolveShaderFeatures(features, 'particles'),
		...materialOverrides
	});

	return {
		uniforms,
		ringUniforms: ringUniformsFinal,
		particleUniforms: particleUniformsFinal,
		materials: {
			material,
			ringMaterial,
			particleMaterial
		}
	};
}

function createCore(geometry, material) {
	const coreGeometry = geometry ?? new THREE.IcosahedronGeometry(1.2, 4);
	return new THREE.Mesh(coreGeometry, material);
}

function createRingGeometry({
	inner = 0.6,
	outer = 0.95,
	segments = 64,
	rotationAxis = 'y',
	rotationAngle = Math.PI / 2
} = {}) {
	const ringGeometry = new THREE.RingGeometry(inner, outer, segments, 1);
	if (rotationAxis && rotationAngle) {
		if (rotationAxis === 'x') ringGeometry.rotateX(rotationAngle);
		if (rotationAxis === 'y') ringGeometry.rotateY(rotationAngle);
		if (rotationAxis === 'z') ringGeometry.rotateZ(rotationAngle);
	}
	return ringGeometry;
}

function createRing(geometry, material) {
	return new THREE.Mesh(geometry, material);
}

function createParticles(count, material) {
	const positions = new Float32Array(count * 3);
	const velocities = new Float32Array(count * 3);
	const sizes = new Float32Array(count);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

	const points = new THREE.Points(geometry, material);
	return {
		points,
		geometry,
		positions,
		velocities,
		sizes,
		count
	};
}

function createFlare() {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');
	const center = canvas.width / 2;
	const gradient = ctx.createRadialGradient(
		center,
		center,
		0,
		center,
		center,
		center
	);
	gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
	gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.6)');
	gradient.addColorStop(0.7, 'rgba(80, 160, 255, 0.3)');
	gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;

	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		opacity: 0.0,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});

	const sprite = new THREE.Sprite(material);
	sprite.scale.set(3.2, 3.2, 1.0);
	sprite.visible = false;
	return sprite;
}

function resolveMaterial(materials, keyOrMaterial) {
	if (!keyOrMaterial) return null;
	if (
		typeof keyOrMaterial === 'object' &&
		(keyOrMaterial.isMaterial || keyOrMaterial.type)
	) {
		return keyOrMaterial;
	}
	return materials?.[keyOrMaterial] ?? null;
}

function createGeometry(geometryConfig = {}) {
	if (!geometryConfig || typeof geometryConfig !== 'object') return null;

	const type = geometryConfig.type ?? 'icosahedron';

	if (type === 'ring') {
		return createRingGeometry(geometryConfig);
	}
	if (type === 'icosahedron') {
		return new THREE.IcosahedronGeometry(
			geometryConfig.radius ?? 1.2,
			geometryConfig.detail ?? 4
		);
	}
	if (type === 'sphere') {
		return new THREE.SphereGeometry(
			geometryConfig.radius ?? 1.0,
			geometryConfig.widthSegments ?? 32,
			geometryConfig.heightSegments ?? 32
		);
	}
	if (type === 'cylinder') {
		return new THREE.CylinderGeometry(
			geometryConfig.radiusTop ?? 1,
			geometryConfig.radiusBottom ?? 1,
			geometryConfig.height ?? 1,
			geometryConfig.radialSegments ?? 8,
			geometryConfig.heightSegments ?? 1,
			geometryConfig.openEnded ?? false
		);
	}

	return null;
}

function applyVector(target, value) {
	if (!target || value === undefined || value === null) return;
	if (Array.isArray(value)) {
		target.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
		return;
	}
	if (typeof value === 'number' && target.setScalar) {
		target.setScalar(value);
		return;
	}
	target.set(value.x ?? 0, value.y ?? 0, value.z ?? 0);
}

function applyTransform(object3d, transform = {}) {
	if (!object3d || !transform) return;
	applyVector(object3d.position, transform.position);
	applyVector(object3d.rotation, transform.rotation);
	applyVector(object3d.scale, transform.scale);
}

function createAssetsFromConfig({
	animation,
	assets = [],
	materials = {}
} = {}) {
	const created = [];
	const assetHelpers = {
		createCore,
		createRingGeometry,
		createRing,
		createParticles,
		createFlare,
		createGeometry,
		applyTransform,
		resolveMaterial
	};

	for (const assetConfig of assets) {
		if (!assetConfig) continue;

		const type = assetConfig.type;
		const key = assetConfig.key;
		let asset = null;

		if (type === 'core') {
			const geometry = assetConfig.geometry
				? createGeometry(assetConfig.geometry)
				: null;
			const material = resolveMaterial(
				materials,
				assetConfig.material ?? 'material'
			);
			asset = createCore(geometry, material);
		} else if (type === 'ring') {
			const geometryConfig = assetConfig.geometry ?? {};
			const geometry =
				geometryConfig.type === 'ring' || !geometryConfig.type
					? createRingGeometry(geometryConfig)
					: createGeometry(geometryConfig);
			const material = resolveMaterial(
				materials,
				assetConfig.material ?? 'ringMaterial'
			);
			asset = createRing(geometry, material);
		} else if (type === 'particles') {
			const material = resolveMaterial(
				materials,
				assetConfig.material ?? 'particleMaterial'
			);
			const particles = createParticles(assetConfig.count ?? 100, material);
			asset = particles.points;
			if (animation) {
				const resolvedKey = key ?? 'particles';
				const prefix = resolvedKey.endsWith('Points')
					? resolvedKey.slice(0, -6)
					: resolvedKey;
				animation[`${prefix}Positions`] = particles.positions;
				animation[`${prefix}Velocities`] = particles.velocities;
				animation[`${prefix}Sizes`] = particles.sizes;
				animation[`${prefix}Count`] = particles.count;
				animation[`${prefix}Geometry`] = particles.geometry;
			}
		} else if (type === 'flare') {
			asset = createFlare();
		} else if (type === 'custom' && typeof assetConfig.build === 'function') {
			asset = assetConfig.build({
				animation,
				materials,
				THREE,
				assetHelpers
			});
		}

		if (!asset) continue;

		const addAsset = (instance) => {
			if (!instance) return;
			applyTransform(instance, assetConfig.transform);
			if (assetConfig.visible !== undefined) {
				instance.visible = !!assetConfig.visible;
			}
			if (animation && key) {
				animation[key] = instance;
			}
			if (animation?.visual && instance !== animation.visual) {
				animation.visual.add(instance);
			}
			created.push(instance);
		};

		if (Array.isArray(asset)) {
			for (const instance of asset) addAsset(instance);
		} else {
			addAsset(asset);
		}
	}

	return created;
}

function createParticleSystem({
	positions,
	velocities,
	sizes,
	count,
	drag = 0.98
}) {
	return {
		positions,
		velocities,
		sizes,
		count,
		drag,
		init(initializerFn) {
			if (typeof initializerFn !== 'function') return;
			for (let i = 0; i < this.count; i++) {
				initializerFn(i, this);
			}
		},
		update(dt) {
			if (!this.positions || !this.velocities) return;
			for (let i = 0; i < this.count; i++) {
				const idx = i * 3;
				this.positions[idx] += this.velocities[idx] * dt;
				this.positions[idx + 1] += this.velocities[idx + 1] * dt;
				this.positions[idx + 2] += this.velocities[idx + 2] * dt;

				this.velocities[idx] *= this.drag;
				this.velocities[idx + 1] *= this.drag;
				this.velocities[idx + 2] *= this.drag;
			}
		},
		markDirty(geometry) {
			if (!geometry?.attributes) return;
			if (geometry.attributes.position) {
				geometry.attributes.position.needsUpdate = true;
			}
			if (geometry.attributes.aSize) {
				geometry.attributes.aSize.needsUpdate = true;
			}
		}
	};
}

function captureObjectState(object3d) {
	if (!object3d) return null;
	return {
		visible: object3d.visible,
		position: object3d.position?.clone?.(),
		rotation: object3d.rotation?.clone?.(),
		scale: object3d.scale?.clone?.()
	};
}

function disposeMaterial(material) {
	if (!material) return;
	for (const key in material) {
		const value = material[key];
		if (value?.isTexture) value.dispose();
	}
	material.dispose?.();
}

function createGoalAnimationRuntime(config = {}) {
	const runtime = {
		config,
		duration: config.duration ?? 5.0,
		elapsed: 0.0,
		progress: 0.0,
		active: false,
		color: new THREE.Color(0xffffff),
		baseColor: new THREE.Color(config.baseColor ?? 0xffffff),
		visual: new THREE.Group(),
		autoParticles: config.autoParticles ?? true,
		configuredParticleSystems: [],
		assetInitialStates: new Map(),
		uniforms: null,
		ringUniforms: null,
		particleUniforms: null
	};
	runtime.markParticleBuffersDirty = () =>
		markRuntimeParticleBuffersDirty(runtime);

	buildRuntimeFromConfig(runtime);
	refreshAssetInitialStates(runtime);
	if (runtime.visual) runtime.visual.visible = false;
	return runtime;
}

function buildRuntimeFromConfig(runtime) {
	runtime.visual = new THREE.Group();

	const shaders = runtime.config.shaders ?? {};
	const coreShader = ShaderRepository.resolveShaderPair(shaders.core);
	const ringShader = ShaderRepository.resolveShaderPair(
		shaders.ring,
		'STANDARD_RING_SHADER'
	);
	const particleShader = ShaderRepository.resolveShaderPair(
		shaders.particles,
		'STANDARD_PARTICLE_SHADER'
	);

	const bundle = createGoalMaterialBundle({
		vertexShader: coreShader.vertexShader,
		fragmentShader: coreShader.fragmentShader,
		ringVertexShader: ringShader.vertexShader,
		ringFragmentShader: ringShader.fragmentShader,
		particleVertexShader: particleShader.vertexShader,
		particleFragmentShader: particleShader.fragmentShader,
		features: {
			core: resolveConfigFeatures(shaders.core),
			ring: resolveConfigFeatures(shaders.ring),
			particles: resolveConfigFeatures(shaders.particles)
		},
		coreUniforms: cloneUniformMap(runtime.config.uniforms?.core),
		ringUniforms: cloneUniformMap(runtime.config.uniforms?.ring),
		particleUniforms: cloneUniformMap(runtime.config.uniforms?.particles),
		materialOptions: runtime.config.materialOptions ?? {}
	});

	runtime.uniforms = bundle.uniforms;
	runtime.ringUniforms = bundle.ringUniforms;
	runtime.particleUniforms = bundle.particleUniforms;

	createAssetsFromConfig({
		animation: runtime,
		assets: runtime.config.assets ?? [],
		materials: bundle.materials
	});

	createRuntimeParticleSystems(runtime, runtime.config.particleSystems ?? []);

	if (typeof runtime.config.setup === 'function') {
		runtime.config.setup(runtime, bundle.materials);
	}
}

function createRuntimeParticleSystems(runtime, particleSystemConfigs = []) {
	runtime.configuredParticleSystems = [];

	for (const config of particleSystemConfigs) {
		const pointsKey = config.pointsKey;
		if (!pointsKey) continue;

		const points = runtime[pointsKey];
		if (!points) continue;

		const prefix = pointsKey.endsWith('Points')
			? pointsKey.slice(0, -6)
			: pointsKey;
		const positions = runtime[`${prefix}Positions`];
		const velocities = runtime[`${prefix}Velocities`];
		const sizes = runtime[`${prefix}Sizes`];
		const count =
			runtime[`${prefix}Count`] ?? (positions ? positions.length / 3 : 0);

		if (!positions || !velocities || !count) continue;

		const system = createParticleSystem({
			positions,
			velocities,
			sizes,
			count,
			drag: config.drag ?? 0.98
		});

		const systemKey = config.systemKey ?? `${prefix}System`;
		runtime[systemKey] = system;

		runtime.configuredParticleSystems.push({
			system,
			systemKey,
			pointsKey,
			autoUpdate: config.autoUpdate !== false
		});
	}
}

function refreshAssetInitialStates(runtime) {
	runtime.assetInitialStates.clear();

	const trackedKeys = (runtime.config.assets ?? [])
		.map((asset) => asset?.key)
		.filter(Boolean);

	for (const key of trackedKeys) {
		const object3d = runtime[key];
		const state = captureObjectState(object3d);
		if (state) runtime.assetInitialStates.set(key, state);
	}
}

function applyColorToUniforms(uniforms, color) {
	if (uniforms?.uColor) uniforms.uColor.value.set(color);
}

function applyColor(runtime, color) {
	applyColorToUniforms(runtime.uniforms, color);
	applyColorToUniforms(runtime.ringUniforms, color);
	applyColorToUniforms(runtime.particleUniforms, color);
}

function updateUniformGroup(uniforms, dt, progress) {
	if (uniforms?.uTime) uniforms.uTime.value += dt;
	if (uniforms?.uProgress) uniforms.uProgress.value = progress;
}

function updateUniforms(runtime, dt, progress) {
	updateUniformGroup(runtime.uniforms, dt, progress);
	updateUniformGroup(runtime.ringUniforms, dt, progress);
	updateUniformGroup(runtime.particleUniforms, dt, progress);
}

function updateRuntimeParticleSystems(runtime, dt) {
	for (const entry of runtime.configuredParticleSystems) {
		if (!entry.autoUpdate) continue;
		const points = runtime[entry.pointsKey];
		if (!points?.geometry) continue;
		entry.system.update(dt);
		entry.system.markDirty(points.geometry);
	}
}

function resetRuntimeCommonState(runtime) {
	for (const uniforms of [
		runtime.uniforms,
		runtime.ringUniforms,
		runtime.particleUniforms
	]) {
		if (uniforms?.uProgress) uniforms.uProgress.value = 0.0;
	}

	for (const [key, state] of runtime.assetInitialStates.entries()) {
		const object3d = runtime[key];
		if (!object3d || !state) continue;
		applyVector(object3d.position, state.position);
		applyVector(object3d.rotation, state.rotation);
		applyVector(object3d.scale, state.scale);
		object3d.visible = state.visible;
	}

	if (typeof runtime.config.resetCommonState === 'function') {
		runtime.config.resetCommonState(runtime);
	}
}

function markRuntimeParticleBuffersDirty(runtime) {
	for (const entry of runtime.configuredParticleSystems) {
		const points = runtime[entry.pointsKey];
		entry.system.markDirty(points?.geometry);
	}

	if (typeof runtime.config.markParticleBuffersDirty === 'function') {
		runtime.config.markParticleBuffersDirty(runtime);
	}
}

function triggerRuntime(runtime, position, color) {
	runtime.elapsed = 0.0;
	runtime.progress = 0.0;
	runtime.active = true;

	if (runtime.visual) {
		runtime.visual.visible = true;
		runtime.visual.position.copy(position);
	}

	if (color !== undefined && color !== null) {
		runtime.color.set(color);
	} else {
		runtime.color.copy(runtime.baseColor);
	}

	applyColor(runtime, runtime.color);
	resetRuntimeCommonState(runtime);

	if (typeof runtime.config.configureVisibility === 'function') {
		runtime.config.configureVisibility(runtime);
	}
	if (typeof runtime.config.initParticles === 'function') {
		runtime.config.initParticles(runtime);
	}
	if (typeof runtime.config.afterTrigger === 'function') {
		runtime.config.afterTrigger(runtime);
	}

	markRuntimeParticleBuffersDirty(runtime);
}

function updateRuntime(runtime, dt) {
	if (!runtime.active) return;

	runtime.elapsed += dt;
	runtime.progress = Math.min(1.0, runtime.elapsed / runtime.duration);

	updateUniforms(runtime, dt, runtime.progress);
	if (runtime.autoParticles) {
		updateRuntimeParticleSystems(runtime, dt);
	}
	if (typeof runtime.config.onUpdate === 'function') {
		runtime.config.onUpdate(runtime, dt, runtime.progress);
	}

	if (runtime.progress >= 1.0) {
		runtime.active = false;
		if (runtime.visual) runtime.visual.visible = false;
	}
}

function disposeRuntime(runtime) {
	runtime.active = false;
	if (!runtime.visual) return;

	runtime.visual.traverse((object3d) => {
		if (object3d.geometry?.dispose) {
			object3d.geometry.dispose();
		}
		if (Array.isArray(object3d.material)) {
			for (const material of object3d.material) {
				disposeMaterial(material);
			}
		} else {
			disposeMaterial(object3d.material);
		}
	});
}

export class GoalAnimationSpawner {
	/*
	//GoalAnimationSpawner Usage Guide:
	
	//SETUP
	//Create the spawner instance
	const goalSpawner = new GoalAnimationSpawner();
	//Add the visual group to your scene so it renders
	scene.add(goalSpawner.visual);
	
	//USE
	//Spawns a goal Explosion. 
	//First value is "Which" explosion based off of GOAL_ANIMATION_CONFIGS.
	//Second value is color of explosion to spawn.
	//Third value is the vec3 of where the exposion is to be spawned.
	goalSpawner.triggerGoalAnimation(
		1,
		new THREE.Color(0xff0000),
		new THREE.Vector3(0, 0, -10)
	);
	
	//Call this in the higher-level update function to progress the goal explosion through its animation
	goalSpawner.update(dt);
	
	//USEFUL MEMBERS
	//goalSpawner.active -> bool that is true only while an animation is playing. It is false if the animation has finished or not started
	//goalSpawner.progress -> number between 0.0 and 1.0 that is the completion percentage of the animation 
	*/
	constructor() {
		this.visual = new THREE.Group();
		this.visual.visible = true;
		this.active = false;
		this.progress = 0.0;
		this.color = new THREE.Color(0xffffff);
		this.currentAnimation = null;
	}

	#resolveAnimation(styleIndex) {
		const config = resolveGoalAnimationConfig(styleIndex);

		if (this.currentAnimation?.config?.styleIndex !== config.styleIndex) {
			if (this.currentAnimation?.visual) {
				this.currentAnimation.active = false;
				this.currentAnimation.visual.visible = false;
				this.visual.remove(this.currentAnimation.visual);
			}
			if (this.currentAnimation) {
				disposeRuntime(this.currentAnimation);
			}

			this.currentAnimation = createGoalAnimationRuntime(config);
			this.visual.add(this.currentAnimation.visual);
		}

		return this.currentAnimation;
	}

	triggerGoalAnimation(styleIndex, color, position) {
		const instance = this.#resolveAnimation(styleIndex);
		if (!instance) return null;

		const spawnPosition = toVector3(position);
		triggerRuntime(instance, spawnPosition, color);
		this.active = true;
		this.progress = instance.progress;
		this.color.copy(instance.color);
		return instance;
	}

	update(dt) {
		if (!this.currentAnimation) {
			this.active = false;
			this.progress = 0.0;
			return;
		}

		updateRuntime(this.currentAnimation, dt);
		this.active = this.currentAnimation.active;
		this.progress = this.currentAnimation.progress;
		this.color.copy(this.currentAnimation.color);
	}
}
