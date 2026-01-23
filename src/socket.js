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
export default class PongSocketServer {
	#wss = null;
	#wsByClientId = new Map();
	#nextClientId = 1;

	#handlers = [];

	constructor(server, socketPath) {
		this.#wss = new WebSocketServer({ noServer: true });

		this.addHandler(this.#baseMessageHandler);

		server.on('upgrade', (req, socket, head) => {
			const { pathname } = new URL(req.url, 'http://localhost');

			if (pathname !== socketPath) {
				socket.destroy();
				return;
			}

			this.#wss.handleUpgrade(req, socket, head, (ws) => {
				this.#wss.emit('connection', ws, req);
			});
		});

		this.#wss.on('connection', (ws, req) => {
			const url = new URL(req.url, 'http://localhost');
			const clientId = url.searchParams.get('clientId') || this.#nextClientId++;

			this.#wsByClientId.set(clientId, ws);

			this.#safeSend(ws, { type: 'connected', clientId });

			ws.on('message', (raw) => {
				const text = raw.toString();

				let msg = null;
				try {
					msg = JSON.parse(text);
				} catch {
					this.#safeSend(ws, { type: 'error', message: 'Invalid JSON' });
					return;
				}

				if (!msg?.type) {
					this.#safeSend(ws, {
						type: 'error',
						message: 'Missing message type'
					});
					return;
				}

				let handled = false;

				for (const handler of this.#handlers) {
					if (
						handler(this, clientId, ws, msg, (res) => this.#safeSend(ws, res))
					) {
						handled = true;
						break;
					}
				}

				if (!handled) {
					this.#safeSend(ws, {
						type: 'error',
						message: `Unknown message type: ${msg.type}`
					});
				}
			});

			ws.on('close', () => {
				this.#wsByClientId.delete(clientId);
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

	addHandler(func) {
		this.#handlers.push(func);
	}

	#safeSend(ws, obj) {
		if (ws.readyState !== ws.OPEN) return;
		ws.send(JSON.stringify(obj));
	}

	#baseMessageHandler(socket, clientId, ws, msg, respond) {
		if (msg.type === 'ping') {
			respond({ type: 'pong', ts: Date.now() });
			return true;
		}
	}
}
