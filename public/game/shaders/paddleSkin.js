import * as THREE from 'three';
import { ShaderLibrary, joinShaderChunks } from './shaderLibrary.js';

const textureLoader = new THREE.TextureLoader();

const DEFAULT_MATERIAL_OPTIONS = {
	transparent: false,
	depthWrite: true,
	side: THREE.FrontSide,
	blending: THREE.NormalBlending
};

const COMMON_CHUNKS = joinShaderChunks(ShaderLibrary.PaddleFaceUvChunks);

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

export const PADDLE_STYLE_CONFIGS = [
	{
		styleIndex: 0,
		label: 'Textured Pulse',
		baseColor: 0x6df7ff,
		textureUrl: '/game/skins/paddle/default.webp',
		shaders: {
			vertexShader: `
	uniform float uTime;
	uniform float uMotionIntensity;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vNormalW;
	varying vec3 vViewDirW;

	void main() {
		float wave = sin((position.y + position.z) * 8.0 + uTime * 6.0);
		vec3 displaced = position + normal * (wave * 0.012 * uMotionIntensity);
		vLocalPos = displaced;
		vLocalNormal = normal;

		vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
		vNormalW = normalize(mat3(modelMatrix) * normal);
		vViewDirW = normalize(cameraPosition - worldPos.xyz);
		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`,
			fragmentShader: `
	uniform sampler2D uMainTex;
	uniform vec3 uTint;
	uniform float uUseMainTex;
	uniform float uTime;
	uniform float uGlowStrength;
	uniform vec4 uAtlasPosX;
	uniform vec4 uAtlasNegX;
	uniform vec4 uAtlasPosY;
	uniform vec4 uAtlasNegY;
	uniform vec4 uAtlasPosZ;
	uniform vec4 uAtlasNegZ;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vNormalW;
	varying vec3 vViewDirW;

	vec2 mapPaddleFaceToAtlas(vec2 faceUv, vec4 atlasRect) {
		return atlasRect.xy + faceUv * atlasRect.zw;
	}

	vec2 resolvePaddleFaceAtlasUv(
		in vec3 localPos,
		in vec3 localNormal,
		out vec2 faceUv
	) {
		vec3 n = normalize(localNormal);
		vec3 an = abs(n);
		vec4 atlasRect = uAtlasPosX;

		faceUv = resolvePaddleFaceUv(localPos, localNormal);

		if (an.x >= an.y && an.x >= an.z) {
			atlasRect = n.x >= 0.0 ? uAtlasPosX : uAtlasNegX;
		} else if (an.y >= an.x && an.y >= an.z) {
			atlasRect = n.y >= 0.0 ? uAtlasPosY : uAtlasNegY;
		} else {
			atlasRect = n.z >= 0.0 ? uAtlasPosZ : uAtlasNegZ;
		}

		return mapPaddleFaceToAtlas(faceUv, atlasRect);
	}

	void main() {
		vec2 faceUv;
		vec2 atlasUv = resolvePaddleFaceAtlasUv(vLocalPos, vLocalNormal, faceUv);

		vec3 texColor = texture2D(uMainTex, atlasUv).rgb;
		vec3 base = mix(uTint, texColor * uTint, uUseMainTex);

		float rim = pow(
			1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0),
			2.4
		);
		float scan = 0.5 + 0.5 * sin(faceUv.y * 34.0 - uTime * 7.2);
		float glow = (rim * 0.6 + scan * 0.22) * uGlowStrength;

		vec3 color = base + glow * vec3(0.85, 1.0, 1.08);
		gl_FragColor = vec4(color, 1.0);
	}
`
		},
		uniforms: {
			uGlowStrength: { value: 0.65 }
		}
	}
];

export const PADDLE_STYLE_CATALOG = PADDLE_STYLE_CONFIGS.map((config) => ({
	styleIndex: config.styleIndex,
	label: config.label,
}));

const PADDLE_CONFIG_BY_STYLE_INDEX = new Map(
	PADDLE_STYLE_CONFIGS.map((config) => [config.styleIndex, config])
);

