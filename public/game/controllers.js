export class KeyboardController {
	constructor(lrudCodes = ['KeyA', 'KeyD', 'KeyW', 'KeyS']) {
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
	}

	getMoveInputs() {
		const left = this.keys.has(this.codes[0]);
		const right = this.keys.has(this.codes[1]);
		const up = this.keys.has(this.codes[2]);
		const down = this.keys.has(this.codes[3]);

		let lr = 0;
		let ud = 0;

		if (left) lr -= 1;
		if (right) lr += 1;
		if (up) ud += 1;
		if (down) ud -= 1;

		const norm = Math.hypot(lr, ud);
		if (norm === 0) return [0, 0];

		return [lr / norm, ud / norm];
	}
}
