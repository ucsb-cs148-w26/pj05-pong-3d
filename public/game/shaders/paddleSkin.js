import * as THREE from 'three';
import * as Constants from '../constants.js';
import {
	ShaderLibrary,
	ShaderRepository,
	joinShaderChunks
} from './shaderLibrary.js';

const textureLoader = new THREE.TextureLoader();

const DEFAULT_SHADER_MATERIAL_OPTIONS = {
	transparent: true,
	depthWrite: true,
	side: THREE.FrontSide,
	blending: THREE.NormalBlending
};

const DEFAULT_SHADER_PROFILE = {
	glowStrength: 0.65,
	rimPower: 2.4,
	displacement: 0.012,
	animationSpeed: 1.0,
	scanDensity: 34.0,
	scanSpeed: 7.2,
	scanStrength: 0.22,
	rimStrength: 0.6,
	glowTint: [0.85, 1.0, 1.08],
	ballBehindOpacity: 0.38,
	ballBehindRadiusScale: 1.08,
	ballBehindDepthBias: 0.0015
};

const FEATURE_CHUNKS = {
	paddleFaceUv: ShaderLibrary.PaddleFaceUvChunks
};

const DEFAULT_PADDLE_SHADER_TEMPLATE = Object.freeze({
	template: 'STANDARD_PADDLE_SKIN_SHADER',
	features: Object.freeze(['paddleFaceUv'])
});

function createAtlasUniforms() {
	const w = 1 / 3;
	const h = 1 / 2;
	return {
		uAtlasPosX: { value: new THREE.Vector4(0 * w, 0 * h, w, h) },
		uAtlasNegX: { value: new THREE.Vector4(1 * w, 0 * h, w, h) },
		uAtlasPosY: { value: new THREE.Vector4(2 * w, 0 * h, w, h) },
		uAtlasNegY: { value: new THREE.Vector4(0 * w, 1 * h, w, h) },
		uAtlasPosZ: { value: new THREE.Vector4(1 * w, 1 * h, w, h) },
		uAtlasNegZ: { value: new THREE.Vector4(2 * w, 1 * h, w, h) }
	};
}

function colorFromValue(value, fallback = 0xffffff) {
	if (value instanceof THREE.Color) return value.clone();
	return new THREE.Color(value ?? fallback);
}

