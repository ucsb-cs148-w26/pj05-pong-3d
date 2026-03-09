import * as THREE from 'three';
import * as Constants from '../constants.js';
import { ShaderRepository } from './shaderLibrary.js';

const DEFAULT_ARENA_DIMENSIONS = Object.freeze({
	width: Constants.ARENA_DEPTH,
	height: Constants.ARENA_SIZE,
	depth: Constants.ARENA_SIZE
});

const DEFAULT_SHADER_MATERIAL_OPTIONS = Object.freeze({
	side: THREE.BackSide
});

export const DEFAULT_ARENA_SHADER_PROFILE = Object.freeze({
	blueColor: 0x1b63ff,
	redColor: 0xff4155,
	neutralColor: 0x06111d,
	lineColor: 0xe6f3ff,
	goalBiasPower: 1.35,
	endFaceTint: 0.92,
	sideFaceTint: 0.52,
	floorCeilFaceTint: 0.34,
	baseBrightness: 0.82,
	verticalGlowStrength: 0.18,
	goalAccentBase: 0.14,
	goalAccentEndBoost: 0.2,
	primaryGridScale: 8.0,
	primaryGridThickness: 1.1,
	minorGridScale: 26.0,
	minorGridThickness: 0.7,
	minorGridDriftX: 0.008,
	minorGridDriftY: -0.004,
	primaryGridStrength: 0.11,
	minorGridStrength: 0.16,
	edgeGlowStrength: 0.18,
	edgeGlowInner: 0.02,
	edgeGlowOuter: 0.16,
	goalHaloInner: 0.22,
	goalHaloOuter: 0.95,
	goalHaloStrength: 0.12,
	goalHaloGoalBoost: 0.12,
	accentMix: 0.65,
	fresnelPower: 2.2,
	fresnelStrength: 0.12,
	expansionSpeedScale: 18.0,
	expansionSpeedMin: 0.08,
	primaryExpansionSpeedFactor: 0.35,
	expansionPulseFrequency: 18.0,
	expansionPulseSpeed: 3.6,
	expansionPulseStrength: 0.22,
	ballSpeedExpansionReference: Constants.BALL_INITIAL_SPEED,
	borderExtensionLengthScale: 3.6,
	borderExtensionInset: 0.05
});

function colorFromValue(value, fallback = 0xffffff) {
	if (value instanceof THREE.Color) return value.clone();
	return new THREE.Color(value ?? fallback);
}

function mergeMaterialOptions(defaults, overrides = {}) {
	return {
		...defaults,
		...(overrides ?? {}),
		extensions: {
			...(defaults.extensions ?? {}),
			...(overrides?.extensions ?? {})
		}
	};
}

function resolveArenaProfile(shaderProfile = {}) {
	return {
		...DEFAULT_ARENA_SHADER_PROFILE,
		...(shaderProfile ?? {})
	};
}

