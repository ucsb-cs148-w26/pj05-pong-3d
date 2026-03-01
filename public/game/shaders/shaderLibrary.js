export const ShaderLibrary = {
	MathChunks: `
		const float PI = 3.141592653589793;

		float hash(float n) {
			return fract(sin(n) * 43758.5453);
		}

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
		}

		float hash(vec3 p) {
			return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
		}

		float random(vec2 p) {
			return hash(p);
		}

		mat2 rotateMatrix(float angle) {
			float c = cos(angle);
			float s = sin(angle);
			return mat2(c, -s, s, c);
		}
	`,
	NoiseChunks: `
		float noise(vec2 p) {
			vec2 i = floor(p);
			vec2 f = fract(p);
			vec2 u = f * f * (3.0 - 2.0 * f);
			float a = hash(i);
			float b = hash(i + vec2(1.0, 0.0));
			float c = hash(i + vec2(0.0, 1.0));
			float d = hash(i + vec2(1.0, 1.0));
			return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
		}

		float noise(vec3 p) {
			vec3 i = floor(p);
			vec3 f = fract(p);
			vec3 u = f * f * (3.0 - 2.0 * f);

			float n000 = hash(i + vec3(0.0, 0.0, 0.0));
			float n100 = hash(i + vec3(1.0, 0.0, 0.0));
			float n010 = hash(i + vec3(0.0, 1.0, 0.0));
			float n110 = hash(i + vec3(1.0, 1.0, 0.0));
			float n001 = hash(i + vec3(0.0, 0.0, 1.0));
			float n101 = hash(i + vec3(1.0, 0.0, 1.0));
			float n011 = hash(i + vec3(0.0, 1.0, 1.0));
			float n111 = hash(i + vec3(1.0, 1.0, 1.0));

			float n00 = mix(n000, n100, u.x);
			float n10 = mix(n010, n110, u.x);
			float n01 = mix(n001, n101, u.x);
			float n11 = mix(n011, n111, u.x);

			float n0 = mix(n00, n10, u.y);
			float n1 = mix(n01, n11, u.y);
			return mix(n0, n1, u.z);
		}

		float fbm(vec3 p) {
			float v = 0.0;
			float a = 0.5;
			for (int i = 0; i < 4; i++) {
				v += a * noise(p);
				p *= 2.0;
				a *= 0.5;
			}
			return v;
		}

		float voronoi(vec3 p) {
			vec3 i = floor(p);
			vec3 f = fract(p);
			float res = 8.0;
			for (int x = -1; x <= 1; x++) {
				for (int y = -1; y <= 1; y++) {
					for (int z = -1; z <= 1; z++) {
						vec3 g = vec3(float(x), float(y), float(z));
						vec3 o = vec3(hash(i + g), hash(i + g + 13.1), hash(i + g + 27.7));
						vec3 r = g + o - f;
						res = min(res, dot(r, r));
					}
				}
			}
			return res;
		}

		vec4 permute(vec4 x) {
			return mod(((x * 34.0) + 1.0) * x, 289.0);
		}

		vec4 taylorInvSqrt(vec4 r) {
			return 1.79284291400159 - 0.85373472095314 * r;
		}

		float snoise(vec3 v) {
			const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
			const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

			vec3 i = floor(v + dot(v, C.yyy));
			vec3 x0 = v - i + dot(i, C.xxx);

			vec3 g = step(x0.yzx, x0.xyz);
			vec3 l = 1.0 - g;
			vec3 i1 = min(g.xyz, l.zxy);
			vec3 i2 = max(g.xyz, l.zxy);

			vec3 x1 = x0 - i1 + C.xxx;
			vec3 x2 = x0 - i2 + C.yyy;
			vec3 x3 = x0 - D.yyy;

			i = mod(i, 289.0);
			vec4 p = permute(permute(permute(
				i.z + vec4(0.0, i1.z, i2.z, 1.0))
				+ i.y + vec4(0.0, i1.y, i2.y, 1.0))
				+ i.x + vec4(0.0, i1.x, i2.x, 1.0));

			float n_ = 1.0 / 7.0;
			vec3 ns = n_ * D.wyz - D.xzx;

			vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

			vec4 x_ = floor(j * ns.z);
			vec4 y_ = floor(j - 7.0 * x_);

			vec4 x = x_ * ns.x + ns.yyyy;
			vec4 y = y_ * ns.x + ns.yyyy;
			vec4 h = 1.0 - abs(x) - abs(y);

			vec4 b0 = vec4(x.xy, y.xy);
			vec4 b1 = vec4(x.zw, y.zw);

			vec4 s0 = floor(b0) * 2.0 + 1.0;
			vec4 s1 = floor(b1) * 2.0 + 1.0;
			vec4 sh = -step(h, vec4(0.0));

			vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
			vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

			vec3 p0 = vec3(a0.xy, h.x);
			vec3 p1 = vec3(a0.zw, h.y);
			vec3 p2 = vec3(a1.xy, h.z);
			vec3 p3 = vec3(a1.zw, h.w);

			vec4 norm = taylorInvSqrt(
				vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))
			);
			p0 *= norm.x;
			p1 *= norm.y;
			p2 *= norm.z;
			p3 *= norm.w;

			vec4 m = max(0.6 - vec4(
				dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
			), 0.0);
			m = m * m;
			return 42.0 * dot(m * m, vec4(
				dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
			));
		}
	`,
	DissolveChunks: `
		vec3 computeOrganicDissolveMask(vec3 normal, float progress, float domainScale) {
			float dissolveProgress = smoothstep(0.18, 0.82, progress);
			vec3 dissolveDomain = normalize(normal) * domainScale +
				vec3(progress * 0.65, -progress * 0.42, progress * 0.31);
			float layerA = fbm(dissolveDomain * 1.1);
			float layerB = noise(dissolveDomain * 2.3 + vec3(2.7, -1.9, 4.6));
			float organicNoise = smoothstep(0.2, 0.84, mix(layerA, layerB, 0.28));
			float band = dissolveProgress - organicNoise;
			float mask = 1.0 - smoothstep(-0.01, 0.14, band);
			float edge = smoothstep(-0.005, 0.055, band) *
				(1.0 - smoothstep(0.055, 0.15, band));
			return vec3(mask, edge, dissolveProgress);
		}
	`,
	PhysicsChunks: `
		vec3 applyDisplacement(vec3 position, vec3 normal, float displacement) {
			return position + normal * displacement;
		}
	`,
	LightingChunks: `
		float fresnelTerm(vec3 normal, vec3 viewDir, float power) {
			float ndv = max(dot(normal, viewDir), 0.0);
			return pow(1.0 - ndv, power);
		}

		vec3 clearCoatSpec(vec3 n, vec3 v, vec3 l, float roughness) {
			vec3 h = normalize(v + l);
			float ndh = max(dot(n, h), 0.0);
			float spec = pow(ndh, mix(60.0, 140.0, 1.0 - roughness));
			return vec3(spec);
		}

		vec3 standardShading(vec3 base, vec3 normal, vec3 viewDir, vec3 lightDir) {
			float ndl = max(dot(normal, lightDir), 0.0);
			vec3 diffuse = base * ndl;
			float fresnel = fresnelTerm(normal, viewDir, 3.0);
			return diffuse + base * fresnel * 0.2;
		}
	`,
	PaddleFaceUvChunks: `
		uniform vec3 uHalfExtents;

		float paddleAxisUv(float value, float halfExtent) {
			return clamp((value + halfExtent) / max(halfExtent * 2.0, 1e-5), 0.0, 1.0);
		}

		vec2 resolvePaddleFaceUv(in vec3 localPos, in vec3 localNormal) {
			vec3 n = normalize(localNormal);
			vec3 an = abs(n);

			if (an.x >= an.y && an.x >= an.z) {
				if (n.x >= 0.0) {
					return vec2(
						paddleAxisUv(-localPos.z, uHalfExtents.z),
						paddleAxisUv(localPos.y, uHalfExtents.y)
					);
				}

				return vec2(
					paddleAxisUv(localPos.z, uHalfExtents.z),
					paddleAxisUv(localPos.y, uHalfExtents.y)
				);
			}

			if (an.y >= an.x && an.y >= an.z) {
				if (n.y >= 0.0) {
					return vec2(
						paddleAxisUv(localPos.x, uHalfExtents.x),
						paddleAxisUv(-localPos.z, uHalfExtents.z)
					);
				}

				return vec2(
					paddleAxisUv(localPos.x, uHalfExtents.x),
					paddleAxisUv(localPos.z, uHalfExtents.z)
				);
			}

			if (n.z >= 0.0) {
				return vec2(
					paddleAxisUv(localPos.x, uHalfExtents.x),
					paddleAxisUv(localPos.y, uHalfExtents.y)
				);
			}

			return vec2(
				paddleAxisUv(-localPos.x, uHalfExtents.x),
				paddleAxisUv(localPos.y, uHalfExtents.y)
			);
		}
	`,
	ShaderTemplates: {
		STANDARD_PARTICLE_SHADER: {
			vertexShader: `
				uniform float uProgress;
				attribute float aSize;

				void main() {
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					float pointSize = {{CUSTOM_POINT_SIZE_LOGIC}};
					gl_PointSize = pointSize;
					gl_Position = projectionMatrix * mvPosition;
				}
			`,
			fragmentShader: `
				uniform float uProgress;
				uniform vec3 uColor;

				void main() {
					vec2 uv = gl_PointCoord - vec2(0.5);
					float d = length(uv);
					float alpha = {{CUSTOM_ALPHA_LOGIC}};
					vec3 color = {{CUSTOM_COLOR_LOGIC}};
					gl_FragColor = vec4(color, alpha);
				}
			`,
			defaultInjections: {
				CUSTOM_POINT_SIZE_LOGIC: 'aSize * (1.0 - uProgress) * 6.0',
				CUSTOM_ALPHA_LOGIC: 'smoothstep(0.5, 0.1, d)',
				CUSTOM_COLOR_LOGIC: 'uColor'
			}
		},
		STANDARD_RING_SHADER: {
			vertexShader: `
				uniform float uTime;
				uniform float uProgress;
				varying vec2 vUv;

				void main() {
					vUv = uv;
					float expansion = {{RING_EXPANSION_MULTIPLIER}};
					vec3 displaced = position * (1.0 + uProgress * expansion);
					{{CUSTOM_VERTEX_LOGIC}}
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
					float ring = {{CUSTOM_RING_MASK_LOGIC}};
					float intensity = {{CUSTOM_INTENSITY_LOGIC}};
					float alpha = {{CUSTOM_ALPHA_LOGIC}};
					vec3 color = {{CUSTOM_COLOR_LOGIC}};
					gl_FragColor = vec4(color, alpha);
				}
			`,
			defaultInjections: {
				RING_EXPANSION_MULTIPLIER: '6.0',
				CUSTOM_VERTEX_LOGIC: '',
				CUSTOM_RING_MASK_LOGIC:
					'smoothstep(0.5, 0.45, dist) * smoothstep(0.3, 0.33, dist)',
				CUSTOM_INTENSITY_LOGIC: 'ring * (1.0 - uProgress)',
				CUSTOM_ALPHA_LOGIC: 'clamp(intensity, 0.0, 1.0) * 0.6',
				CUSTOM_COLOR_LOGIC: 'uColor * intensity'
			}
		}
	}
};

