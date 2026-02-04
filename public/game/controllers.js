import { Vec3 } from '../physics/math.js';

export class KeyboardController {
	constructor(plane = 'xz', lrudCodes = ['KeyA', 'KeyD', 'KeyW', 'KeyS']) {
		this.plane = plane;
		this.keys = new Set();
		this.codes = lrudCodes;

		this._onKeyDown = (e) => {
			if (document.activeElement.tagName === 'INPUT') return;
			this.keys.add(e.code);
		};

		this._onKeyUp = (e) => {
			if (document.activeElement.tagName === 'INPUT') return;
			this.keys.delete(e.code);
		};

		window.addEventListener('keydown', this._onKeyDown);
		window.addEventListener('keyup', this._onKeyUp);

		this._dir = new Vec3();
	}

	checkMoveInputs() {
		let x = 0,
			y = 0,
			z = 0;

		const left = this.keys.has(this.codes[0]);
		const right = this.keys.has(this.codes[1]);
		const up = this.keys.has(this.codes[2]);
		const down = this.keys.has(this.codes[3]);

		switch (this.plane) {
			case 'xy':
				if (left) x -= 1;
				if (right) x += 1;
				if (down) y -= 1;
				if (up) y += 1;
				break;

			case 'xz':
				if (left) x -= 1;
				if (right) x += 1;
				if (up) z -= 1;
				if (down) z += 1;
				break;

			case 'yz':
				if (down) y -= 1;
				if (up) y += 1;
				if (left) z -= 1;
				if (right) z += 1;
				break;

			default:
				throw new Error(`Unknown plane: ${this.plane}`);
		}

		if (x === 0 && y === 0 && z === 0) {
			return null;
		}

		this._dir.assign(x, y, z).normalize();
		return this._dir;
	}
}
