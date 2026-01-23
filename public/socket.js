const CLIENT_ID_KEY = 'pong3d_client_id';

export default class PongSocketClient {
	#ws = null;
	#reconnectTimer = null;

	#handlers = [];

	constructor() {
		this.addHandler(this.#baseMessageHandler);
	}

	connect() {
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}

		const url = this.#getUrl();
		console.log('[ws] connecting:', url);

		this.#ws = new WebSocket(url);

		this.#ws.onopen = () => {
			console.log('[ws] connected');
			this.send({ type: 'ping' });
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
			this.#reconnectTimer = setTimeout(this.connect.bind(this), 1000);
		};

		this.#ws.onerror = (err) => {
			console.error('[ws] error:', err);
		};

		// TODO: testing only
		window.addEventListener('keydown', (e) => {
			if (!this.isOpen) return;

			if (e.key.toLowerCase() === ' ') {
				this.send({ type: 'ping' });
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

	#getUrl() {
		let clientId = localStorage.getItem(CLIENT_ID_KEY) || '';

		const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
		const url = new URL(`${scheme}://${location.host}/ws`);
		if (clientId) url.searchParams.set('clientId', clientId);
		return url.toString();
	}

	#baseMessageHandler(msg, respond) {
		if (msg.type === 'pong') {
			console.log('[ws] pong ts=', msg.ts);
			return true;
		}
		if (msg.type === 'error') {
			console.warn('[ws] server error:', msg.message);
			return true;
		}
	}
}
