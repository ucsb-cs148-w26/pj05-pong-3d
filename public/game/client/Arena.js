import { ArenaCommon } from '../common/ArenaCommon.js';
import { ArenaSkin } from '../shaders/arenaSkin.js';

/**
 * Client-side Arena with THREE.js rendering
 * Extends ArenaCommon to add visual representation
 */
export class Arena extends ArenaCommon {
	#visual = null;
	#skin = null;
	#scene = null;
	#ball = null;

	constructor(key) {
		super(key);

		// Create THREE.js visual representation
		this.#skin = new ArenaSkin();
		this.#visual = this.#skin.visual;
	}

	init(scene) {
		this.#scene = scene;
	}

	update(dt) {
		if (!this.#ball) this.#ball = this.#scene?.getGameObject('ball') ?? null;
		this.#skin.update(dt, this.#ball?.body?.v?.norm?.() ?? 0.0);
	}

	get visual() {
		return this.#visual;
	}
}