function createArenaUniforms(
	dimensions,
	arenaDimensions = DEFAULT_ARENA_DIMENSIONS,
	faceMode = 0.0,
	holeMaskEnabled = false,
	shaderProfile = {}
) {
	const profile = resolveArenaProfile(shaderProfile);

	return THREE.UniformsUtils.clone({
		uTime: { value: 0.0 },
		uArenaHalfExtents: {
			value: new THREE.Vector3(
				(arenaDimensions.width ?? Constants.ARENA_DEPTH) * 0.5,
				(arenaDimensions.height ?? Constants.ARENA_SIZE) * 0.5,
				(arenaDimensions.depth ?? Constants.ARENA_SIZE) * 0.5
			)
		},
		uFaceMode: { value: faceMode },
		uHoleMaskEnabled: { value: holeMaskEnabled ? 1.0 : 0.0 },
		uHoleHalfExtents: {
			value: new THREE.Vector2(
				(arenaDimensions.height ?? Constants.ARENA_SIZE) * 0.5,
				(arenaDimensions.depth ?? Constants.ARENA_SIZE) * 0.5
			)
		},
		uHalfExtents: {
			value: new THREE.Vector3(
				(dimensions.width ?? Constants.ARENA_DEPTH) * 0.5,
				(dimensions.height ?? Constants.ARENA_SIZE) * 0.5,
				(dimensions.depth ?? Constants.ARENA_SIZE) * 0.5
			)
		},
		uBlueColor: { value: colorFromValue(profile.blueColor, 0x1b63ff) },
		uRedColor: { value: colorFromValue(profile.redColor, 0xff4155) },
		uNeutralColor: { value: colorFromValue(profile.neutralColor, 0x06111d) },
		uLineColor: { value: colorFromValue(profile.lineColor, 0xe6f3ff) },
		uGoalBiasPower: { value: profile.goalBiasPower },
		uEndFaceTint: { value: profile.endFaceTint },
		uSideFaceTint: { value: profile.sideFaceTint },
		uFloorCeilFaceTint: { value: profile.floorCeilFaceTint },
		uBaseBrightness: { value: profile.baseBrightness },
		uVerticalGlowStrength: { value: profile.verticalGlowStrength },
		uGoalAccentBase: { value: profile.goalAccentBase },
		uGoalAccentEndBoost: { value: profile.goalAccentEndBoost },
		uPrimaryGridScale: { value: profile.primaryGridScale },
		uPrimaryGridThickness: { value: profile.primaryGridThickness },
		uMinorGridScale: { value: profile.minorGridScale },
		uMinorGridThickness: { value: profile.minorGridThickness },
		uMinorGridDrift: {
			value: new THREE.Vector2(profile.minorGridDriftX, profile.minorGridDriftY)
		},
		uPrimaryGridStrength: { value: profile.primaryGridStrength },
		uMinorGridStrength: { value: profile.minorGridStrength },
		uEdgeGlowStrength: { value: profile.edgeGlowStrength },
		uEdgeGlowInner: { value: profile.edgeGlowInner },
		uEdgeGlowOuter: { value: profile.edgeGlowOuter },
		uGoalHaloInner: { value: profile.goalHaloInner },
		uGoalHaloOuter: { value: profile.goalHaloOuter },
		uGoalHaloStrength: { value: profile.goalHaloStrength },
		uGoalHaloGoalBoost: { value: profile.goalHaloGoalBoost },
		uAccentMix: { value: profile.accentMix },
		uFresnelPower: { value: profile.fresnelPower },
		uFresnelStrength: { value: profile.fresnelStrength },
		uExpansionSpeedScale: { value: profile.expansionSpeedScale },
		uExpansionSpeedMin: { value: profile.expansionSpeedMin },
		uPrimaryExpansionSpeedFactor: {
			value: profile.primaryExpansionSpeedFactor
		},
		uExpansionPulseFrequency: { value: profile.expansionPulseFrequency },
		uExpansionPulseSpeed: { value: profile.expansionPulseSpeed },
		uExpansionPulseStrength: { value: profile.expansionPulseStrength },
		uExpansionPhase: { value: 0.0 }
	});
}

function createArenaMaterial(
	dimensions,
	arenaDimensions,
	faceMode,
	holeMaskEnabled,
	shaderProfile,
	shaderMaterialOptions = {}
) {
	const shaderPair = ShaderRepository.resolveShaderPair(
		'STANDARD_ARENA_SHADER'
	);
	const uniforms = createArenaUniforms(
		dimensions,
		arenaDimensions,
		faceMode,
		holeMaskEnabled,
		shaderProfile
	);
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: shaderPair.vertexShader,
		fragmentShader: shaderPair.fragmentShader,
		...mergeMaterialOptions(
			DEFAULT_SHADER_MATERIAL_OPTIONS,
			shaderMaterialOptions
		)
	});

	return { material, uniforms };
}

