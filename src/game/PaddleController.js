import { Vec3 } from '../../public/physics/math.js';

const MAX_QUEUE_LENGTH = 5;

export class PaddleController {
	#inputQueue = [];

	constructor() {
		this.ack = 0;
	}

	enqueueInput(input) {
		this.#inputQueue.push(input);
	}

	getDirection() {
		// This would probably only happen if we were getting spammed with packets (trying to spoof the server) or a bunch of packets come in at once
		// So I think this is good logic? Worth looking into
		if (this.#inputQueue.length > MAX_QUEUE_LENGTH) {
			this.#inputQueue = this.#inputQueue.slice(-MAX_QUEUE_LENGTH);
		}

		if (this.#inputQueue.length === 0) return new Vec3();
		const msg = this.#inputQueue.shift();
		this.ack = msg.seq;
		return new Vec3(...msg.direction);
	}
}