function vector3FromValue(value, fallback = [1.0, 1.0, 1.0]) {
	if (value instanceof THREE.Vector3) return value.clone();
	if (value instanceof THREE.Color) {
		return new THREE.Vector3(value.r, value.g, value.b);
	}
	if (Array.isArray(value) && value.length >= 3) {
		return new THREE.Vector3(value[0], value[1], value[2]);
	}
	return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function resolveShaderFeatures(shaderDefinition) {
	if (Array.isArray(shaderDefinition?.features)) {
		return shaderDefinition.features;
	}
	return [];
}

function createShaderUniforms(
	dimensions,
	tintColor,
	shaderProfile,
	shaderDefinition,
	styleConfig = {}
) {
	const glowTint = vector3FromValue(shaderProfile.glowTint, [0.85, 1.0, 1.08]);
	const shaderFeatures = resolveShaderFeatures(shaderDefinition);
	const usesPaddleFaceUv = shaderFeatures.includes('paddleFaceUv');
	const uniforms = THREE.UniformsUtils.clone({
		uTime: { value: 0.0 },
		uMotionIntensity: { value: 0.0 },
		uHalfExtents: {
			value: new THREE.Vector3(
				(dimensions.width ?? 1.0) * 0.5,
				(dimensions.height ?? 1.0) * 0.5,
				(dimensions.depth ?? 1.0) * 0.5
			)
		},
		uGlowStrength: { value: shaderProfile.glowStrength },
		uRimPower: { value: shaderProfile.rimPower },
		uDisplacement: { value: shaderProfile.displacement },
		uAnimationSpeed: { value: shaderProfile.animationSpeed },
		uScanDensity: { value: shaderProfile.scanDensity },
		uScanSpeed: { value: shaderProfile.scanSpeed },
		uScanStrength: { value: shaderProfile.scanStrength },
		uRimStrength: { value: shaderProfile.rimStrength },
		uGlowTint: { value: glowTint },
		uBallBehindFadeEnabled: { value: 1.0 },
		uBallWorldPos: { value: new THREE.Vector3() },
		uBallRadius: { value: Constants.BALL_RADIUS },
		uBallBehindOpacity: { value: shaderProfile.ballBehindOpacity },
		uBallBehindRadiusScale: { value: shaderProfile.ballBehindRadiusScale },
		uBallBehindDepthBias: { value: shaderProfile.ballBehindDepthBias },
		uTint: { value: new THREE.Color(0xffffff) },
		...(usesPaddleFaceUv
			? {
					uUseMainTex: { value: 0.0 },
					uMainTex: { value: null },
					...createAtlasUniforms()
				}
			: {}),
		...(styleConfig.uniforms ?? {})
	});

	if (uniforms.uTint?.value?.copy) {
		uniforms.uTint.value.copy(tintColor);
	}

	return uniforms;
}

function createStyleMaterial(dimensions, styleConfig, tintColor) {
	const shaderDefinition =
		styleConfig.shaders ?? DEFAULT_PADDLE_SHADER_TEMPLATE;
	const profile = {
		...DEFAULT_SHADER_PROFILE,
		...styleConfig.shaderProfile
	};
	const shaderFeatures = resolveShaderFeatures(shaderDefinition);
	const uniforms = createShaderUniforms(
		dimensions,
		tintColor,
		profile,
		shaderDefinition,
		styleConfig
	);
	const shaderPair = ShaderRepository.resolveShaderPair(shaderDefinition);
	const chunks = joinShaderChunks(
		...shaderFeatures.map((feature) => FEATURE_CHUNKS[feature]).filter(Boolean)
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

	return { material, uniforms };
}
const CLASSIC_CONFIG = {
	styleIndex: 0,
	label: 'Classic',
	baseColor: 0xffffff,
	textureUrl: '/game/skins/paddle/default.webp',
	shaders: DEFAULT_PADDLE_SHADER_TEMPLATE,
	shaderProfile: {
		glowStrength: 0.18,
		rimPower: 2.0,
		displacement: 0.002,
		animationSpeed: 0.78,
		scanDensity: 16.0,
		scanSpeed: 3.6,
		scanStrength: 0.06,
		rimStrength: 0.22,
		glowTint: [0.92, 0.98, 1.04],
		ballBehindOpacity: 0.44,
		ballBehindRadiusScale: 1.02
	}
};

const TEXTURED_PULSE_CONFIG = {
	styleIndex: 1,
	label: 'Neon Pulse',
	baseColor: 0x6df7ff,
	textureUrl: '/game/skins/paddle/default.webp',
	shaders: DEFAULT_PADDLE_SHADER_TEMPLATE,
	shaderProfile: {
		glowStrength: 0.65,
		rimPower: 2.4,
		displacement: 0.012,
		animationSpeed: 1.0,
		scanDensity: 34.0,
		scanSpeed: 7.2,
		scanStrength: 0.22,
		rimStrength: 0.6,
		glowTint: [0.85, 1.0, 1.08]
	}
};

const EDGE_OUTLINE_SHADER = {
	vertexShader: `
	uniform float uTime;
	uniform float uMotionIntensity;
	uniform float uDisplacement;
	uniform float uAnimationSpeed;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vNormalW;
	varying vec3 vViewDirW;

	void main() {
		float motion = clamp(uMotionIntensity, 0.0, 2.0);
		float wave = sin((position.y + position.z) * 8.0 + uTime * 6.0 * uAnimationSpeed);
		vec3 displaced = position + normal * (wave * uDisplacement * motion);
		vLocalPos = displaced;
		vLocalNormal = normal;

		vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
		vNormalW = normalize(mat3(modelMatrix) * normal);
		vViewDirW = normalize(cameraPosition - worldPos.xyz);

		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`,
	fragmentShader: `
	uniform vec3 uHalfExtents;
	uniform vec3 uTint;
	uniform vec3 uGlowTint;
	uniform float uGlowStrength;
	uniform float uRimPower;
	uniform float uEdgeThickness;
	uniform float uEdgeSoftness;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vNormalW;
	varying vec3 vViewDirW;

	float edgeBand(float edgeDistance, float thickness, float softness) {
		return 1.0 - smoothstep(thickness, thickness + softness, edgeDistance);
	}

	void main() {
		vec3 halfExtents = max(uHalfExtents, vec3(1e-4));
		vec3 distToBounds = halfExtents - abs(vLocalPos);
		vec3 n = abs(normalize(vLocalNormal));

		float edgeDistance;
		if (n.x >= n.y && n.x >= n.z) {
			edgeDistance = min(distToBounds.y, distToBounds.z);
		} else if (n.y >= n.x && n.y >= n.z) {
			edgeDistance = min(distToBounds.x, distToBounds.z);
		} else {
			edgeDistance = min(distToBounds.x, distToBounds.y);
		}

		float edge = edgeBand(edgeDistance, uEdgeThickness, uEdgeSoftness);
		float rim = pow(
			1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0),
			uRimPower
		);
		float glow = (edge * 0.85 + rim * 0.2) * uGlowStrength;
		float alpha = clamp(edge + rim * 0.1, 0.0, 1.0);

		if (alpha < 0.02) discard;

		vec3 color = uTint * (0.35 + edge * 0.75) + uGlowTint * glow;
		gl_FragColor = vec4(color, alpha);
	}
`
};

const EDGE_OUTLINE_CONFIG = {
	styleIndex: 2,
	label: 'Edge Outline',
	baseColor: 0xa7ebff,
	shaders: EDGE_OUTLINE_SHADER,
	shaderProfile: {
		glowStrength: 0.95,
		rimPower: 2.0,
		displacement: 0.0,
		animationSpeed: 1.0,
		scanDensity: 1.0,
		scanSpeed: 1.0,
		scanStrength: 0.0,
		rimStrength: 0.0,
		glowTint: [0.72, 0.95, 1.2]
	},
	uniforms: {
		uEdgeThickness: { value: 0.05 },
		uEdgeSoftness: { value: 0.015 }
	},
	shaderMaterialOptions: {
		transparent: true,
		depthWrite: true
	}
};

export const PADDLE_STYLE_CONFIGS = [
	TEXTURED_PULSE_CONFIG,
	CLASSIC_CONFIG,
	EDGE_OUTLINE_CONFIG
];

export const PADDLE_STYLE_CATALOG = PADDLE_STYLE_CONFIGS.map((config) => ({
	styleIndex: config.styleIndex,
	label: config.label
}));

const DEFAULT_PADDLE_SKIN_CONFIG = PADDLE_STYLE_CONFIGS[0];
export const ACTIVE_PADDLE_STYLE_INDEX =
	DEFAULT_PADDLE_SKIN_CONFIG?.styleIndex ?? 0;

const PADDLE_CONFIG_BY_STYLE_INDEX = new Map(
	PADDLE_STYLE_CONFIGS.map((config) => [config.styleIndex, config])
);

export function resolvePaddleSkinConfig(styleIndex) {
	if (!Number.isFinite(styleIndex)) {
		return DEFAULT_PADDLE_SKIN_CONFIG;
	}
	return (
		PADDLE_CONFIG_BY_STYLE_INDEX.get(styleIndex) ?? DEFAULT_PADDLE_SKIN_CONFIG
	);
}

export class PaddleSkin {
	#visual = null;
	#dimensions = null;
	#geometry = null;
	#material = null;
	#mesh = null;
	#uniforms = null;
	#texture = null;
	#disposed = false;
	#styleNonce = 0;
	#styleConfig = null;
	#color = new THREE.Color(0xffffff);
	#baseColor = new THREE.Color(0xffffff);
	#ballWorldPos = new THREE.Vector3();
	#ballBehindFadeEnabled = 1.0;

	constructor({
		dimensions,
		styleIndex = ACTIVE_PADDLE_STYLE_INDEX,
		color
	} = {}) {
		this.#dimensions = { ...(dimensions ?? {}) };
		this.#visual = new THREE.Group();
		this.#geometry = new THREE.BoxGeometry(
			this.#dimensions.width ?? 1.0,
			this.#dimensions.height ?? 1.0,
			this.#dimensions.depth ?? 1.0
		);
		const placeholderMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff
		});
		this.#mesh = new THREE.Mesh(this.#geometry, placeholderMaterial);
		this.#mesh.castShadow = true;
		this.#mesh.receiveShadow = true;
		this.#visual.add(this.#mesh);

		this.setStyle(styleIndex);
		if (color !== undefined) {
			this.setColor(color);
		}
		placeholderMaterial.dispose();
	}

	get visual() {
		return this.#visual;
	}

	get styleIndex() {
		return this.#styleConfig?.styleIndex ?? ACTIVE_PADDLE_STYLE_INDEX;
	}

	get baseColor() {
		return this.#baseColor.clone();
	}

	get color() {
		return this.#color.clone();
	}

	update(dt, speed = 0.0, ballWorldPos = null) {
		if (ballWorldPos) {
			this.#setBallWorldPos(ballWorldPos);
		}
		if (!this.#uniforms) return;

		this.#uniforms.uTime.value += dt;
		this.#uniforms.uMotionIntensity.value = THREE.MathUtils.clamp(
			speed / 6.0,
			0.0,
			1.5
		);
		this.#syncBallFadeUniforms();
	}

	setStyle(styleIndex) {
		const styleConfig = resolvePaddleSkinConfig(styleIndex);
		const nonce = ++this.#styleNonce;

		const baseColor = colorFromValue(styleConfig.baseColor, 0xffffff);
		const { material, uniforms } = createStyleMaterial(
			this.#dimensions,
			styleConfig,
			baseColor
		);

		this.#material?.dispose?.();
		if (this.#texture) {
			this.#texture.dispose();
			this.#texture = null;
		}

		this.#material = material;
		this.#uniforms = uniforms;
		this.#styleConfig = styleConfig;
		this.#baseColor = baseColor;
		this.#color = baseColor.clone();

		this.#mesh.material = material;
		this.setColor(this.#baseColor);
		this.#syncBallFadeUniforms();

		if (styleConfig.textureUrl) {
			this.#loadTexture(styleConfig.textureUrl, nonce);
		} else {
			this.#clearTextureBindings();
		}

		return styleConfig;
	}

	setColor(color) {
		this.#color = colorFromValue(color, this.#baseColor);
		if (this.#uniforms?.uTint?.value?.copy) {
			this.#uniforms.uTint.value.copy(this.#color);
		}
	}

	resetColor() {
		this.setColor(this.#baseColor);
	}

	setBallBehindFadeEnabled(enabled) {
		this.#ballBehindFadeEnabled = Number(enabled) >= 0.5 ? 1.0 : 0.0;
		this.#syncBallFadeUniforms();
	}

	dispose() {
		this.#disposed = true;
		this.#styleNonce += 1;
		if (this.#texture) this.#texture.dispose();
		this.#visual.remove(this.#mesh);
		this.#material?.dispose?.();
		this.#geometry?.dispose?.();
		this.#texture = null;
		this.#uniforms = null;
		this.#material = null;
		this.#geometry = null;
		this.#mesh = null;
		this.#styleConfig = null;
	}

	#clearTextureBindings() {
		if (this.#uniforms?.uMainTex) {
			this.#uniforms.uMainTex.value = null;
		}
		if (this.#uniforms?.uUseMainTex) {
			this.#uniforms.uUseMainTex.value = 0.0;
		}
	}

	#setBallWorldPos(source) {
		this.#ballWorldPos.set(
			Number(source?.x ?? 0),
			Number(source?.y ?? 0),
			Number(source?.z ?? 0)
		);
	}

	#syncBallFadeUniforms() {
		if (!this.#uniforms) return;
		if (this.#uniforms.uBallBehindFadeEnabled) {
			this.#uniforms.uBallBehindFadeEnabled.value = this.#ballBehindFadeEnabled;
		}
		if (this.#uniforms.uBallWorldPos?.value?.copy) {
			this.#uniforms.uBallWorldPos.value.copy(this.#ballWorldPos);
		}
	}

	async #loadTexture(url, nonce) {
		try {
			const texture = await textureLoader.loadAsync(url);
			if (this.#disposed || nonce !== this.#styleNonce || !this.#material) {
				texture.dispose();
				return;
			}

			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = 8;
			texture.flipY = true;
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;
			texture.needsUpdate = true;

			this.#texture = texture;
			if (this.#uniforms?.uMainTex) {
				this.#uniforms.uMainTex.value = texture;
			}
			if (this.#uniforms?.uUseMainTex) {
				this.#uniforms.uUseMainTex.value = 1.0;
			}
		} catch (err) {
			if (this.#uniforms?.uUseMainTex) {
				this.#uniforms.uUseMainTex.value = 0.0;
			}
			console.warn(
				`[paddle-skin] failed to load texture "${url}", using tint fallback`,
				err
			);
		}
	}
}
