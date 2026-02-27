export default class PongSocketClient {
	#ws = null;
	#reconnectTimer = null;
	#pingInterval = null;
	#lastPingTs = null;
	#lastLatencyMs = null;
	#manualClose = false;

	#handlers = new Map();

	constructor() {
		this.addHandler('pong', this.#pong.bind(this));
		this.addHandler('error', this.#error);
	}

	connect() {
		this.#manualClose = false;
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

			const handler = this.#handlers.get(msg.type);
			if (handler === undefined) {
				console.warn('[ws] unknown message type: ', msg);
				return;
			}
			const reply = handler(msg);
			if (reply === undefined || reply.type === undefined) return;
			this.send(reply);
		};

		this.#ws.onclose = (event) => {
			if (this.#pingInterval) {
				clearInterval(this.#pingInterval);
				this.#pingInterval = null;
			}

			if (this.#manualClose) {
				console.log('[ws] closed intentionally');
				return;
			}

			if (event.code === 4001) {
				console.log('[ws] kicked by host');
				window.location = '/';
				return;
			}

			console.log('[ws] closed - will retry');
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

	addHandler(type, func) {
		this.#handlers.set(type, func);
	}

	disconnect(code = 1000, reason = 'Leaving game') {
		this.#manualClose = true;
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
		if (this.#pingInterval) {
			clearInterval(this.#pingInterval);
			this.#pingInterval = null;
		}
		if (this.#ws && this.#ws.readyState <= WebSocket.OPEN) {
			this.#ws.close(code, reason);
		}
	}

	get lastLatencyMs() {
		return this.#lastLatencyMs;
	}

	#getUrl() {
		const locationUrl = new URL(location.href);
		const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
		const url = new URL(
			`${scheme}://${location.host}/lobby/${locationUrl.searchParams.get('code')}`
		);
		url.searchParams.set('username', locationUrl.searchParams.get('username'));
		return url.toString();
	}

	#pong(msg) {
		if (typeof msg.clientTs === 'number')
			this.#lastLatencyMs = Date.now() - msg.clientTs;
	}

	#error(msg) {
		console.warn('[ws] server error:', msg.message);
	}

	#sendPing() {
		this.#lastPingTs = Date.now();
		this.send({ type: 'ping', clientTs: this.#lastPingTs });
	}
}
