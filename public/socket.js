export default class PongSocketClient {
	#ws = null;
	#reconnectTimer = null;
	#pingInterval = null;
	#lastPingTs = null;
	#lastLatencyMs = null;

	#handlers = [];

	constructor() {
		this.addHandler(this.#baseMessageHandler.bind(this));
	}

	connect() {
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
		if (this.#pingInterval) {
			clearInterval(this.#pingInterval);
			this.#pingInterval = null;
		}

		const url = this.#getUrl();
		console.log('[ws] connecting:', url);

		this.#ws = new WebSocket(url);

		this.#ws.onopen = () => {
			console.log('[ws] connected');
			this.#sendPing();
			this.#pingInterval = setInterval(() => {
				this.#sendPing();
			}, 1000);
		};

		this.#ws.onmessage = (event) => {
			let msg;
			try {
				msg = JSON.parse(event.data);
			} catch (e) {
				console.warn('[ws] invalid json:', event.data);
				return;
			}

			if (!msg?.type) {
				return;
			}

			for (const handler of this.#handlers) {
				if (handler(msg, this.send.bind(this))) {
					break;
				}
			}
		};

		this.#ws.onclose = () => {
			console.log('[ws] closed - will retry');
			if (this.#pingInterval) {
				clearInterval(this.#pingInterval);
				this.#pingInterval = null;
			}
			this.#reconnectTimer = setTimeout(this.connect.bind(this), 1000);
		};

		this.#ws.onerror = (err) => {
			console.error('[ws] error:', err);
		};

		// TODO: testing only
		window.addEventListener('keydown', (e) => {
			if (!this.isOpen) return;

			if (e.key.toLowerCase() === ' ') {
				this.#sendPing();
			}
		});
	}

	get isOpen() {
		return this.#ws && this.#ws.readyState === WebSocket.OPEN;
	}

	send(obj) {
		if (!this.isOpen) return;
		this.#ws.send(JSON.stringify(obj));
	}

	addHandler(func) {
		this.#handlers.push(func);
	}

	get lastLatencyMs() {
		return this.#lastLatencyMs;
	}

	#getUrl() {
		const locationUrl = new URL(location.href);
		const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
		return `${scheme}://${location.host}/lobby/${locationUrl.searchParams.get('code')}`;
	}

	#baseMessageHandler(msg, respond) {
		if (msg.type === 'pong') {
			if (typeof msg.clientTs === 'number') {
				this.#lastLatencyMs = Date.now() - msg.clientTs;
			}
			return true;
		}
		if (msg.type === 'error') {
			console.warn('[ws] server error:', msg.message);
			return true;
		}
	}

	#sendPing() {
		this.#lastPingTs = Date.now();
		this.send({ type: 'ping', clientTs: this.#lastPingTs });
	}
}
