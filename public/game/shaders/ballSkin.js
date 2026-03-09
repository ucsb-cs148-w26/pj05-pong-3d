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

const HOTSPOT_CONFIG = {
	styleIndex: 3,
	label: 'Hotspot',
	baseColor: 0xd9b95f,
	materialOptions: {
		metalness: 0.26,
		roughness: 0.14,
		envMapIntensity: 1.08,
		emissive: 0x21170a,
		emissiveIntensity: 0.12
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 4,
		accentColor: 0xf0d384,
		accentColor2: 0xfffff2,
		paramsA: [4.4, 3.8, 10.4, 8.2],
		paramsB: [3.5, 7.5, 5.2, 11.0],
		glowStrength: 0.52,
		rimPower: 2.5,
		displacement: 0.011,
		animationSpeed: 1.08
	}
};

const GLACIAL_CONFIG = {
	styleIndex: 4,
	label: 'Glacial',
	baseColor: 0x87b8de,
	materialOptions: {
		metalness: 0.16,
		roughness: 0.16,
		envMapIntensity: 1.22,
		emissive: 0x132238,
		emissiveIntensity: 0.1
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 9,
		accentColor: 0x8dc5ff,
		accentColor2: 0xdff2ff,
		paramsA: [4.4, 3.8, 11.4, 8.6],
		paramsB: [3.0, 6.9, 5.4, 10.4],
		glowStrength: 0.52,
		rimPower: 3.05,
		displacement: 0.01,
		animationSpeed: 0.9,
		depthStrength: 1.06,
		depthDensity: 1.05,
		interiorScale: 4.2,
		interiorFlow: 0.84,
		interiorShapeType: 3,
		glassFresnelPower: 3.6,
		glassClarity: 0.88,
		highlightStrength: 0.0,
		specularStrength: 0.0,
		fresnelStrength: 0.0
	}
};

const SUNKEN_CONFIG = {
	styleIndex: 5,
	label: 'Sunken',
	baseColor: 0x5576b8,
	materialOptions: {
		metalness: 0.12,
		roughness: 0.22,
		envMapIntensity: 1.0,
		emissive: 0x121c3a,
		emissiveIntensity: 0.1
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 6,
		accentColor: 0x87b8ff,
		accentColor2: 0xe1eaff,
		paramsA: [2.7, 2.3, 7.6, 6.0],
		paramsB: [1.9, 4.4, 3.2, 7.8],
		glowStrength: 0.58,
		rimPower: 2.95,
		displacement: 0.012,
		animationSpeed: 0.72,
		depthStrength: 1.15,
		depthDensity: 0.92,
		interiorScale: 3.0,
		interiorFlow: 0.58,
		interiorShapeType: 5,
		glassFresnelPower: 3.9,
		glassClarity: 0.94
	}
};

const COSMIC_ECHOES_CONFIG = {
	styleIndex: 6,
	label: 'Cosmic Echoes',
	baseColor: 0x4e78d3,
	materialOptions: {
		metalness: 0.2,
		roughness: 0.12,
		envMapIntensity: 1.3,
		emissive: 0x0f173f,
		emissiveIntensity: 0.16
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 8,
		accentColor: 0x7bb4ff,
		accentColor2: 0xffffff,
		paramsA: [4.6, 4.0, 12.2, 9.5],
		paramsB: [3.4, 7.8, 5.6, 11.6],
		glowStrength: 0.92,
		rimPower: 2.85,
		displacement: 0.014,
		animationSpeed: 1.22,
		depthStrength: 1.35,
		depthDensity: 1.1,
		interiorScale: 4.4,
		interiorFlow: 1.36,
		interiorShapeType: 2,
		glassFresnelPower: 3.4,
		glassClarity: 0.9
	}
};

