import * as THREE from 'three';
import { GoalAnimationSystem } from './goalAnimationSystem.js';
import { GoalAssetFactory } from './goalAssetFactory.js';
import { GoalParticleSystem } from './goalParticleSystem.js';
import { createGoalMaterialBundle } from './goalMaterialBuilder.js';
import { ShaderRepository } from './shaderLibrary.js';
import { TWEEN } from './tweening.js';

const DEFAULT_EASING = TWEEN.Easing.Linear.None;

function cloneUniformMap(uniforms = {}) {
	return THREE.UniformsUtils.clone(uniforms ?? {});
}

function resolveFeatures(configFeatures, shaderDefinition, key) {
	if (Array.isArray(shaderDefinition?.features)) {
		return shaderDefinition.features;
	}
	if (Array.isArray(configFeatures)) {
		return configFeatures;
	}
	if (configFeatures && typeof configFeatures === 'object') {
		return configFeatures[key] ?? configFeatures.default ?? [];
	}
	return [];
}

function resolveEasing(easing) {
	if (typeof easing === 'function') return easing;
	if (typeof easing !== 'string') return DEFAULT_EASING;

	const parts = easing.split('.');
	let current = TWEEN.Easing;
	for (const part of parts) {
		current = current?.[part];
	}
	return typeof current === 'function' ? current : DEFAULT_EASING;
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

function normalizeScaleCurveEntries(scaleCurves) {
	if (!scaleCurves) return [];
	if (Array.isArray(scaleCurves)) return scaleCurves;
	return Object.entries(scaleCurves).map(([target, rule]) => ({
		target,
		...(typeof rule === 'number' ? { to: rule } : rule)
	}));
}

function normalizeRotationEntries(rotationSpeeds) {
	if (!rotationSpeeds) return [];
	if (Array.isArray(rotationSpeeds)) return rotationSpeeds;
	return Object.entries(rotationSpeeds).map(([target, speed]) => ({
		target,
		...(typeof speed === 'number' ? { x: 0, y: speed, z: 0 } : speed)
	}));
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

export class ConfigurableGoalAnimation extends GoalAnimationSystem {
	constructor(config = {}) {
		super(config.styleIndex ?? 0, config.duration ?? 5.0);

		this.config = config;
		this.animationId = config.id ?? `ANIMATION_${config.styleIndex ?? 0}`;
		this.baseColor = new THREE.Color(config.baseColor ?? 0xffffff);
		this.autoParticles = config.autoParticles ?? true;
		this.configuredParticleSystems = [];
		this.assetInitialStates = new Map();

		this.buildFromConfig();
		this.refreshAssetInitialStates();
		if (this.visual) this.visual.visible = false;
	}

	buildFromConfig() {
		this.visual = new THREE.Group();

		const shaders = this.config.shaders ?? {};
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
				core: resolveFeatures(this.config.features, shaders.core, 'core'),
				ring: resolveFeatures(this.config.features, shaders.ring, 'ring'),
				particles: resolveFeatures(
					this.config.features,
					shaders.particles,
					'particles'
				)
			},
			coreUniforms: cloneUniformMap(this.config.uniforms?.core),
			ringUniforms: cloneUniformMap(this.config.uniforms?.ring),
			particleUniforms: cloneUniformMap(this.config.uniforms?.particles),
			materialOptions: this.config.materialOptions ?? {}
		});

		this.uniforms = bundle.uniforms;
		this.ringUniforms = bundle.ringUniforms;
		this.particleUniforms = bundle.particleUniforms;
		this.materials = bundle.materials;

		GoalAssetFactory.createAssetsFromConfig({
			animation: this,
			assets: this.config.assets ?? [],
			materials: bundle.materials
		});

		this.createParticleSystems(this.config.particleSystems ?? []);

		if (typeof this.config.setup === 'function') {
			this.config.setup(this, bundle.materials);
		}
		if (typeof this.config.patchMaterials === 'function') {
			this.config.patchMaterials(this, bundle.materials);
		}
	}

	createParticleSystems(particleSystemConfigs = []) {
		this.configuredParticleSystems = [];

		for (const config of particleSystemConfigs) {
			const pointsKey = config.pointsKey;
			if (!pointsKey) continue;

			const points = this[pointsKey];
			if (!points) continue;

			const prefix =
				config.prefix ??
				(pointsKey.endsWith('Points') ? pointsKey.slice(0, -6) : pointsKey);
			const positions = this[config.positionsKey ?? `${prefix}Positions`];
			const velocities = this[config.velocitiesKey ?? `${prefix}Velocities`];
			const sizes = this[config.sizesKey ?? `${prefix}Sizes`];
			const count =
				this[config.countKey ?? `${prefix}Count`] ??
				(positions ? positions.length / 3 : 0);

			if (!positions || !velocities || !count) continue;

			const system = new GoalParticleSystem({
				positions,
				velocities,
				sizes,
				count,
				drag: config.drag ?? 0.98
			});

			const systemKey = config.systemKey ?? `${prefix}System`;
			this[systemKey] = system;

			this.configuredParticleSystems.push({
				system,
				systemKey,
				pointsKey,
				autoUpdate: config.autoUpdate !== false
			});
		}
	}

	refreshAssetInitialStates() {
		this.assetInitialStates.clear();

		const trackedKeys = new Set(
			(this.config.assets ?? []).map((asset) => asset?.key).filter(Boolean)
		);

		for (const key of this.config.additionalTrackedAssets ?? []) {
			trackedKeys.add(key);
		}

		for (const key of trackedKeys) {
			const object3d = this[key];
			const state = captureObjectState(object3d);
			if (state) this.assetInitialStates.set(key, state);
		}
	}

	configureVisibility() {
		if (typeof this.config.configureVisibility === 'function') {
			this.config.configureVisibility(this);
		}
	}

	initParticles() {
		if (typeof this.config.initParticles === 'function') {
			this.config.initParticles(this);
			return;
		}

		for (const initializer of this.config.particleInitializers ?? []) {
			const system = this[initializer.systemKey];
			if (!system || typeof initializer.init !== 'function') continue;
			system.init((i, particleSystem) =>
				initializer.init(i, particleSystem, this)
			);
		}
	}

	afterTrigger() {
		if (typeof this.config.afterTrigger === 'function') {
			this.config.afterTrigger(this);
		}
	}

	updateParticleSystems(dt) {
		if (typeof this.config.updateParticleSystems === 'function') {
			this.config.updateParticleSystems(this, dt);
			return;
		}

		for (const entry of this.configuredParticleSystems) {
			if (!entry.autoUpdate) continue;
			const points = this[entry.pointsKey];
			if (!points?.geometry) continue;
			entry.system.update(dt);
			entry.system.markDirty(points.geometry);
		}
	}

	applyConfiguredBehavior(dt, progress) {
		const behavior = this.config.behavior;
		if (!behavior) return;

		for (const rule of normalizeScaleCurveEntries(behavior.scaleCurves)) {
			const target = this[rule.target];
			if (!target?.scale) continue;
			const easing = resolveEasing(rule.easing);
			const eased = easing(progress);
			const from = rule.from ?? 1.0;
			const to = rule.to ?? from;
			const scalar = from + (to - from) * eased;
			if (rule.multiplier && typeof rule.multiplier === 'object') {
				target.scale.set(
					scalar * (rule.multiplier.x ?? 1.0),
					scalar * (rule.multiplier.y ?? 1.0),
					scalar * (rule.multiplier.z ?? 1.0)
				);
			} else {
				target.scale.setScalar(scalar * (rule.multiplier ?? 1.0));
			}
		}

		for (const rule of normalizeRotationEntries(behavior.rotationSpeeds)) {
			const target = this[rule.target];
			if (!target?.rotation) continue;
			target.rotation.x += (rule.x ?? 0) * dt;
			target.rotation.y += (rule.y ?? 0) * dt;
			target.rotation.z += (rule.z ?? 0) * dt;
		}
	}

	onUpdate(dt, progress) {
		this.applyConfiguredBehavior(dt, progress);
		if (typeof this.config.onUpdate === 'function') {
			this.config.onUpdate(this, dt, progress);
		}
	}

	resetCommonState() {
		super.resetCommonState();

		for (const [key, state] of this.assetInitialStates.entries()) {
			const object3d = this[key];
			if (!object3d || !state) continue;
			applyVector(object3d.position, state.position);
			applyVector(object3d.rotation, state.rotation);
			applyVector(object3d.scale, state.scale);
			object3d.visible = state.visible;
		}

		if (typeof this.config.resetCommonState === 'function') {
			this.config.resetCommonState(this);
		}
	}

	markParticleBuffersDirty() {
		super.markParticleBuffersDirty();
		if (typeof this.config.markParticleBuffersDirty === 'function') {
			this.config.markParticleBuffersDirty(this);
		}
	}
}
