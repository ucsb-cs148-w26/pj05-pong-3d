import * as THREE from 'three';

export class GoalAnimationSystem {
	constructor(styleIndex, duration = 5.0) {
		this.styleIndex = styleIndex;
		this.duration = duration;
		this.elapsed = 0.0;
		this.progress = 0.0;
		this.active = false;
		this.color = new THREE.Color(0xffffff);
		this.baseColor = new THREE.Color(0xffffff);
		this.visual = new THREE.Group();
		this.visual.visible = false;
		this.extraUniformGroups = [];
		this.extraColorUniformGroups = [];
		this.autoParticles = true;
	}

	trigger(position, color) {
		this.elapsed = 0.0;
		this.progress = 0.0;
		this.active = true;
		if (this.visual) {
			this.visual.visible = true;
			this.visual.position.copy(position);
		}

		if (color !== undefined && color !== null) {
			this.color.set(color);
		} else {
			this.color.copy(this.baseColor);
		}

		this.applyColor(this.color);
		this.resetCommonState();

		if (typeof this.configureVisibility === 'function') {
			this.configureVisibility();
		}
		if (typeof this.initParticles === 'function') {
			this.initParticles();
		}
		if (typeof this.afterTrigger === 'function') {
			this.afterTrigger();
		}

		this.markParticleBuffersDirty();
	}

	update(dt) {
		if (!this.active) return;

		this.elapsed += dt;
		this.progress = Math.min(1.0, this.elapsed / this.duration);

		this.updateUniforms(dt, this.progress);

		if (this.autoParticles) {
			this.updateParticleSystems(dt);
		}

		if (typeof this.onUpdate === 'function') {
			this.onUpdate(dt, this.progress);
		}

		if (this.progress >= 1.0) {
			this.active = false;
			if (this.visual) this.visual.visible = false;
		}
	}

	registerUniformGroups(groups = []) {
		this.extraUniformGroups = groups.filter(Boolean);
	}

	registerColorUniformGroups(groups = []) {
		this.extraColorUniformGroups = groups.filter(Boolean);
	}

	applyColorToUniforms(uniforms, color) {
		if (uniforms?.uColor) uniforms.uColor.value.set(color);
	}

	applyColor(color) {
		this.applyColorToUniforms(this.uniforms, color);
		this.applyColorToUniforms(this.ringUniforms, color);
		this.applyColorToUniforms(this.particleUniforms, color);
		for (const uniforms of this.extraColorUniformGroups) {
			this.applyColorToUniforms(uniforms, color);
		}
	}

	updateUniformGroup(uniforms, dt, progress) {
		if (uniforms?.uTime) uniforms.uTime.value += dt;
		if (uniforms?.uProgress) uniforms.uProgress.value = progress;
	}

	updateUniforms(dt, progress) {
		this.updateUniformGroup(this.uniforms, dt, progress);
		this.updateUniformGroup(this.ringUniforms, dt, progress);
		this.updateUniformGroup(this.particleUniforms, dt, progress);
		for (const uniforms of this.extraUniformGroups) {
			this.updateUniformGroup(uniforms, dt, progress);
		}
	}

	updateParticleSystems(dt) {
		if (this.particleSystem && this.particlePoints?.geometry) {
			this.particleSystem.update(dt);
			this.particleSystem.markDirty(this.particlePoints.geometry);
		}
		if (this.sparkSystem && this.sparkPoints?.geometry) {
			this.sparkSystem.update(dt);
			this.sparkSystem.markDirty(this.sparkPoints.geometry);
		}
	}

	resetCommonState() {
		if (this.uniforms?.uProgress) this.uniforms.uProgress.value = 0.0;
		if (this.ringUniforms?.uProgress) this.ringUniforms.uProgress.value = 0.0;
		if (this.particleUniforms?.uProgress)
			this.particleUniforms.uProgress.value = 0.0;

		this.coreMesh?.scale?.set(1, 1, 1);
		this.ringMesh?.scale?.set(1, 1, 1);
		this.ringMesh2?.scale?.set(1, 1, 1);
		this.ringMesh3?.scale?.set(1, 1, 1);
		this.particlePoints?.scale?.set(1, 1, 1);
		this.sparkPoints?.scale?.set(1, 1, 1);

		this.coreMesh?.rotation?.set(0, 0, 0);
		this.ringMesh?.rotation?.set(0, 0, 0);
		this.ringMesh2?.rotation?.set(Math.PI / 2, 0, 0);
		this.ringMesh3?.rotation?.set(0, 0, Math.PI / 2);

		if (this.flareSprite?.material) this.flareSprite.material.opacity = 0.0;

		if (this.flareSprite) this.flareSprite.visible = false;
		if (this.coreMesh) this.coreMesh.visible = true;
		if (this.ringMesh) this.ringMesh.visible = true;
		if (this.ringMesh2) this.ringMesh2.visible = true;
		if (this.ringMesh3) this.ringMesh3.visible = true;
		if (this.sparkPoints) this.sparkPoints.visible = false;
	}

	markParticleBuffersDirty() {
		if (this.particlePoints?.geometry?.attributes?.position) {
			this.particlePoints.geometry.attributes.position.needsUpdate = true;
		}
		if (this.particlePoints?.geometry?.attributes?.aSize) {
			this.particlePoints.geometry.attributes.aSize.needsUpdate = true;
		}
		if (this.sparkPoints?.geometry?.attributes?.position) {
			this.sparkPoints.geometry.attributes.position.needsUpdate = true;
		}
		if (this.sparkPoints?.geometry?.attributes?.aSize) {
			this.sparkPoints.geometry.attributes.aSize.needsUpdate = true;
		}
	}
}

export class GoalAnimationController {
	constructor(styles) {
		this.styles = styles ?? new Map();
		this.currentStyle = 0;
		this.currentAnimation = this.styles.get(0);
		this.visual = new THREE.Group();
		this.visual.visible = true;
		this.active = false;
		this.progress = 0.0;
		this.color = new THREE.Color(0xffffff);

		for (const style of this.styles.values()) {
			if (style?.visual) this.visual.add(style.visual);
		}
	}

	trigger(position, color, style = 0) {
		this.currentStyle = style;
		this.currentAnimation = this.styles.get(style) ?? this.styles.get(0);
		if (!this.currentAnimation) return;
		for (const animation of this.styles.values()) {
			if (!animation || animation === this.currentAnimation) continue;
			animation.active = false;
			if (animation.visual) animation.visual.visible = false;
		}
		this.currentAnimation.trigger(position, color);
		this.active = true;
		this.progress = 0.0;
		this.color.copy(this.currentAnimation.color);
	}

	update(dt) {
		if (!this.currentAnimation) return;
		this.currentAnimation.update(dt);
		this.active = this.currentAnimation.active;
		this.progress = this.currentAnimation.progress;
		this.color.copy(this.currentAnimation.color);
	}
}
