import * as Constants from '../constants.js';
import { KeyboardController } from '../controllers.js';
import { PaddleCommon } from '../common/PaddleCommon.js';
import { PADDLE_STYLE_CATALOG, PaddleSkin } from '../shaders/paddleSkin.js';
import { Vec3 } from '../../physics/math.js';

/**
 * Client-side Paddle with THREE.js rendering
 * Extends PaddleCommon to add visual representation
 */
export class Paddle extends PaddleCommon {
	#visual = null;
	#skin = null;

	constructor(
		key,
		socket,
		bodyIdentifier,
		initialX,
		controller = new KeyboardController(socket)
	) {
		super(key, controller, bodyIdentifier, initialX);

		this.#skin = new PaddleSkin({
			dimensions: {
				width: Constants.PADDLE_THICKNESS,
				height: Constants.PADDLE_HEIGHT,
				depth: Constants.PADDLE_DEPTH
			}
		});
		this.#visual = this.#skin.visual;
		this.#visual.castShadow = true;
		this.#visual.receiveShadow = true;
	}

	init(scene) {
		super.init(scene);
	}

	update(dt) {
		super.update(dt);

		this.#skin.update(dt, this.body.v.norm());
	}

	setSkinStyle(styleIndex, options = {}) {
		return this.#skin.setStyle(styleIndex, options);
	}

	setSkinColor(color) {
		this.#skin.setColor(color);
	}

	resetSkinColor() {
		this.#skin.resetColor();
	}

	kill() {
		this.#skin.dispose();
	}

	get visual() {
		return this.#visual;
	}

	get styleIndex() {
		return this.#skin.styleIndex;
	}

	get styleCatalog() {
		return PADDLE_STYLE_CATALOG;
	}
}
