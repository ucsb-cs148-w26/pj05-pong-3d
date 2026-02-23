const MAX_CHAT = 100;

export function initChat(socket) {
	const chatText = document.getElementById('chat__text');
	const chatbox = document.getElementById('chat__box');

	window.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			if (document.activeElement === chatbox) {
				socket.send({
					type: 'chat',
					content: chatbox.value
				});

				chatbox.value = '';
				chatbox.blur();
			} else {
				chatbox.focus();
			}
		}

		if (e.key === 'Escape' && document.activeElement === chatbox) {
			chatbox.value = '';
			chatbox.blur();
		}
	});

	let msgs = [];
	socket.addHandler('chat', (msg, respond) => {
		msgs.push(msg.content);
		msgs = msgs.slice(-MAX_CHAT);
		chatText.innerText = msgs.join('\n');
		return true;
	});
}
