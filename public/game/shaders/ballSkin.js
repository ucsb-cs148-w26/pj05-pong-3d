import * as THREE from 'three';
import * as Constants from '../constants.js';
import {
	ShaderLibrary,
	ShaderRepository,
	joinShaderChunks
} from './shaderLibrary.js';

const textureLoader = new THREE.TextureLoader();

const DEFAULT_MATERIAL_OPTIONS = {
	metalness: 0.0,
	roughness: 0.8,
	envMapIntensity: 1.0,
	emissive: 0x000000,
	emissiveIntensity: 0.0
};

const DEFAULT_SHADER_MATERIAL_OPTIONS = {
	transparent: false,
	depthWrite: true,
	side: THREE.FrontSide,
	blending: THREE.NormalBlending
};

const DEFAULT_SHADER_PROFILE = {
	patternType: 0,
	accentColor: 0xffffff,
	accentColor2: 0xffffff,
	paramsA: [3.0, 2.6, 8.0, 6.0],
	paramsB: [2.4, 5.4, 4.0, 8.0],
	glowStrength: 0.55,
	rimPower: 2.35,
	displacement: 0.01,
	animationSpeed: 1.0,
	depthStrength: 0.22,
	depthDensity: 1.0,
	shapeType: 0,
	shapeAmount: 0.0,
	shapeParamsA: [2.0, 2.0, 0.04, 1.0],
	shapeParamsB: [1.0, 2.0, 0.0, 0.0],
	interiorScale: 3.2,
	interiorFlow: 1.0,
	interiorShapeType: 0,
	glassFresnelPower: 3.1,
	glassClarity: 0.6,
	swirlStrength: 1.0,
	highlightStrength: 1.0,
	specularStrength: 1.0,
	fresnelStrength: 1.0
};

const FEATURE_CHUNKS = {
	math: ShaderLibrary.MathChunks,
	noise: ShaderLibrary.NoiseChunks
};

const DEFAULT_BALL_SHADER_TEMPLATE = Object.freeze({
	template: 'STANDARD_BALL_SKIN_SHADER',
	features: Object.freeze(['math', 'noise'])
});

function createStyleTexture(styleConfig) {
	if (!styleConfig?.textureUrl) return null;
	const texture = textureLoader.load(styleConfig.textureUrl);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 8;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	return texture;
}

function applyMaterialOptions(material, styleConfig = {}) {
	const options = {
		...DEFAULT_MATERIAL_OPTIONS,
		...(styleConfig.materialOptions ?? {})
	};

	material.metalness = options.metalness;
	material.roughness = options.roughness;
	material.envMapIntensity = options.envMapIntensity;
	material.emissive.set(options.emissive ?? 0x000000);
	material.emissiveIntensity = options.emissiveIntensity ?? 0.0;
}

function createShaderUniforms(tintColor, shaderProfile, radius) {
	return {
		uTime: { value: 0.0 },
		uMotionIntensity: { value: 0.0 },
		uPatternType: { value: shaderProfile.patternType },
		uGlowStrength: { value: shaderProfile.glowStrength },
		uRimPower: { value: shaderProfile.rimPower },
		uDisplacement: { value: shaderProfile.displacement },
		uAnimationSpeed: { value: shaderProfile.animationSpeed },
		uDepthStrength: { value: shaderProfile.depthStrength },
		uDepthDensity: { value: shaderProfile.depthDensity },
		uShapeType: { value: shaderProfile.shapeType },
		uShapeAmount: { value: shaderProfile.shapeAmount },
		uShapeParamsA: {
			value: new THREE.Vector4(...shaderProfile.shapeParamsA)
		},
		uShapeParamsB: {
			value: new THREE.Vector4(...shaderProfile.shapeParamsB)
		},
		uInteriorScale: { value: shaderProfile.interiorScale },
		uInteriorFlow: { value: shaderProfile.interiorFlow },
		uInteriorShapeType: { value: shaderProfile.interiorShapeType },
		uGlassFresnelPower: { value: shaderProfile.glassFresnelPower },
		uGlassClarity: { value: shaderProfile.glassClarity },
		uSwirlStrength: { value: shaderProfile.swirlStrength },
		uHighlightStrength: { value: shaderProfile.highlightStrength },
		uSpecularStrength: { value: shaderProfile.specularStrength },
		uFresnelStrength: { value: shaderProfile.fresnelStrength },
		uTint: { value: tintColor.clone() },
		uAccent: { value: new THREE.Color(shaderProfile.accentColor ?? 0xffffff) },
		uAccent2: {
			value: new THREE.Color(shaderProfile.accentColor2 ?? 0xffffff)
		},
		uSphereCenter: { value: new THREE.Vector3(0, 0, 0) },
		uSphereRadius: { value: radius },
		uParamsA: {
			value: new THREE.Vector4(...shaderProfile.paramsA)
		},
		uParamsB: {
			value: new THREE.Vector4(...shaderProfile.paramsB)
		}
	};
}

