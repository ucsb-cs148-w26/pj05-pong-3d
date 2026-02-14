import * as THREE from 'three';

export class GoalAssetFactory {
	static createCore(geometry, material) {
		const coreGeometry = geometry ?? new THREE.IcosahedronGeometry(1.2, 4);
		return new THREE.Mesh(coreGeometry, material);
	}

	static createRingGeometry({
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

	static createRing(geometry, material) {
		return new THREE.Mesh(geometry, material);
	}

	static createParticles(count, material) {
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

	static createFlare() {
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

	static createCrystalSpireBase(
		material,
		{
			radius = 1.35,
			detail = 1,
			positionY = -2.0,
			scale = [2.7, 0.46, 2.7]
		} = {}
	) {
		const geometry = new THREE.IcosahedronGeometry(radius, detail);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(0, positionY, 0);
		mesh.scale.set(scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
		return mesh;
	}

	static resolveMaterial(materials, keyOrMaterial) {
		if (!keyOrMaterial) return null;
		if (
			typeof keyOrMaterial === 'object' &&
			(keyOrMaterial.isMaterial || keyOrMaterial.type)
		) {
			return keyOrMaterial;
		}
		return materials?.[keyOrMaterial] ?? null;
	}

	static createGeometry(geometryConfig = {}) {
		if (!geometryConfig || typeof geometryConfig !== 'object') return null;

		const type = geometryConfig.type ?? 'icosahedron';

		if (type === 'ring') {
			return GoalAssetFactory.createRingGeometry(geometryConfig);
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
		if (type === 'plane') {
			return new THREE.PlaneGeometry(
				geometryConfig.width ?? 1,
				geometryConfig.height ?? 1,
				geometryConfig.widthSegments ?? 1,
				geometryConfig.heightSegments ?? 1
			);
		}
		if (type === 'box') {
			return new THREE.BoxGeometry(
				geometryConfig.width ?? 1,
				geometryConfig.height ?? 1,
				geometryConfig.depth ?? 1
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
		if (type === 'custom' && typeof geometryConfig.build === 'function') {
			return geometryConfig.build();
		}

		return null;
	}

	static applyTransform(object3d, transform = {}) {
		if (!object3d || !transform) return;

		const applyVec3 = (target, value) => {
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
		};

		applyVec3(object3d.position, transform.position);
		applyVec3(object3d.rotation, transform.rotation);
		applyVec3(object3d.scale, transform.scale);
	}

	static createAssetsFromConfig({
		animation,
		assets = [],
		materials = {}
	} = {}) {
		const created = [];

		const resolveParticleStoreKeys = (assetConfig) => {
			const key = assetConfig.key ?? 'particles';
			const prefix = key.endsWith('Points') ? key.slice(0, -6) : key;
			const store = assetConfig.store ?? {};
			return {
				positions: store.positions ?? `${prefix}Positions`,
				velocities: store.velocities ?? `${prefix}Velocities`,
				sizes: store.sizes ?? `${prefix}Sizes`,
				count: store.count ?? `${prefix}Count`,
				geometry: store.geometry ?? `${prefix}Geometry`
			};
		};

		for (const assetConfig of assets) {
			if (!assetConfig || assetConfig.enabled === false) continue;

			const type = assetConfig.type;
			const key = assetConfig.key;
			let asset = null;

			if (type === 'core') {
				const geometry = assetConfig.geometry
					? GoalAssetFactory.createGeometry(assetConfig.geometry)
					: null;
				const material = GoalAssetFactory.resolveMaterial(
					materials,
					assetConfig.material ?? 'material'
				);
				asset = GoalAssetFactory.createCore(geometry, material);
			} else if (type === 'ring') {
				const geometryConfig = assetConfig.geometry ?? {};
				const geometry =
					geometryConfig.type === 'ring' || !geometryConfig.type
						? GoalAssetFactory.createRingGeometry(geometryConfig)
						: GoalAssetFactory.createGeometry(geometryConfig);
				const material = GoalAssetFactory.resolveMaterial(
					materials,
					assetConfig.material ?? 'ringMaterial'
				);
				asset = GoalAssetFactory.createRing(geometry, material);
			} else if (type === 'particles') {
				const material = GoalAssetFactory.resolveMaterial(
					materials,
					assetConfig.material ?? 'particleMaterial'
				);
				const particles = GoalAssetFactory.createParticles(
					assetConfig.count ?? 100,
					material
				);
				asset = particles.points;
				if (animation) {
					const storeKeys = resolveParticleStoreKeys(assetConfig);
					animation[storeKeys.positions] = particles.positions;
					animation[storeKeys.velocities] = particles.velocities;
					animation[storeKeys.sizes] = particles.sizes;
					animation[storeKeys.count] = particles.count;
					animation[storeKeys.geometry] = particles.geometry;
				}
			} else if (type === 'flare') {
				asset = GoalAssetFactory.createFlare();
			} else if (type === 'custom' && typeof assetConfig.build === 'function') {
				asset = assetConfig.build({
					animation,
					materials,
					THREE,
					GoalAssetFactory
				});
			}

			if (!asset) continue;

			const addAsset = (instance) => {
				if (!instance) return;
				GoalAssetFactory.applyTransform(instance, assetConfig.transform);
				if (assetConfig.visible !== undefined) {
					instance.visible = !!assetConfig.visible;
				}
				if (animation && key) {
					animation[key] = instance;
				}
				if (
					animation?.visual &&
					assetConfig.addToVisual !== false &&
					instance !== animation.visual
				) {
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
}