const SPIRAL_GALAXY_CONFIG = {
	styleIndex: 7,
	label: 'Spiral Galaxy',
	baseColor: 0x8ec6ff,
	materialOptions: {
		metalness: 0.22,
		roughness: 0.1,
		envMapIntensity: 1.36,
		emissive: 0x1e2d47,
		emissiveIntensity: 0.1
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 1,
		accentColor: 0x8fc9ff,
		accentColor2: 0xfff4cc,
		paramsA: [3.8, 3.3, 10.6, 8.1],
		paramsB: [3.1, 6.7, 4.9, 9.9],
		glowStrength: 0.8,
		rimPower: 2.75,
		displacement: 0.011,
		animationSpeed: 1.04,
		depthStrength: 1.12,
		depthDensity: 1.0,
		interiorScale: 4.1,
		interiorFlow: 0.96,
		interiorShapeType: 3,
		glassFresnelPower: 3.7,
		glassClarity: 0.92
	}
};

const MOLTEN_PULSE_CONFIG = {
	styleIndex: 8,
	label: 'Molten Pulse',
	baseColor: 0xca5b33,
	materialOptions: {
		metalness: 0.1,
		roughness: 0.24,
		envMapIntensity: 0.92,
		emissive: 0x381307,
		emissiveIntensity: 0.18
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 3,
		accentColor: 0xff9b64,
		accentColor2: 0xffd39f,
		paramsA: [4.3, 3.8, 10.5, 8.2],
		paramsB: [3.5, 7.0, 5.2, 10.2],
		glowStrength: 0.94,
		rimPower: 2.6,
		displacement: 0.014,
		animationSpeed: 1.28,
		depthStrength: 1.22,
		depthDensity: 1.2,
		interiorScale: 4.3,
		interiorFlow: 1.42,
		interiorShapeType: 2,
		glassFresnelPower: 3.1,
		glassClarity: 0.78
	}
};

const NEON_LATTICE_CONFIG = {
	styleIndex: 9,
	label: 'Neon Lattice',
	baseColor: 0x6a8fd4,
	materialOptions: {
		metalness: 0.2,
		roughness: 0.12,
		envMapIntensity: 1.3,
		emissive: 0x102438,
		emissiveIntensity: 0.14
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 7,
		accentColor: 0x8cb7ff,
		accentColor2: 0xeeffff,
		paramsA: [5.3, 4.5, 13.2, 10.3],
		paramsB: [4.2, 8.9, 6.5, 13.6],
		glowStrength: 0.8,
		rimPower: 2.82,
		displacement: 0.011,
		animationSpeed: 1.26,
		depthStrength: 1.28,
		depthDensity: 1.18,
		interiorScale: 5.2,
		interiorFlow: 1.32,
		interiorShapeType: 3,
		glassFresnelPower: 3.6,
		glassClarity: 0.91,
		swirlStrength: 0.0,
		highlightStrength: 0.0,
		specularStrength: 0.0,
		fresnelStrength: 0.0
	}
};

const FROST_SPIRE_CONFIG = {
	styleIndex: 10,
	label: 'Frost Spire',
	baseColor: 0x95b8ff,
	materialOptions: {
		metalness: 0.16,
		roughness: 0.2,
		envMapIntensity: 1.05,
		emissive: 0x1a274f,
		emissiveIntensity: 0.12
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 4,
		accentColor: 0x95b8ff,
		accentColor2: 0xf0f6ff,
		paramsA: [4.7, 3.9, 11.5, 8.8],
		paramsB: [3.8, 8.2, 5.8, 11.8],
		glowStrength: 0.64,
		rimPower: 2.6,
		displacement: 0.004,
		animationSpeed: 1.18,
		shapeType: 0,
		shapeAmount: 1.0,
		shapeParamsA: [12.0, 11.0, 0.11, 9.0],
		shapeParamsB: [1.4, 7.5, 0.0, 0.0]
	}
};

const SLIME_CONFIG = {
	styleIndex: 11,
	label: 'Slime',
	baseColor: 0x79f56a,
	shaderMaterialOptions: {
		transparent: true,
		depthWrite: false
	},
	materialOptions: {
		metalness: 0.04,
		roughness: 0.28,
		envMapIntensity: 0.92,
		emissive: 0x16380f,
		emissiveIntensity: 0.18
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 10,
		accentColor: 0xa6ff5f,
		accentColor2: 0xb7d590,
		paramsA: [2.4, 2.8, 6.2, 4.8],
		paramsB: [1.7, 3.2, 2.9, 5.8],
		glowStrength: 0.26,
		rimPower: 1.85,
		displacement: 0.012,
		animationSpeed: 0.72,
		depthStrength: 1.02,
		depthDensity: 0.88,
		interiorScale: 2.7,
		interiorFlow: 0.72,
		interiorShapeType: 4,
		glassFresnelPower: 2.45,
		glassClarity: 0.48,
		swirlStrength: 0.22,
		highlightStrength: 0.52,
		specularStrength: 0.62,
		fresnelStrength: 0.9,
		shapeType: 1,
		shapeAmount: 1.15,
		shapeParamsA: [2.4, 3.4, 0.06, 1.9],
		shapeParamsB: [1.4, 2.8, 0.03, 0.0]
	}
};