export const ACTIVE_PADDLE_STYLE_INDEX = 0;

export function resolvePaddleSkinConfig(styleIndex) {
	if (!Number.isFinite(styleIndex)) {
		return PADDLE_STYLE_CONFIGS[0];
	}
	return (
		PADDLE_CONFIG_BY_STYLE_INDEX.get(styleIndex) ?? PADDLE_STYLE_CONFIGS[0]
	);
}

function createUniforms(dimensions, styleConfig, tintColor) {
	const cloned = THREE.UniformsUtils.clone({
		uTime: { value: 0.0 },
		uMotionIntensity: { value: 0.0 },
		uHalfExtents: {
			value: new THREE.Vector3(
				(dimensions.width ?? 1.0) * 0.5,
				(dimensions.height ?? 1.0) * 0.5,
				(dimensions.depth ?? 1.0) * 0.5
			)
		},
		uGlowStrength: { value: 0.6 },
		uTint: { value: new THREE.Color(0xffffff) },
		uUseMainTex: { value: 0.0 },
		uMainTex: { value: null },
		...createAtlasUniforms(),
		...(styleConfig.uniforms ?? {})
	});

	cloned.uTint.value.copy(tintColor);
	return cloned;
}

function buildShaderSource(source) {
	return `${COMMON_CHUNKS}\n${source}`;
}

function createMaterial(dimensions, styleConfig, tintColor) {
	const uniforms = createUniforms(dimensions, styleConfig, tintColor);
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: buildShaderSource(styleConfig.shaders.vertexShader ?? ''),
		fragmentShader: buildShaderSource(styleConfig.shaders.fragmentShader ?? ''),
		...DEFAULT_MATERIAL_OPTIONS,
		...(styleConfig.materialOptions ?? {})
	});

	return { material, uniforms };
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

	constructor(
		{ dimensions, styleIndex = ACTIVE_PADDLE_STYLE_INDEX, color } = {}
	) {
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

		this.setStyle(styleIndex, { color });
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

	update(dt, speed = 0.0) {
		if (!this.#uniforms) return;

		this.#uniforms.uTime.value += dt;
		this.#uniforms.uMotionIntensity.value = THREE.MathUtils.clamp(
			speed / 6.0,
			0.0,
			1.5
		);
	}

	setStyle(styleIndex, { color } = {}) {
		const styleConfig = resolvePaddleSkinConfig(styleIndex);
		const nonce = ++this.#styleNonce;

		const baseColor = colorFromValue(styleConfig.baseColor, 0xffffff);
		const activeColor = colorFromValue(color, styleConfig.baseColor);
		const { material, uniforms } = createMaterial(
			this.#dimensions,
			styleConfig,
			activeColor
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
		this.#color = activeColor;

		this.#mesh.material = material;

		if (styleConfig.textureUrl) {
			this.#loadTexture(styleConfig.textureUrl, nonce);
		} else {
			this.#uniforms.uUseMainTex.value = 0.0;
			this.#uniforms.uMainTex.value = null;
		}

		return styleConfig;
	}

	setColor(color) {
		this.#color = colorFromValue(color, this.#baseColor);
		if (this.#uniforms?.uTint?.value) {
			this.#uniforms.uTint.value.copy(this.#color);
		}
	}

	resetColor() {
		this.setColor(this.#baseColor);
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

	async #loadTexture(url, nonce) {
		try {
			const texture = await textureLoader.loadAsync(url);
			if (this.#disposed || nonce !== this.#styleNonce || !this.#uniforms) {
				texture.dispose();
				return;
			}

			texture.colorSpace = THREE.SRGBColorSpace;
			texture.flipY = true;
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;
			texture.needsUpdate = true;

			this.#texture = texture;
			this.#uniforms.uMainTex.value = texture;
			this.#uniforms.uUseMainTex.value = 1.0;
		} catch (err) {
			if (this.#uniforms) this.#uniforms.uUseMainTex.value = 0.0;
			console.warn(
				`[paddle-skin] failed to load texture "${url}", using tint fallback`,
				err
			);
		}
	}
}
