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
	#wsByUsername = new Map();
	#upgradeHandler = null;

	#handlers = new Map();

	constructor(server, socketPath) {
		super();

		this.#server = server;
		this.#wss = new WebSocketServer({ noServer: true });

		this.addHandler('ping', this.#ping);

		this.#upgradeHandler = (req, socket, head) => {
			const { pathname } = new URL(req.url, 'http://localhost');

			if (pathname !== socketPath) {
				socket.destroy();
				return;
			}

			this.#wss.handleUpgrade(req, socket, head, (ws) => {
				this.#wss.emit('connection', ws, req);
			});
		};

		server.on('upgrade', this.#upgradeHandler);

		this.#wss.on('connection', (ws, req) => {
			const url = new URL(req.url, 'http://localhost');
			const username = url.searchParams.get('username');

			this.#wsByUsername.set(username, ws);

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

				const handler = this.#handlers.get(msg.type);
				if ( handler === undefined ) {
					this.safeSend(ws, {
						type: 'error',
						message: `Unknown message type: ${msg.type}`
					});
					return;
				}
				const reply = handler(this, username, ws, msg);
				if ( reply === undefined || reply.type === undefined ) return;
				this.safeSend( ws, reply );

			});

			this.emit('client:connect', username);

			ws.on('close', () => {
				this.#wsByUsername.delete(username);
				this.emit('client:disconnect', username);
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
		for (const [username, ws] of this.#wsByUsername.entries()) {
			if (ws.readyState === WebSocket.OPEN) {
				cb(username, ws);
			}
		}
	}

	addHandler(type, func) {
		this.#handlers.set(type, func);
	}

	stop() {
		this.#server.off('upgrade', this.#upgradeHandler);
	}

	safeSend(ws, obj) {
		if (ws.readyState !== ws.OPEN) return;
		ws.send(JSON.stringify(obj));
	}

	safeSendToUser(username, obj) {
		const ws = this.#wsByUsername.get(username);
		this.safeSend(ws, obj);
	}

	#ping(socket, username, ws, msg) {
		return { type: 'pong', serverTs: Date.now(), clientTs: msg.clientTs };
	}
}
