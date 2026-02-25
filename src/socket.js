import EventEmitter from 'node:events';
import { WebSocketServer } from 'ws';

/*
 * How to use:
 * - Construct with HTTP server instance (see index.js) and path to websocket
 *   (e.g., /ws) (must start with /)
 * - Listen for messages with addHandler(func). The callback should take four
 *   arguments: socket, clientId, ws, msg, respond. socket is this server.
 *   clientId is the client's ID. msg is a JSON object with mandatory field
 *   called "type". respond is a function that takes a JSON object to send back
 *   to the client.
 *   - The handler function should return true to stop the handler chain. If it
 *     does not return anything, subsequent handlers will be called.
 * - Handlers are called in the order they are added.
 */
export default class PongSocketServer extends EventEmitter {
	#server = null;
	#wss = null;
	#wsByClientId = new Map();
	#nextClientId = 1;
	#upgradeHandler = null;

	#handlers = [];

	constructor(server, socketPath) {
		super();

		this.#server = server;
		this.#wss = new WebSocketServer({ noServer: true });

		this.addHandler(this.#baseMessageHandler);

		this.#upgradeHandler = (req, socket, head) => {
			const { pathname } = new URL(req.url, 'http://localhost');

			if (pathname !== socketPath) {
				// Pass to next handler
				return;
			}

			this.#wss.handleUpgrade(req, socket, head, (ws) => {
				this.#wss.emit('connection', ws, req);
			});
		};

		server.on('upgrade', this.#upgradeHandler);

		this.#wss.on('connection', (ws, req) => {
			const url = new URL(req.url, 'http://localhost');
			const clientId = url.searchParams.get('clientId') || this.#nextClientId++;

			this.#wsByClientId.set(clientId, ws);

			this.safeSend(ws, { type: 'connected', clientId });

			ws.on('message', (raw) => {
				const text = raw.toString();

				let msg = null;
				try {
					msg = JSON.parse(text);
				} catch {
					this.safeSend(ws, { type: 'error', message: 'Invalid JSON' });
					return;
				}

				if (!msg?.type) {
					this.safeSend(ws, {
						type: 'error',
						message: 'Missing message type'
					});
					return;
				}

				let handled = false;

				for (const handler of this.#handlers) {
					if (
						handler(this, clientId, ws, msg, (res) => this.safeSend(ws, res))
					) {
						handled = true;
						break;
					}
				}

				if (!handled) {
					this.safeSend(ws, {
						type: 'error',
						message: `Unknown message type: ${msg.type}`
					});
				}
			});

			this.emit('client:connect', clientId);

			ws.on('close', () => {
				this.#wsByClientId.delete(clientId);
				this.emit('client:disconnect', clientId);
			});
		});
	}

	broadcast(obj) {
		this.#wss.clients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(obj));
			}
		});
	}

	forEachClient(cb) {
		for (const [clientId, ws] of this.#wsByClientId.entries()) {
			if (ws.readyState === WebSocket.OPEN) {
				cb(clientId, ws);
			}
		}
	}

	addHandler(func) {
		this.#handlers.push(func);
	}

	stop() {
		this.#server.off('upgrade', this.#upgradeHandler);
	}

	safeSend(ws, obj) {
		if (ws.readyState !== ws.OPEN) return;
		ws.send(JSON.stringify(obj));
	}

	#baseMessageHandler(socket, clientId, ws, msg, respond) {
		if (msg.type === 'ping') {
			respond({ type: 'pong', serverTs: Date.now(), clientTs: msg.clientTs });
			return true;
		}
	}
}