function resolveShaderFeatures(shaderDefinition) {
	if (Array.isArray(shaderDefinition?.features)) {
		return shaderDefinition.features;
	}
	return [];
}

function createStyleMaterial(styleConfig, radius) {
	const tintColor = new THREE.Color(styleConfig.baseColor ?? 0xffffff);
	if (!styleConfig.shaderProfile) {
		const material = new THREE.MeshStandardMaterial({ color: tintColor });
		applyMaterialOptions(material, styleConfig);
		const texture = createStyleTexture(styleConfig);
		if (texture) {
			material.map = texture;
			material.color.set(0xffffff);
			material.needsUpdate = true;
		}
		return { material, uniforms: null, texture };
	}

	const profile = {
		...DEFAULT_SHADER_PROFILE,
		...styleConfig.shaderProfile
	};

	const uniforms = createShaderUniforms(tintColor, profile, radius);
	const shaderDefinition = styleConfig.shaders ?? DEFAULT_BALL_SHADER_TEMPLATE;
	const shaderPair = ShaderRepository.resolveShaderPair(shaderDefinition);
	const chunks = joinShaderChunks(
		...resolveShaderFeatures(shaderDefinition)
			.map((feature) => FEATURE_CHUNKS[feature])
			.filter(Boolean)
	);
	const shaderMaterialOptions = {
		...DEFAULT_SHADER_MATERIAL_OPTIONS,
		...(styleConfig.shaderMaterialOptions ?? {})
	};
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: `${chunks}\n${shaderPair.vertexShader}`,
		fragmentShader: `${chunks}\n${shaderPair.fragmentShader}`,
		...shaderMaterialOptions
	});

	return { material, uniforms, texture: null };
}

const DEFAULT_CONFIG = {
	styleIndex: 0,
	label: 'Classic',
	baseColor: 0xffffff,
	materialOptions: {
		metalness: 0.0,
		roughness: 0.7,
		envMapIntensity: 0.6
	}
};

const BASKETBALL_CONFIG = {
	styleIndex: 1,
	label: 'Basketball',
	baseColor: 0xffffff,
	textureUrl: '/textures/basketball.png',
	materialOptions: {
		metalness: 0.0,
		roughness: 0.9,
		envMapIntensity: 0.2
	}
};

const PIXEL_CONFIG = {
	styleIndex: 2,
	label: 'Pixel',
	baseColor: 0x7cf0ff,
	materialOptions: {
		metalness: 0.02,
		roughness: 0.42,
		envMapIntensity: 0.68,
		emissive: 0x0f2f35,
		emissiveIntensity: 0.07
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 7,
		accentColor: 0x6ec6ff,
		accentColor2: 0xffe8ff,
		paramsA: [3.0, 2.6, 8.0, 6.0],
		paramsB: [2.8, 5.8, 4.0, 12.0],
		glowStrength: 0.58,
		rimPower: 2.2,
		displacement: 0.007,
		animationSpeed: 0.9,
		interiorShapeType: 5,
		swirlStrength: 0.0
	}
};

