import { PaddleCommon } from '../../public/game/common/PaddleCommon.js';

const MAX_QUEUE_LENGTH = 5;

export class PaddleServer extends PaddleCommon {
	#inputQueue = [];
	#lastTs = 0;

	constructor(key, plane, bodyIdentifier, initialX) {
		super(key, plane, bodyIdentifier, initialX);
	}

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

		if (this.#inputQueue.length === 0) return [0, 0];
		const msg = this.#inputQueue.shift();
		this.#lastTs = msg.ts;
		return msg.direction;
	}
}