const PETALS_CONFIG = {
	styleIndex: 12,
	label: 'Petals',
	baseColor: 0xffb8de,
	materialOptions: {
		metalness: 0.06,
		roughness: 0.26,
		envMapIntensity: 0.94,
		emissive: 0x4a2236,
		emissiveIntensity: 0.12
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 5,
		accentColor: 0xffb8de,
		accentColor2: 0xfff2fa,
		paramsA: [2.8, 2.3, 7.5, 5.9],
		paramsB: [2.0, 4.4, 3.4, 7.3],
		glowStrength: 0.7,
		rimPower: 2.5,
		displacement: 0.006,
		animationSpeed: 0.9,
		shapeType: 2,
		shapeAmount: 1.0,
		shapeParamsA: [7.0, 2.4, 0.09, 2.0],
		shapeParamsB: [1.3, 2.2, 0.0, 0.0]
	}
};

const BOILING_SUN_CONFIG = {
	styleIndex: 13,
	label: 'Boiling Sun',
	baseColor: 0xff9d2f,
	materialOptions: {
		metalness: 0.03,
		roughness: 0.56,
		envMapIntensity: 0.64,
		emissive: 0xff4a00,
		emissiveIntensity: 0.56
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 3,
		accentColor: 0xff8f2e,
		accentColor2: 0xfff0a3,
		paramsA: [4.9, 4.1, 12.6, 9.6],
		paramsB: [3.6, 8.2, 6.0, 11.8],
		glowStrength: 1.28,
		rimPower: 2.35,
		displacement: 0.009,
		animationSpeed: 0.65,
		depthStrength: 0.66,
		depthDensity: 1.24,
		interiorScale: 3.8,
		interiorFlow: 1.62,
		interiorShapeType: 2,
		glassFresnelPower: 2.7,
		glassClarity: 0.36,
		highlightStrength: 0.72,
		specularStrength: 0.34,
		fresnelStrength: 0.42,
		shapeType: 3,
		shapeAmount: 1.16,
		shapeParamsA: [9.8, 9.1, 0.14, 8.6],
		shapeParamsB: [0.26, 1.9, 0.0, 0.0]
	}
};

const SUNSET_CONFIG = {
	styleIndex: 14,
	label: 'Sunset',
	baseColor: 0xff7d5e,
	materialOptions: {
		metalness: 0.04,
		roughness: 0.3,
		envMapIntensity: 0.86,
		emissive: 0x2b1633,
		emissiveIntensity: 0.2
	},
	shaders: DEFAULT_BALL_SHADER_TEMPLATE,
	shaderProfile: {
		patternType: 3,
		accentColor: 0xff9b72,
		accentColor2: 0xffd3a8,
		paramsA: [2.9, 2.6, 8.2, 6.6],
		paramsB: [2.5, 5.0, 3.8, 8.0],
		glowStrength: 0.74,
		rimPower: 2.4,
		displacement: 0.01,
		animationSpeed: 1.05
	}
};

export const BALL_SKIN_CONFIGS = [
	DEFAULT_CONFIG,
	BASKETBALL_CONFIG,
	PIXEL_CONFIG,
	HOTSPOT_CONFIG,
	GLACIAL_CONFIG,
	SUNKEN_CONFIG,
	COSMIC_ECHOES_CONFIG,
	SPIRAL_GALAXY_CONFIG,
	MOLTEN_PULSE_CONFIG,
	NEON_LATTICE_CONFIG,
	FROST_SPIRE_CONFIG,
	SLIME_CONFIG,
	PETALS_CONFIG,
	BOILING_SUN_CONFIG,
	SUNSET_CONFIG
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
