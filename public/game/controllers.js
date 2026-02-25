import * as MATH from '../physics/math.js';

/*
------------------
Controller classes
------------------

Controllers only need to implement
`getMoveInputs() -> {Vec3}`
which identfy a direction to move.
The caller of this.getMoveInputs() will (and should!) operate as if it were given a unit direction,
and so the controller _can_ adjust the norm for specific scenarios (say, an AI controller).
Prefer to return a unit vector, if possible.
We avoid a base class here because JS only allows for single-inheritance. Therefore, we leave the option
for a controller to inherit from game object if need be. Otherwise, just implement getMoveInputs.
*/

export class KeyboardController {
	constructor(socket, lrudCodes = ['KeyA', 'KeyD', 'KeyW', 'KeyS'], plane = 'zy') {
		this.keys = new Set();
		this.codes = lrudCodes;
		this.plane = plane;

		// Maybe swap this out for a linkedlist? idk if we get enough inputs for O(N^2) complete dequeue in AnimatedScene.#sync to matter
		this.inputBuffer = [];
		this.seq = 0;
		this.useInputBuffer = false;
		this.socket = socket;

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

	// Returns orthonormal vectors [ e_1, e_2 ] for movement.
	// Input should be a string following (x|y|z)(x|y|z).
	// The first char defines "left/right" movement, the second defines "up/down" movement.
	static dirFromPlane(plane) {
		const e = [new MATH.Vec3(), new MATH.Vec3()];

		for (let i = 0; i < 2; i++) {
			switch (plane[i]) {
				case 'x':
					e[i].assign(1, 0, 0);
					continue;
				case 'y':
					e[i].assign(0, 1, 0);
					continue;
				case 'z':
					e[i].assign(0, 0, 1);
					continue;
			}
		}

		return e;
	}

	getDirection() {
		if ( this.useInputBuffer ) {
			const input = this.inputBuffer.shift();
			return new MATH.Vec3( ...input.direction );
		}

		const left = this.keys.has(this.codes[0]);
		const right = this.keys.has(this.codes[1]);
		const up = this.keys.has(this.codes[2]);
		const down = this.keys.has(this.codes[3]);

		const [e1, e2] = KeyboardController.dirFromPlane(this.plane);

		const retDirection = new MATH.Vec3();

		if (left) retDirection.addVec(e1.clone().scale(-1));
		if (right) retDirection.addVec(e1.clone());
		if (up) retDirection.addVec(e2.clone());
		if (down) retDirection.addVec(e2.clone().scale(-1));

		retDirection.normalize();

		this.inputBuffer.push({ type: 'move', seq: this.seq, ts: Date.now(), direction: [...retDirection] });
		this.socket?.send( this.inputBuffer.at(-1) );
		this.seq++;

		return retDirection;
	}
}
