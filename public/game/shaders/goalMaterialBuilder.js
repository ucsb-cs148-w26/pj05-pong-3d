import * as THREE from 'three';
import { ShaderLibrary, joinShaderChunks } from './shaderLibrary.js';

const FEATURE_CHUNKS = {
	math: ShaderLibrary.MathChunks,
	noise: ShaderLibrary.NoiseChunks,
	lighting: ShaderLibrary.LightingChunks,
	physics: ShaderLibrary.PhysicsChunks
};

function buildShader(chunks, source) {
	return `${chunks}\n${source}`;
}

function resolveFeatures(features, key) {
	if (Array.isArray(features)) return features;
	if (features && typeof features === 'object') {
		return features[key] ?? features.default ?? [];
	}
	return [];
}

function resolveMaterialOptions(materialOptions, key) {
	if (!materialOptions || Array.isArray(materialOptions)) return {};
	const hasPerMaterialOptions =
		Object.hasOwn(materialOptions, 'core') ||
		Object.hasOwn(materialOptions, 'ring') ||
		Object.hasOwn(materialOptions, 'particles') ||
		Object.hasOwn(materialOptions, 'default');
	if (!hasPerMaterialOptions) {
		return materialOptions;
	}
	return {
		...(materialOptions.default ?? {}),
		...(materialOptions[key] ?? {})
	};
}

export function createGoalMaterial({
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

	const materialParams = {
		uniforms,
		vertexShader: buildShader(chunkSource, vertexShader),
		fragmentShader: buildShader(chunkSource, fragmentShader),
		transparent,
		depthWrite,
		blending
	};
	if (side !== undefined) materialParams.side = side;

	const material = new THREE.ShaderMaterial(materialParams);

	return material;
}

export function createGoalMaterialBundle({
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

	const material = createGoalMaterial({
		vertexShader,
		fragmentShader,
		uniforms,
		features: resolveFeatures(features, 'core'),
		...resolveMaterialOptions(materialOptions, 'core')
	});

	const ringMaterial = createGoalMaterial({
		vertexShader: ringVertexShader,
		fragmentShader: ringFragmentShader,
		uniforms: ringUniformsFinal,
		features: resolveFeatures(features, 'ring'),
		...resolveMaterialOptions(materialOptions, 'ring')
	});

	const particleMaterial = createGoalMaterial({
		vertexShader: particleVertexShader,
		fragmentShader: particleFragmentShader,
		uniforms: particleUniformsFinal,
		features: resolveFeatures(features, 'particles'),
		...resolveMaterialOptions(materialOptions, 'particles')
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
