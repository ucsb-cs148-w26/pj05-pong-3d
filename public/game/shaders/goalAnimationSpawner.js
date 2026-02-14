import * as THREE from 'three';
import {
	GOAL_ANIMATION_CONFIGS,
	resolveGoalAnimationConfig
} from './animationConfigRegistry.js';
import { ConfigurableGoalAnimation } from './configurableGoalAnimation.js';

function toVector3(position) {
	if (position instanceof THREE.Vector3) return position;
	if (Array.isArray(position)) {
		return new THREE.Vector3(
			position[0] ?? 0,
			position[1] ?? 0,
			position[2] ?? 0
		);
	}
	if (position && typeof position === 'object') {
		return new THREE.Vector3(position.x ?? 0, position.y ?? 0, position.z ?? 0);
	}
	return new THREE.Vector3(0, 0, 0);
}

export class GoalAnimationSpawner {
	constructor({
		configs = GOAL_ANIMATION_CONFIGS,
		initialPoolSize = 0,
		maxPoolSize = 8
	} = {}) {
		this.visual = new THREE.Group();
		this.visual.visible = true;
		this.maxPoolSize = Math.max(1, maxPoolSize);
		this.pools = new Map();
		this.active = false;
		this.progress = 0.0;
		this.color = new THREE.Color(0xffffff);
		this.lastTriggered = null;

		for (const config of configs) {
			if (!config?.id) continue;
			this.pools.set(config.id, {
				config,
				instances: []
			});
		}

		if (initialPoolSize > 0) {
			for (const pool of this.pools.values()) {
				for (let i = 0; i < initialPoolSize; i++) {
					this.createPooledInstance(pool);
				}
			}
		}
	}

	getPool(animationKey) {
		const config = resolveGoalAnimationConfig(animationKey);
		const id = config?.id ?? GOAL_ANIMATION_CONFIGS[0].id;
		if (!this.pools.has(id)) {
			this.pools.set(id, {
				config,
				instances: []
			});
		}
		return this.pools.get(id);
	}

	createPooledInstance(pool) {
		const instance = new ConfigurableGoalAnimation(pool.config);
		instance.visual.visible = false;
		pool.instances.push(instance);
		this.visual.add(instance.visual);
		return instance;
	}

	acquire(animationKey) {
		const pool = this.getPool(animationKey);

		for (const instance of pool.instances) {
			if (!instance.active) return instance;
		}

		if (pool.instances.length < this.maxPoolSize) {
			return this.createPooledInstance(pool);
		}

		return pool.instances[0] ?? this.createPooledInstance(pool);
	}

	spawnGoalAnimation(animationKey, color, position) {
		const instance = this.acquire(animationKey);
		const spawnPosition = toVector3(position);
		instance.trigger(spawnPosition, color);
		this.lastTriggered = instance;
		this.active = true;
		this.progress = instance.progress;
		this.color.copy(instance.color);
		return instance;
	}

	trigger(position, color, style = 0) {
		return this.spawnGoalAnimation(style, color, position);
	}

	update(dt) {
		let anyActive = false;
		let maxProgress = 0.0;
		let representative = this.lastTriggered;

		for (const pool of this.pools.values()) {
			for (const instance of pool.instances) {
				if (!instance.active) continue;
				instance.update(dt);
				anyActive = anyActive || instance.active;
				maxProgress = Math.max(maxProgress, instance.progress);
				representative = instance;
			}
		}

		this.active = anyActive;
		this.progress = maxProgress;
		if (representative?.color) {
			this.color.copy(representative.color);
		}
	}
}

const defaultGoalAnimationSpawner = new GoalAnimationSpawner();

export function getDefaultGoalAnimationSpawner() {
	return defaultGoalAnimationSpawner;
}

export function spawnGoalAnimation(animationKey, color, position) {
	return defaultGoalAnimationSpawner.spawnGoalAnimation(
		animationKey,
		color,
		position
	);
}
