import { Vec3 } from '../../public/physics/math.js';

const MAX_QUEUE_LENGTH = 5;

export class PaddleController {
	#inputQueue = [];
	#lastTs = 0;

	get lastTs() {
		return this.#lastTs;
	}

	enqueueInput(input) {
		this.#inputQueue.push(input);
	}

	getDirection() {
		if (this.#inputQueue.length > MAX_QUEUE_LENGTH) {
			this.#inputQueue = this.#inputQueue.slice(-MAX_QUEUE_LENGTH);
		}

		if (this.#inputQueue.length === 0) return new Vec3();
		const msg = this.#inputQueue.shift();
		this.#lastTs = msg.ts;
		return new Vec3(...msg.direction);
	}

}

