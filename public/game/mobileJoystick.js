const DEFAULT_SIZE = 144;

function getNippleJs() {
	const lib = globalThis.nipplejs;
	if (!lib?.create) {
		throw new Error('nipplejs is not loaded on the page.');
	}

	return lib;
}

export class MobileJoystick {
	constructor({ host, deadZone = 0.15 } = {}) {
		this.host = host ?? document.body;
		this.deadZone = deadZone;
		this.vector = { x: 0, y: 0 };

		this.zone = document.createElement('div');
		this.zone.className = 'touch-joystick-zone';
		this.zone.setAttribute('aria-hidden', 'true');
		this.zone.style.pointerEvents = 'auto';
		document.body.appendChild(this.zone);

		this.manager = getNippleJs().create({
			zone: this.zone,
			mode: 'dynamic',
			color: 'white',
			size: DEFAULT_SIZE,
			fadeTime: 120,
			multitouch: false,
			maxNumberOfNipples: 1,
			restOpacity: 0.35,
			dynamicPage: true,
			follow: false
		});

		this._onMove = (_event, data) => {
			const direction = data?.vector ?? { x: 0, y: 0 };
			const force = Math.min(data?.force ?? 0, 1);

			if (force <= this.deadZone) {
				this.reset();
				return;
			}

			const magnitude = (force - this.deadZone) / (1 - this.deadZone);
			this.vector.x = direction.x * magnitude;
			this.vector.y = direction.y * magnitude;
		};

		this._onEnd = () => {
			this.reset();
		};

		this.manager.on('move', this._onMove);
		this.manager.on('end', this._onEnd);
	}

	getVector() {
		return { ...this.vector };
	}

	reset() {
		this.vector.x = 0;
		this.vector.y = 0;
	}

	destroy() {
		this.reset();
		this.manager?.off('move', this._onMove);
		this.manager?.off('end', this._onEnd);
		this.manager?.destroy();
		this.manager = null;
		this.zone.remove();
	}
}