function createArenaSection({
	dimensions,
	arenaDimensions,
	faceMode,
	holeMaskEnabled = false,
	geometry = null,
	position,
	shaderProfile,
	shaderMaterialOptions,
	sectionMaterialOptions = {}
}) {
	const { material, uniforms } = createArenaMaterial(
		dimensions,
		arenaDimensions,
		faceMode,
		holeMaskEnabled,
		shaderProfile,
		{
			...(shaderMaterialOptions ?? {}),
			...(sectionMaterialOptions ?? {})
		}
	);
	const sectionGeometry =
		geometry ??
		new THREE.BoxGeometry(
			dimensions.width,
			dimensions.height,
			dimensions.depth
		);
	const mesh = new THREE.Mesh(sectionGeometry, material);
	mesh.position.copy(position);
	mesh.receiveShadow = true;
	return { mesh, uniforms };
}

function createBorderPlaneGeometry(width, height) {
	const geometry = new THREE.PlaneGeometry(width, height);
	geometry.rotateY(Math.PI * 0.5);
	return geometry;
}

function createBorderSectionConfigs(
	dimensions = DEFAULT_ARENA_DIMENSIONS,
	shaderProfile = {}
) {
	const profile = resolveArenaProfile(shaderProfile);
	const baseWidth = dimensions.width ?? Constants.ARENA_DEPTH;
	const baseHeight = dimensions.height ?? Constants.ARENA_SIZE;
	const baseDepth = dimensions.depth ?? Constants.ARENA_SIZE;
	const inset = profile.borderExtensionInset;
	const outerHeight = baseHeight * profile.borderExtensionLengthScale;
	const outerDepth = baseDepth * profile.borderExtensionLengthScale;
	const borderSections = [];

	for (const direction of [-1, 1]) {
		const x = direction * (baseWidth * 0.5 - inset);

		borderSections.push({
			dimensions: {
				width: 0.0,
				height: outerHeight,
				depth: outerDepth
			},
			faceMode: 1.0,
			holeMaskEnabled: true,
			geometry: createBorderPlaneGeometry(outerDepth, outerHeight),
			sectionMaterialOptions: {
				side: THREE.DoubleSide
			},
			position: new THREE.Vector3(x, 0, 0)
		});
	}

	return borderSections;
}

export class ArenaSkin {
	#dimensions = null;
	#profile = null;
	#visual = null;
	#uniformGroups = [];
	#expansionPhase = 0.0;

	constructor({
		dimensions = DEFAULT_ARENA_DIMENSIONS,
		shaderProfile = {},
		shaderMaterialOptions = {}
	} = {}) {
		this.#profile = resolveArenaProfile(shaderProfile);
		this.#dimensions = {
			...DEFAULT_ARENA_DIMENSIONS,
			...(dimensions ?? {})
		};

		this.#visual = new THREE.Group();

		const sections = [
			{
				dimensions: this.#dimensions,
				faceMode: 0.0,
				position: new THREE.Vector3()
			},
			...createBorderSectionConfigs(this.#dimensions, this.#profile)
		];

		for (const section of sections) {
			const { mesh, uniforms } = createArenaSection({
				dimensions: section.dimensions,
				arenaDimensions: this.#dimensions,
				faceMode: section.faceMode ?? 0.0,
				holeMaskEnabled: section.holeMaskEnabled ?? false,
				geometry: section.geometry,
				position: section.position,
				shaderProfile: this.#profile,
				shaderMaterialOptions,
				sectionMaterialOptions: section.sectionMaterialOptions
			});
			this.#visual.add(mesh);
			this.#uniformGroups.push(uniforms);
		}
	}

	update(dt, ballSpeed = 0.0) {
		const ballSpeedFactor = Math.max(
			ballSpeed / Math.max(this.#profile.ballSpeedExpansionReference, 1e-4),
			1.0
		);
		this.#expansionPhase += dt * ballSpeedFactor;

		for (const uniforms of this.#uniformGroups) {
			if (uniforms?.uTime) uniforms.uTime.value += dt;
			if (uniforms?.uExpansionPhase) {
				uniforms.uExpansionPhase.value = this.#expansionPhase;
			}
		}
	}

	get visual() {
		return this.#visual;
	}

	get dimensions() {
		return { ...this.#dimensions };
	}
}
