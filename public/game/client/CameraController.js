import * as THREE from 'three';
import { GameObjectBase } from '../common/GameObject.js';

/**
 * Camera controller for following the target paddle, looking at the ball, and allowing for camera-shake behavior. (to make collisions or goals more impactful feeling)
 */
export class CameraController extends GameObjectBase {
	constructor(key, followTarget, lookTarget, config = {}) {
		super(key);

		this.followTarget = followTarget;
		this.lookTarget = lookTarget;

		this.offset = config.offset ?? new THREE.Vector3(-6, 3, 0);
		this.lookLerpSpeed = config.lookLerpSpeed ?? 2;
		this.shakeSpeed = config.shakeSpeed ?? 28;
		this.shakeDecay = config.shakeDecay ?? 8;

		this.shakeTimer = 0;
		this.shakeIntensity = 0;
		this._shakePhase = 0;
		this._lookInitialized = false;

		this._shakeOffset = new THREE.Vector3();
		this._tmpFollowTarget = new THREE.Vector3();
		this._tmpLookTarget = new THREE.Vector3();
		this._currentLookAt = new THREE.Vector3();
	}

	init(scene) {
		this.scene = scene;
		this.camera = scene.camera;
	}

	static _copyPosition(source, out) {
		const pos = source?.position ?? source?.body?.x ?? source;
		out.set(pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0);
		return out;
	}

	addShake(intensity = 0.4, duration = 0.2) {
		this.shakeTimer = Math.max(this.shakeTimer, duration);
		this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
	}

	_updateShake(dt) {
		this._shakeOffset.set(0, 0, 0);
		if (this.shakeTimer <= 0 || this.shakeIntensity <= 0) return;

		this._shakePhase += dt * this.shakeSpeed;
		this._shakeOffset.set(
			Math.sin(this._shakePhase) * this.shakeIntensity,
			Math.cos(this._shakePhase * 0.9) * this.shakeIntensity,
			Math.sin(this._shakePhase * 0.5) * this.shakeIntensity
		);

		this.shakeTimer = Math.max(0, this.shakeTimer - dt);
		this.shakeIntensity *= Math.exp(-this.shakeDecay * dt);
		if (this.shakeTimer <= 0) this.shakeIntensity = 0;
	}

	update(dt) {
		if (!this.followTarget || !this.lookTarget || this.scene.isReplaying)
			return;

		CameraController._copyPosition(this.followTarget, this._tmpFollowTarget);
		this.camera.position.copy(this._tmpFollowTarget).add(this.offset);

		CameraController._copyPosition(this.lookTarget, this._tmpLookTarget);
		if (!this._lookInitialized) {
			this._currentLookAt.copy(this._tmpLookTarget);
			this._lookInitialized = true;
		} else {
			const lookStep = Math.min(1, this.lookLerpSpeed * dt);
			this._currentLookAt.lerp(this._tmpLookTarget, lookStep);
		}

		this._updateShake(dt);
		this.camera.position.add(this._shakeOffset);
		this.camera.lookAt(this._currentLookAt);
	}
}
