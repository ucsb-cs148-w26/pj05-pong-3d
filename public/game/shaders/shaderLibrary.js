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
		},
		STANDARD_PADDLE_SKIN_SHADER: {
			vertexShader: `
	uniform float uTime;
	uniform float uMotionIntensity;
	uniform float uDisplacement;
	uniform float uAnimationSpeed;
	uniform vec3 uBallWorldPos;
	uniform float uBallRadius;
	uniform float uBallBehindDepthBias;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vNormalW;
	varying vec3 vViewDirW;
	varying vec2 vPaddleMinNdc;
	varying vec2 vPaddleMaxNdc;
	varying vec2 vBallNdc;
	varying float vBallProjectedRadius;
	varying float vBallBehindFlag;
	varying float vBallClipValid;

	void main() {
		float motion = clamp(uMotionIntensity, 0.0, 2.0);
		float wave = sin((position.y + position.z) * 8.0 + uTime * 6.0 * uAnimationSpeed);
		vec3 displaced = position + normal * (wave * uDisplacement * motion);
		vLocalPos = displaced;
		vLocalNormal = normal;

		vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
		vNormalW = normalize(mat3(modelMatrix) * normal);
		vViewDirW = normalize(cameraPosition - worldPos.xyz);

		mat4 modelView = viewMatrix * modelMatrix;
		vec4 paddleCenterClip =
			projectionMatrix * modelView * vec4(0.0, 0.0, 0.0, 1.0);
		vec4 ballView = viewMatrix * vec4(uBallWorldPos, 1.0);
		vec4 ballClip = projectionMatrix * ballView;
		float ballW = max(abs(ballClip.w), 1e-5);
		vBallNdc = ballClip.xy / ballW;

		vec4 ballRadiusClipX =
			projectionMatrix * (ballView + vec4(uBallRadius, 0.0, 0.0, 0.0));
		vec4 ballRadiusClipY =
			projectionMatrix * (ballView + vec4(0.0, uBallRadius, 0.0, 0.0));
		vec2 ballRadiusNdcX =
			ballRadiusClipX.xy / max(abs(ballRadiusClipX.w), 1e-5);
		vec2 ballRadiusNdcY =
			ballRadiusClipY.xy / max(abs(ballRadiusClipY.w), 1e-5);
		vBallProjectedRadius = max(
			length(ballRadiusNdcX - vBallNdc),
			length(ballRadiusNdcY - vBallNdc)
		);
		vBallProjectedRadius = max(vBallProjectedRadius, 0.001);

		vec2 paddleMinNdc = vec2(1e6);
		vec2 paddleMaxNdc = vec2(-1e6);
		vec4 paddleCornerClip;
		vec2 paddleCornerNdc;

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(-uHalfExtents.x, -uHalfExtents.y, -uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(-uHalfExtents.x, -uHalfExtents.y, uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(-uHalfExtents.x, uHalfExtents.y, -uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(-uHalfExtents.x, uHalfExtents.y, uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(uHalfExtents.x, -uHalfExtents.y, -uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(uHalfExtents.x, -uHalfExtents.y, uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(uHalfExtents.x, uHalfExtents.y, -uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		paddleCornerClip =
			projectionMatrix *
			modelView *
			vec4(uHalfExtents.x, uHalfExtents.y, uHalfExtents.z, 1.0);
		paddleCornerNdc = paddleCornerClip.xy / max(abs(paddleCornerClip.w), 1e-5);
		paddleMinNdc = min(paddleMinNdc, paddleCornerNdc);
		paddleMaxNdc = max(paddleMaxNdc, paddleCornerNdc);

		vPaddleMinNdc = paddleMinNdc;
		vPaddleMaxNdc = paddleMaxNdc;

		float paddleW = max(abs(paddleCenterClip.w), 1e-5);
		float paddleDepth = paddleCenterClip.z / paddleW;
		float ballDepth = ballClip.z / ballW;
		vBallBehindFlag = step(paddleDepth + uBallBehindDepthBias, ballDepth);
		vBallClipValid = float(paddleCenterClip.w > 0.0 && ballClip.w > 0.0);
		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`,
			fragmentShader: `
	uniform sampler2D uMainTex;
	uniform vec3 uTint;
	uniform float uUseMainTex;
	uniform float uTime;
	uniform float uGlowStrength;
	uniform float uRimPower;
	uniform float uScanDensity;
	uniform float uScanSpeed;
		uniform float uScanStrength;
		uniform float uRimStrength;
		uniform vec3 uGlowTint;
		uniform float uBallBehindFadeEnabled;
		uniform float uBallBehindOpacity;
		uniform float uBallBehindRadiusScale;
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
	varying vec2 vPaddleMinNdc;
	varying vec2 vPaddleMaxNdc;
	varying vec2 vBallNdc;
	varying float vBallProjectedRadius;
	varying float vBallBehindFlag;
	varying float vBallClipValid;

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
		vec3 base = uTint;
		if (uUseMainTex > 0.5) {
			base = texture2D(uMainTex, atlasUv).rgb * uTint;
		}

		float rim = pow(
			1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0),
			uRimPower
		);
		float scan = 0.5 + 0.5 * sin(faceUv.y * uScanDensity - uTime * uScanSpeed);
		float glow = (rim * uRimStrength + scan * uScanStrength) * uGlowStrength;

		vec3 color = base + glow * uGlowTint;

		float fadeMask = 0.0;
		if (uBallBehindFadeEnabled > 0.5 && vBallClipValid > 0.5) {
			vec2 nearestPaddlePoint = clamp(vBallNdc, vPaddleMinNdc, vPaddleMaxNdc);
			float overlapDist = length(vBallNdc - nearestPaddlePoint);
			float overlapRadius = vBallProjectedRadius * uBallBehindRadiusScale;
			float overlapSoftness = max(vBallProjectedRadius * 0.35, 0.01);
			float overlap = 1.0 - smoothstep(
				overlapRadius,
				overlapRadius + overlapSoftness,
				overlapDist
			);
			fadeMask = clamp(overlap * vBallBehindFlag, 0.0, 1.0);
		}

		float alpha = mix(1.0, uBallBehindOpacity, fadeMask);
		gl_FragColor = vec4(color, alpha);
	}
`
		},

		STANDARD_BALL_SKIN_SHADER: {
			vertexShader: `
	uniform float uTime;
	uniform float uMotionIntensity;
	uniform float uDisplacement;
	uniform float uAnimationSpeed;
	uniform float uShapeType;
	uniform float uShapeAmount;
	uniform vec4 uShapeParamsA;
	uniform vec4 uShapeParamsB;

	varying vec3 vLocalPos;
	varying vec3 vWorldPos;
	varying vec3 vNormalW;

	void main() {
		float motion = clamp(uMotionIntensity, 0.0, 2.0);
		float shapeType = uShapeType;
		float shapeAmount = clamp(uShapeAmount, 0.0, 2.0);
		vec3 unit = normalize(position);
		vec3 shaped = position;
		float shapePulse = 0.5 + 0.5 * sin(uTime * uShapeParamsA.w);

		if (shapeType < 0.5) {
			float spikeField = pow(
				abs(
					sin(
						unit.x * uShapeParamsA.x +
							unit.y * uShapeParamsA.y +
							unit.z * uShapeParamsA.w +
							uTime * uShapeParamsB.x
					)
				),
				max(uShapeParamsB.y, 1.0)
			);
			shaped += unit * (spikeField * uShapeParamsA.z * shapeAmount);
		} else if (shapeType < 1.5) {
			float wobble = sin(uTime * uShapeParamsA.x + unit.y * uShapeParamsA.y);
			wobble *= cos(uTime * uShapeParamsB.x + unit.x * uShapeParamsB.y);
			shaped += unit * (wobble * uShapeParamsA.z * shapeAmount);
			shaped +=
				vec3(unit.x, -2.0 * unit.y, unit.z) *
				(wobble * uShapeParamsB.z * shapeAmount);
		} else if (shapeType < 2.5) {
			float petals = 0.5 + 0.5 * sin(
				atan(unit.z, unit.x) * uShapeParamsA.x +
					unit.y * uShapeParamsA.y +
					uTime * uShapeParamsB.x
			);
			float bloom = pow(petals, max(uShapeParamsB.y, 1.0));
			bloom *= 0.45 + shapePulse * 0.55;
			shaped += unit * (bloom * uShapeParamsA.z * shapeAmount);
		} else {
			float lobeX = abs(
				sin(unit.x * uShapeParamsA.x + uTime * uShapeParamsB.x)
			);
			float lobeY = abs(
				sin(unit.y * uShapeParamsA.y - uTime * uShapeParamsB.x * 0.7)
			);
			float lobeZ = abs(
				sin(unit.z * uShapeParamsA.w + uTime * uShapeParamsB.x * 0.5)
			);
			float evenField = (lobeX + lobeY + lobeZ) / 3.0;
			float crossField = sqrt(max(lobeX * lobeY * lobeZ, 0.0));
			float lobes = mix(evenField, crossField, 0.48);
			float flareSeed = 0.5 + 0.5 * sin(
				atan(unit.z, unit.x) * uShapeParamsA.y +
					unit.y * uShapeParamsA.w +
					uTime * (uShapeParamsB.x * 1.8 + 0.35)
			);
			float flareField = lobes * (0.62 + 0.38 * flareSeed);
			float flareCore = smoothstep(0.74, 0.93, flareField);
			float flareTail = smoothstep(0.64, 0.84, flareField) * (1.0 - flareCore);
			float flarePhase = fract(
				uTime * (uShapeParamsB.x * 2.2 + 0.45) +
					dot(unit, vec3(1.31, -0.97, 0.73)) * 2.7 +
					flareSeed * 0.65
			);
			float flareEnvelope = 0.0;
			if (flarePhase < 0.5) {
				float k = flarePhase / 0.5;
				flareEnvelope = 0.78 * pow(k, 0.35);
			} else if (flarePhase < 0.8) {
				float k = (flarePhase - 0.5) / 0.3;
				flareEnvelope = mix(0.78, 1.0, pow(k, 1.6));
			} else {
				float k = (flarePhase - 0.8) / 0.2;
				flareEnvelope = 1.0 - pow(k, 0.35);
			}
			float starMask =
				pow(flareCore, max(uShapeParamsB.y, 1.0)) * 0.92 + flareTail * 0.28;
			starMask *= flareEnvelope;
			shaped += unit * (starMask * uShapeParamsA.z * shapeAmount);
		}

		vec3 shapeNormal = normalize(shaped);
		float wave = sin(
			(shaped.x + shaped.y + shaped.z) * 8.0 +
			uTime * 3.2 * uAnimationSpeed
		);
		float grain = noise(shaped * 3.6 + vec3(uTime * 0.35 * uAnimationSpeed)) - 0.5;
		float displacement =
			(wave * 0.65 + grain * 0.9) *
			uDisplacement *
			(0.45 + motion * 0.55);

		vec3 displaced = shaped + shapeNormal * displacement;

		vLocalPos = displaced;
		vNormalW = normalize(mat3(modelMatrix) * normal);
		vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
		vWorldPos = worldPos.xyz;

		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`,
			fragmentShader: `
	uniform float uTime;
	uniform float uMotionIntensity;
	uniform float uPatternType;
	uniform float uGlowStrength;
	uniform float uRimPower;
	uniform float uAnimationSpeed;
	uniform float uDepthStrength;
	uniform float uDepthDensity;
	uniform float uInteriorScale;
	uniform float uInteriorFlow;
	uniform float uInteriorShapeType;
	uniform float uGlassFresnelPower;
	uniform float uGlassClarity;
	uniform float uSwirlStrength;
	uniform float uHighlightStrength;
	uniform float uSpecularStrength;
	uniform float uFresnelStrength;
	uniform vec3 uTint;
	uniform vec3 uAccent;
	uniform vec3 uAccent2;
	uniform vec3 uSphereCenter;
	uniform float uSphereRadius;
	uniform vec4 uParamsA;
	uniform vec4 uParamsB;

	varying vec3 vLocalPos;
	varying vec3 vWorldPos;
	varying vec3 vNormalW;

	const int INTERIOR_STEPS = 12;

	vec2 raySphere(vec3 ro, vec3 rd, vec3 center, float radius) {
		vec3 oc = ro - center;
		float b = dot(oc, rd);
		float c = dot(oc, oc) - radius * radius;
		float h = b * b - c;
		if (h < 0.0) return vec2(-1.0);
		h = sqrt(h);
		return vec2(-b - h, -b + h);
	}

	float interiorShape(vec3 p, float flowTime, float shapeType) {
		float clouds = clamp(
			fbm(p + vec3(flowTime * 0.15, -flowTime * 0.09, flowTime * 0.12)),
			0.0,
			1.0
		);
		float cells = 1.0 - smoothstep(
			0.12,
			0.78,
			voronoi(p * 1.25 + vec3(flowTime * 0.2, -flowTime * 0.13, flowTime * 0.17))
		);
		float ribbons = 0.5 + 0.5 * sin(
			(p.x + p.y * 0.7 + p.z * 0.9) * 3.8 + flowTime * 2.2
		);
		float rings = 0.5 + 0.5 * cos(
			length(p.xy) * 10.0 - flowTime * 2.8 + p.z * 3.0
		);
		float lattice = smoothstep(
			0.74,
			0.98,
			abs(sin(p.x * 4.0) * sin(p.y * 4.6) * sin(p.z * 3.7))
		);

		float shape = clouds;
		if (shapeType < 0.5) {
			shape = mix(clouds, ribbons, 0.35);
		} else if (shapeType < 2.5) {
			shape = mix(rings, clouds, 0.5);
		} else if (shapeType < 3.5) {
			shape = mix(lattice, cells, 0.6);
		} else {
			shape = mix(clouds, cells, 0.7);
		}
		return clamp(shape, 0.0, 1.0);
	}

	void main() {
		vec3 nLocal = normalize(vLocalPos);
		vec3 nWorld = normalize(vNormalW);
		vec3 viewDir = normalize(cameraPosition - vWorldPos);

		float speedMul = uAnimationSpeed * (0.75 + uMotionIntensity * 0.35);
		float fbmField = clamp(
			fbm(nLocal * uParamsA.x + vec3(uTime * 0.22 * speedMul)),
			0.0,
			1.0
		);
		float vorField = voronoi(
			nLocal * uParamsA.y + vec3(uTime * 0.11 * speedMul, -uTime * 0.07 * speedMul, 0.0)
		);
		float stripe = 0.5 + 0.5 * sin(
			(nLocal.x * uParamsA.z + nLocal.y * uParamsA.w + nLocal.z * uParamsB.x) *
				PI +
			uTime * uParamsB.x * speedMul
		);
		float latitude = 1.0 - abs(nLocal.y);
		float ripple = 0.5 + 0.5 * cos(
			(latitude * 7.0 + (nLocal.x * nLocal.z) * uParamsB.w * 2.2) * PI -
			uTime * 3.8 * speedMul
		);
		float spiralSwirl = 0.5 + 0.5 * sin(
			((nLocal.x * nLocal.z) * uParamsB.y * 3.4 + latitude * uParamsB.z * 3.6) *
				PI -
			uTime * (2.4 + uMotionIntensity) * speedMul
		);
		float swirl = mix(
			ripple,
			spiralSwirl,
			clamp(uSwirlStrength, 0.0, 1.0)
		);
		float scan = 0.5 + 0.5 * sin(
			(nLocal.y * 18.0 + nLocal.x * 4.0 + nLocal.z * 3.0) -
				uTime * (8.0 + uMotionIntensity * 4.0) * speedMul
		);
		float starField = clamp(
			fbm(
				nLocal * (uParamsA.x * 1.4) +
					vec3(uTime * 0.12 * speedMul, -uTime * 0.08 * speedMul, 0.0)
			),
			0.0,
			1.0
		);
		float starMask = smoothstep(0.62, 0.9, starField);
		float cellMask = 1.0 - smoothstep(0.15, 0.72, vorField);

		float pattern = 0.0;
		float highlightMask = 0.0;

		if (uPatternType < 0.5) {
			pattern = mix(fbmField, swirl, 0.6);
			highlightMask = ripple;
		} else if (uPatternType < 1.5) {
			pattern = mix(stripe, ripple, 0.55);
			highlightMask = stripe;
		} else if (uPatternType < 3.5) {
			pattern = mix(scan, stripe, 0.42);
			highlightMask = scan;
		} else if (uPatternType < 4.5) {
			pattern = clamp(mix(cellMask, stripe, 0.45) + scan * 0.16, 0.0, 1.0);
			highlightMask = cellMask;
		} else if (uPatternType < 5.5) {
			pattern = mix(swirl, stripe, 0.68);
			highlightMask = swirl;
		} else if (uPatternType < 6.5) {
			pattern = mix(fbmField, ripple, 0.25);
			highlightMask = fbmField;
		} else if (uPatternType < 7.5) {
			vec3 pixelGrid = floor((nLocal + 1.0) * (4.0 + uParamsB.w * 0.6));
			float pixels = dot(pixelGrid, vec3(0.73, 1.11, 1.37));
			float pixelPulse = 0.5 + 0.5 * sin(pixels * 1.7 + uTime * 3.2 * speedMul);
			pattern = mix(pixelPulse, scan, 0.35);
		} else if (uPatternType < 8.5) {
			pattern = clamp(mix(fbmField, swirl, 0.5) + starMask * 0.45, 0.0, 1.0);
			highlightMask = starMask;
		} else if (uPatternType < 9.5) {
			float crackLine = 1.0 - smoothstep(0.07, 0.18, abs(vorField - 0.12));
			pattern = clamp((1.0 - crackLine) * 0.35 + swirl * 0.45 + fbmField * 0.2, 0.0, 1.0);
			highlightMask = crackLine;
		} else {
			float bubbleField = voronoi(
				nLocal * (uParamsA.y * 1.35) +
					vec3(
						uTime * 0.07 * speedMul,
						-uTime * 0.09 * speedMul,
						uTime * 0.05 * speedMul
					)
			);
			float bubbleMask = 1.0 - smoothstep(0.22, 0.62, bubbleField);
			float jellyNoise = clamp(
				fbm(
					nLocal * (uParamsA.x * 0.95) +
						vec3(0.0, uTime * 0.12 * speedMul, -uTime * 0.08 * speedMul)
				),
				0.0,
				1.0
			);
			float jellyWave = 0.5 + 0.5 * sin(
				(nLocal.x * 4.2 + nLocal.y * 3.1 + nLocal.z * 3.8) * PI +
					uTime * 2.1 * speedMul
			);
			pattern = clamp(mix(jellyNoise, jellyWave, 0.45) + bubbleMask * 0.2, 0.0, 1.0);
			highlightMask = mix(bubbleMask, jellyWave, 0.35);
		}

		float pulse = 0.5 + 0.5 * sin(
			uTime * (1.4 + uAnimationSpeed) +
			nLocal.x * 9.0 +
			nLocal.y * 7.0 +
			nLocal.z * 5.0
		);
		float highlightStrength = clamp(uHighlightStrength, 0.0, 1.0);
		float specularStrength = clamp(uSpecularStrength, 0.0, 2.0);
		float fresnelStrength = clamp(uFresnelStrength, 0.0, 2.0);

		vec3 palette = mix(uTint, uAccent, pattern);
		palette = mix(
			palette,
			uAccent2,
			smoothstep(0.55, 1.0, highlightMask) *
				(0.35 + pulse * 0.3) *
				highlightStrength
		);

		vec3 keyLight = normalize(vec3(0.45, 0.82, 0.35));
		vec3 fillLight = normalize(vec3(-0.36, 0.24, -0.9));
		float ndlA = max(dot(nWorld, keyLight), 0.0);
		float ndlB = max(dot(nWorld, fillLight), 0.0);
		float diffuse = 0.24 + ndlA * 0.78 + ndlB * 0.26;

		vec3 halfA = normalize(keyLight + viewDir);
		vec3 halfB = normalize(fillLight + viewDir);
		float specA = pow(max(dot(nWorld, halfA), 0.0), 36.0);
		float specB = pow(max(dot(nWorld, halfB), 0.0), 22.0);
		float rim = pow(1.0 - max(dot(nWorld, viewDir), 0.0), uRimPower);

		vec3 shellColor = palette * (0.26 + diffuse * 0.92);
		shellColor +=
			(specA * 0.4 + specB * 0.22) *
			specularStrength *
			mix(vec3(1.0), uAccent2, 0.5);

		vec3 rayDirW = normalize(vWorldPos - cameraPosition);
		vec2 hit = raySphere(
			cameraPosition,
			rayDirW,
			uSphereCenter,
			max(uSphereRadius, 0.001)
		);

		float volumeAlpha = 0.0;
		vec3 volumeColor = vec3(0.0);
		if (hit.x > -0.5 && uDepthStrength > 0.001) {
			float tEnter = max(hit.x, 0.0) + 0.0008;
			float tExit = hit.y;
			float rayLen = max(tExit - tEnter, 0.0001);
			float stepT = rayLen / float(INTERIOR_STEPS);
			float flowTime = uTime * uInteriorFlow;
			float accum = 0.0;

			for (int i = 0; i < INTERIOR_STEPS; i++) {
				float t = tEnter + (float(i) + 0.5) * stepT;
				vec3 samplePosW = cameraPosition + rayDirW * t;
				vec3 samplePosN =
					(samplePosW - uSphereCenter) / max(uSphereRadius, 0.0001);
				float coreMask = 1.0 - smoothstep(0.22, 1.02, length(samplePosN));
				float shape = interiorShape(
					samplePosN * uInteriorScale,
					flowTime + float(i) * 0.19,
					uInteriorShapeType
				);
				float density = shape * coreMask * uDepthDensity * uDepthStrength;
				float opacity = clamp(
					density * (1.85 / float(INTERIOR_STEPS)),
					0.0,
					1.0
				) * (1.0 - accum);
				vec3 sampleColor = mix(
					uAccent,
					uAccent2,
					clamp(shape * 0.8 + coreMask * 0.3, 0.0, 1.0)
				);
				volumeColor += sampleColor * opacity;
				accum += opacity;
			}

			volumeAlpha = clamp(accum, 0.0, 1.0);
		}

		float glow = rim * (0.3 + pattern * 0.65);
		float glassFresnel = pow(
			1.0 - max(dot(nWorld, viewDir), 0.0),
			uGlassFresnelPower
		);
		vec3 glassTint = mix(vec3(0.75, 0.9, 1.0), uAccent2, 0.45);

		vec3 color = shellColor;
		float depthMix = clamp(uDepthStrength * 0.65 + volumeAlpha * 0.75, 0.0, 1.0);
		color = mix(
			color,
			color * (0.58 + uGlassClarity * 0.35) +
				volumeColor * (0.58 + uDepthStrength * 0.92),
			depthMix
		);
		color +=
			glassTint *
			glassFresnel *
			(0.18 + uGlassClarity * 0.22) *
			fresnelStrength;
		color += (uAccent + uAccent2) * 0.5 * glow * uGlowStrength;
		float alpha = 1.0;
		if (uPatternType >= 9.5) {
			float edgeGel = pow(1.0 - max(dot(nWorld, viewDir), 0.0), 1.4);
			alpha = clamp(
				0.42 + volumeAlpha * 0.32 + edgeGel * 0.18 + highlightMask * 0.08,
				0.42,
				0.9
			);
		}

		gl_FragColor = vec4(color, alpha);
	}
`
		},
		STANDARD_ARENA_SHADER: {
			vertexShader: `
	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vWorldPos;
	varying vec3 vViewDirW;

	void main() {
		vLocalPos = position;
		vLocalNormal = normal;

		vec4 worldPos = modelMatrix * vec4(position, 1.0);
		vWorldPos = worldPos.xyz;
		vViewDirW = normalize(cameraPosition - worldPos.xyz);

		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`,
			fragmentShader: `
	uniform float uTime;
	const int ARENA_RIPPLE_COUNT = 4;
	uniform vec3 uArenaHalfExtents;
	uniform float uFaceMode;
	uniform float uHoleMaskEnabled;
	uniform vec2 uHoleHalfExtents;
	uniform vec3 uHalfExtents;
	uniform vec3 uBlueColor;
	uniform vec3 uRedColor;
	uniform vec3 uNeutralColor;
	uniform vec3 uLineColor;
	uniform float uGoalBiasPower;
	uniform float uEndFaceTint;
	uniform float uSideFaceTint;
	uniform float uFloorCeilFaceTint;
	uniform float uBaseBrightness;
	uniform float uVerticalGlowStrength;
	uniform float uGoalAccentBase;
	uniform float uGoalAccentEndBoost;
	uniform float uPrimaryGridScale;
	uniform float uPrimaryGridThickness;
	uniform float uMinorGridScale;
	uniform float uMinorGridThickness;
	uniform vec2 uMinorGridDrift;
	uniform float uPrimaryGridStrength;
	uniform float uMinorGridStrength;
	uniform float uEdgeGlowStrength;
	uniform float uEdgeGlowInner;
	uniform float uEdgeGlowOuter;
	uniform float uGoalHaloInner;
	uniform float uGoalHaloOuter;
	uniform float uGoalHaloStrength;
	uniform float uGoalHaloGoalBoost;
	uniform float uAccentMix;
	uniform float uFresnelPower;
	uniform float uFresnelStrength;
	uniform float uExpansionSpeedScale;
	uniform float uExpansionSpeedMin;
	uniform float uPrimaryExpansionSpeedFactor;
	uniform float uExpansionPulseFrequency;
	uniform float uExpansionPulseSpeed;
	uniform float uExpansionPulseStrength;
	uniform float uExpansionPhase;
	uniform vec4 uRippleCentersAge[ARENA_RIPPLE_COUNT];
	uniform vec4 uRippleNormalsStrength[ARENA_RIPPLE_COUNT];
	uniform float uRippleLifetime;
	uniform float uRippleSpeed;
	uniform float uRippleWidth;
	uniform float uRippleSoftness;
	uniform float uRippleStrength;

	varying vec3 vLocalPos;
	varying vec3 vLocalNormal;
	varying vec3 vWorldPos;
	varying vec3 vViewDirW;

	float axisLineMask(float value, float scale, float thickness) {
		float scaled = value * scale;
		float derivative = max(fwidth(scaled), 1e-4);
		float grid = abs(fract(scaled - 0.5) - 0.5) / derivative;
		return 1.0 - smoothstep(thickness, thickness + 1.0, grid);
	}

	float worldGridField(vec3 pos, float scale, float thickness, vec3 axisWeights) {
		float xLine = axisLineMask(pos.x, scale, thickness) * axisWeights.x;
		float yLine = axisLineMask(pos.y, scale, thickness) * axisWeights.y;
		float zLine = axisLineMask(pos.z, scale, thickness) * axisWeights.z;
		return max(max(xLine, yLine), zLine);
	}

	vec2 safeNormalize2(vec2 value, vec2 fallback) {
		float len = length(value);
		if (len > 1e-4) return value / len;
		return fallback;
	}

	float planeEdgeDistance(vec2 uv) {
		return min(abs(abs(uv.x) - 1.0), abs(abs(uv.y) - 1.0));
	}

	float safeSign(float value) {
		return value < 0.0 ? -1.0 : 1.0;
	}

	vec3 orientToSourceFrame(vec3 value, vec3 sourceNormal) {
		vec3 absSourceNormal = abs(sourceNormal);
		if (absSourceNormal.x > 0.5) {
			return sourceNormal.x > 0.0 ? value : vec3(-value.x, value.y, -value.z);
		}
		if (absSourceNormal.y > 0.5) {
			return sourceNormal.y > 0.0
				? vec3(value.y, -value.x, value.z)
				: vec3(-value.y, value.x, value.z);
		}
		return sourceNormal.z > 0.0
			? vec3(value.z, value.y, -value.x)
			: vec3(-value.z, value.y, value.x);
	}

	vec3 orientExtentsToSourceFrame(vec3 extents, vec3 sourceNormal) {
		vec3 absSourceNormal = abs(sourceNormal);
		if (absSourceNormal.x > 0.5) return extents;
		if (absSourceNormal.y > 0.5) return vec3(extents.y, extents.x, extents.z);
		return vec3(extents.z, extents.y, extents.x);
	}

	float surfaceRippleDistance(
		vec3 worldPos,
		vec3 surfaceNormal,
		vec3 rippleCenter,
		vec3 rippleNormal
	) {
		vec3 sourceFramePos = orientToSourceFrame(worldPos, rippleNormal);
		vec3 sourceFrameNormal = orientToSourceFrame(surfaceNormal, rippleNormal);
		vec3 sourceFrameCenter = orientToSourceFrame(rippleCenter, rippleNormal);
		vec3 sourceFrameExtents = orientExtentsToSourceFrame(
			uArenaHalfExtents,
			rippleNormal
		);
		vec2 sourceUv = sourceFrameCenter.yz;

		if (sourceFrameNormal.x > 0.5) {
			return length(sourceFramePos.yz - sourceUv);
		}
		if (sourceFrameNormal.y > 0.5) {
			vec2 unfoldedUv = vec2(
				sourceFrameExtents.y + (sourceFrameExtents.x - sourceFramePos.x),
				sourceFramePos.z
			);
			return length(unfoldedUv - sourceUv);
		}
		if (sourceFrameNormal.y < -0.5) {
			vec2 unfoldedUv = vec2(
				-sourceFrameExtents.y - (sourceFrameExtents.x - sourceFramePos.x),
				sourceFramePos.z
			);
			return length(unfoldedUv - sourceUv);
		}
		if (sourceFrameNormal.z > 0.5) {
			vec2 unfoldedUv = vec2(
				sourceFramePos.y,
				sourceFrameExtents.z + (sourceFrameExtents.x - sourceFramePos.x)
			);
			return length(unfoldedUv - sourceUv);
		}
		if (sourceFrameNormal.z < -0.5) {
			vec2 unfoldedUv = vec2(
				sourceFramePos.y,
				-sourceFrameExtents.z - (sourceFrameExtents.x - sourceFramePos.x)
			);
			return length(unfoldedUv - sourceUv);
		}

		return 1e6;
	}

	float arenaRippleMask(
		vec3 worldPos,
		vec3 surfaceNormal,
		vec3 center,
		vec3 normal,
		float age,
		float hitStrength
	) {
		if (age < 0.0 || hitStrength <= 0.0) return 0.0;

		float ringRadius = age * uRippleSpeed;
		float ringDist = abs(
			surfaceRippleDistance(worldPos, surfaceNormal, center, normal) - ringRadius
		);
		float ringMask = 1.0 - smoothstep(
			uRippleWidth,
			uRippleWidth + uRippleSoftness,
			ringDist
		);
		float ageFade = 1.0 - smoothstep(
			uRippleLifetime * 0.45,
			uRippleLifetime,
			age
		);
		return ringMask * ageFade * hitStrength;
	}

	void main() {
		vec3 localNormal = normalize(vLocalNormal);
		vec3 absNormal = abs(localNormal);
		vec2 faceUv;
		vec3 surfaceNormal;
		if (
			uHoleMaskEnabled > 0.5 &&
			abs(vLocalPos.y) < uHoleHalfExtents.x &&
			abs(vLocalPos.z) < uHoleHalfExtents.y
		) discard;
		float endFace = 0.0;
		float floorCeilFace = 0.0;
		float sideFace = 0.0;

		if (uFaceMode > 2.5) {
			sideFace = 1.0;
			faceUv = vWorldPos.xy / max(uArenaHalfExtents.xy, vec2(1e-4));
			surfaceNormal = vec3(0.0, 0.0, safeSign(vWorldPos.z));
		} else if (uFaceMode > 1.5) {
			floorCeilFace = 1.0;
			faceUv = vWorldPos.xz / max(uArenaHalfExtents.xz, vec2(1e-4));
			surfaceNormal = vec3(0.0, safeSign(vWorldPos.y), 0.0);
		} else if (uFaceMode > 0.5) {
			endFace = 1.0;
			faceUv = vWorldPos.yz / max(uArenaHalfExtents.yz, vec2(1e-4));
			surfaceNormal = vec3(safeSign(vWorldPos.x), 0.0, 0.0);
		} else if (absNormal.x >= absNormal.y && absNormal.x >= absNormal.z) {
			endFace = 1.0;
			faceUv = vWorldPos.yz / max(uArenaHalfExtents.yz, vec2(1e-4));
			surfaceNormal = vec3(safeSign(vWorldPos.x), 0.0, 0.0);
		} else if (absNormal.y >= absNormal.x && absNormal.y >= absNormal.z) {
			floorCeilFace = 1.0;
			faceUv = vWorldPos.xz / max(uArenaHalfExtents.xz, vec2(1e-4));
			surfaceNormal = vec3(0.0, safeSign(vWorldPos.y), 0.0);
		} else {
			sideFace = 1.0;
			faceUv = vWorldPos.xy / max(uArenaHalfExtents.xy, vec2(1e-4));
			surfaceNormal = vec3(0.0, 0.0, safeSign(vWorldPos.z));
		}

		vec2 face01 = faceUv * 0.5 + 0.5;
		vec3 worldGridPos = vWorldPos / max(uArenaHalfExtents, vec3(1e-4));
		vec2 borderFlowDir = safeNormalize2(
			worldGridPos.yz,
			vec2(0.0, face01.y >= 0.5 ? 1.0 : -1.0)
		);
		vec3 expansionFlow =
			endFace > 0.5
				? vec3(0.0, borderFlowDir.x, borderFlowDir.y)
				: vec3(vWorldPos.x >= 0.0 ? 1.0 : -1.0, 0.0, 0.0);
		float expansionSpeed = max(
			length(uMinorGridDrift) * uExpansionSpeedScale,
			uExpansionSpeedMin
		);
		float expansionDistance =
			endFace > 0.5 ? 1.0 + length(worldGridPos.yz) : abs(worldGridPos.x);
		vec3 primaryGridPos =
			worldGridPos -
			expansionFlow *
				(uExpansionPhase * expansionSpeed * uPrimaryExpansionSpeedFactor);
		vec3 minorGridPos =
			worldGridPos - expansionFlow * (uExpansionPhase * expansionSpeed);
		float primaryGrid = worldGridField(
			primaryGridPos,
			uPrimaryGridScale,
			uPrimaryGridThickness,
			vec3(0.28, 0.88, 1.0)
		);
		float minorGrid = worldGridField(
			minorGridPos,
			uMinorGridScale,
			uMinorGridThickness,
			vec3(0.24, 0.9, 1.0)
		) * uMinorGridStrength;
		float expansionPulse = 0.5 + 0.5 * cos(
			expansionDistance * uExpansionPulseFrequency -
			uExpansionPhase * uExpansionPulseSpeed
		);
		expansionPulse = pow(expansionPulse, 5.0);
		float teamMix = smoothstep(
			-uArenaHalfExtents.x,
			uArenaHalfExtents.x,
			vWorldPos.x
		);
		vec3 teamColor = mix(uBlueColor, uRedColor, teamMix);
		float goalBias = pow(
			clamp(abs(vWorldPos.x) / max(uArenaHalfExtents.x, 1e-4), 0.0, 1.0),
			uGoalBiasPower
		);
		float verticalFade = 1.0 - smoothstep(
			0.0,
			uArenaHalfExtents.y,
			min(abs(vWorldPos.y), uArenaHalfExtents.y)
		);
		float faceTint =
			endFace * uEndFaceTint +
			sideFace * uSideFaceTint +
			floorCeilFace * uFloorCeilFaceTint;

		vec3 baseColor = mix(uNeutralColor, teamColor, faceTint);
		baseColor +=
			teamColor * goalBias * (uGoalAccentBase + endFace * uGoalAccentEndBoost);
		baseColor *= uBaseBrightness + verticalFade * uVerticalGlowStrength;

		float edgeGlow = 1.0 - smoothstep(
			uEdgeGlowInner,
			uEdgeGlowOuter,
			planeEdgeDistance(faceUv)
		);

		vec2 goalUv = face01 * 2.0 - 1.0;
		float goalHalo =
			endFace *
			(1.0 - smoothstep(uGoalHaloInner, uGoalHaloOuter, length(goalUv)));
		float rippleMask = 0.0;
		for (int i = 0; i < ARENA_RIPPLE_COUNT; i++) {
			vec4 rippleCenterAge = uRippleCentersAge[i];
			vec4 rippleNormalStrength = uRippleNormalsStrength[i];
			rippleMask += arenaRippleMask(
				vWorldPos,
				surfaceNormal,
				rippleCenterAge.xyz,
				rippleNormalStrength.xyz,
				rippleCenterAge.w,
				rippleNormalStrength.w
			);
		}
		rippleMask = clamp(rippleMask, 0.0, 1.0);

		float fresnel = pow(
			1.0 - abs(dot(normalize(vLocalNormal), normalize(vViewDirW))),
			uFresnelPower
		);

		vec3 accentColor = mix(uLineColor, teamColor, uAccentMix);
		vec3 rippleColor = mix(uLineColor, teamColor, 0.22 + endFace * 0.18);
		vec3 accents = accentColor * (
			primaryGrid * uPrimaryGridStrength +
			minorGrid +
			expansionPulse * minorGrid * uExpansionPulseStrength +
			edgeGlow * uEdgeGlowStrength
		);
		accents += rippleColor * rippleMask * uRippleStrength;
		accents +=
			teamColor * goalHalo * (uGoalHaloStrength + uGoalHaloGoalBoost * goalBias);
		accents += accentColor * fresnel * uFresnelStrength;

		gl_FragColor = vec4(baseColor + accents, 1.0);
	}
`
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