export function joinShaderChunks(...chunks) {
	return chunks.filter(Boolean).join('\n');
}

const TEMPLATE_TOKEN = /{{\s*([A-Z0-9_]+)\s*}}/g;

function injectShaderTemplate(source, injections = {}) {
	return source.replace(TEMPLATE_TOKEN, (_, token) => injections[token] ?? '');
}

function resolveTemplateSpec(templateKeyOrSpec) {
	if (typeof templateKeyOrSpec === 'string') {
		return ShaderLibrary.ShaderTemplates[templateKeyOrSpec] ?? null;
	}
	if (!templateKeyOrSpec) return null;
	if (templateKeyOrSpec.vertexShader || templateKeyOrSpec.fragmentShader) {
		return templateKeyOrSpec;
	}
	if (templateKeyOrSpec.template) {
		return ShaderLibrary.ShaderTemplates[templateKeyOrSpec.template] ?? null;
	}
	return null;
}

export const ShaderRepository = {
	getTemplate(templateKeyOrSpec, { injections = {} } = {}) {
		const template = resolveTemplateSpec(templateKeyOrSpec);
		if (!template) {
			return {
				vertexShader: '',
				fragmentShader: ''
			};
		}

		const mergedInjections = {
			...(template.defaultInjections ?? {}),
			...(templateKeyOrSpec?.injections ?? {}),
			...injections
		};

		return {
			vertexShader: injectShaderTemplate(
				template.vertexShader ?? '',
				mergedInjections
			),
			fragmentShader: injectShaderTemplate(
				template.fragmentShader ?? '',
				mergedInjections
			)
		};
	},
	resolveShaderPair(definition, fallbackTemplate = null) {
		if (!definition && fallbackTemplate) {
			return this.getTemplate(fallbackTemplate);
		}
		if (!definition) {
			return {
				vertexShader: '',
				fragmentShader: ''
			};
		}
		if (definition.template) {
			return this.getTemplate(definition);
		}
		if (definition.vertexShader || definition.fragmentShader) {
			return {
				vertexShader: definition.vertexShader ?? '',
				fragmentShader: definition.fragmentShader ?? ''
			};
		}
		if (typeof definition === 'string') {
			return this.getTemplate(definition);
		}
		return {
			vertexShader: '',
			fragmentShader: ''
		};
	}
};
