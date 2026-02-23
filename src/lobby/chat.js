export default function chatHandler(socket, username, ws, msg) {
	socket.broadcast({
		type: 'chat',
		content: `[${username}] ${msg.content}`
	});
}