export const BALL_SKIN_CONFIGS = [
	DEFAULT_CONFIG,
	BASKETBALL_CONFIG,
	PIXEL_CONFIG
];

export const BALL_SKIN_STYLES = BALL_SKIN_CONFIGS.map((config) => ({
	styleIndex: config.styleIndex,
	label: config.label
}));

const DEFAULT_BALL_SKIN_CONFIG = BALL_SKIN_CONFIGS[0];
const DEFAULT_BALL_STYLE_INDEX = DEFAULT_BALL_SKIN_CONFIG?.styleIndex ?? 0;
const BALL_CONFIG_BY_STYLE_INDEX = new Map(
	BALL_SKIN_CONFIGS.map((config) => [config.styleIndex, config])
);

export function resolveBallSkinConfig(styleIndex) {
	if (!Number.isFinite(styleIndex)) {
		return DEFAULT_BALL_SKIN_CONFIG;
	}
	return BALL_CONFIG_BY_STYLE_INDEX.get(styleIndex) ?? DEFAULT_BALL_SKIN_CONFIG;
}

export class BallSkin {
	#geometry = null;
	#material = null;
	#texture = null;
	#mesh = null;
	#uniforms = null;
	#styleConfig = null;
	#radius = Constants.BALL_RADIUS;
	#worldCenter = new THREE.Vector3();
	#worldScale = new THREE.Vector3(1, 1, 1);

	constructor({
		radius = Constants.BALL_RADIUS,
		widthSegments = 32,
		heightSegments = 24,
		styleIndex = DEFAULT_BALL_STYLE_INDEX
	} = {}) {
		this.#radius = radius;
		this.#geometry = new THREE.SphereGeometry(
			radius,
			widthSegments,
			heightSegments
		);
		const initialStyle = resolveBallSkinConfig(styleIndex);
		const { material, uniforms, texture } = createStyleMaterial(
			initialStyle,
			this.#radius
		);
		this.#styleConfig = initialStyle;
		this.#material = material;
		this.#texture = texture;
		this.#uniforms = uniforms;
		this.#mesh = new THREE.Mesh(this.#geometry, material);
		this.#mesh.castShadow = true;
		this.#mesh.receiveShadow = true;
		this.#syncDepthUniforms();
	}

	get visual() {
		return this.#mesh;
	}

	get styleIndex() {
		return this.#styleConfig?.styleIndex ?? DEFAULT_BALL_STYLE_INDEX;
	}

	update(dt, speed = 0.0) {
		if (!this.#uniforms) return;

		this.#uniforms.uTime.value += dt;
		this.#uniforms.uMotionIntensity.value = THREE.MathUtils.clamp(
			speed / 7.0,
			0.0,
			1.8
		);
		this.#syncDepthUniforms();
	}

	setStyle(styleIndex) {
		const styleConfig = resolveBallSkinConfig(styleIndex);
		const { material, uniforms, texture } = createStyleMaterial(
			styleConfig,
			this.#radius
		);
		this.#styleConfig = styleConfig;
		this.#texture?.dispose?.();
		this.#material?.dispose?.();
		this.#material = material;
		this.#texture = texture;
		this.#uniforms = uniforms;
		this.#mesh.material = material;
		this.#syncDepthUniforms();

		return styleConfig;
	}

	#syncDepthUniforms() {
		if (!this.#uniforms) return;
		if (!this.#uniforms.uSphereCenter || !this.#uniforms.uSphereRadius) return;

		this.#mesh.getWorldPosition(this.#worldCenter);
		this.#mesh.getWorldScale(this.#worldScale);

		const maxScale = Math.max(
			Math.abs(this.#worldScale.x),
			Math.abs(this.#worldScale.y),
			Math.abs(this.#worldScale.z),
			0.0001
		);

		this.#uniforms.uSphereCenter.value.copy(this.#worldCenter);
		this.#uniforms.uSphereRadius.value = this.#radius * maxScale;
	}
}
