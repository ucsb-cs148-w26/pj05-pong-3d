export default function chatHandler(socket, clientId, ws, msg, respond) {
	if (msg.type === 'chat') {
		socket.broadcast({
			type: 'chat',
			content: `[${clientId}] ${msg.content}`
		});

		return true;
	}
}
