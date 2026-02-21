export default class WaitingScreen {
    constructor(socket, lobbyCode, isHost, initialPlayers = [], username = '') {
        this.socket = socket;
        this.lobbyCode = lobbyCode;
        this.isHost = isHost;
        this.players = initialPlayers;
        this.username = username;

        if (!this.socket) {
            console.error("WaitingScreen requires a socket instance.");
            return;
        }

        this.init();
    }

    init() {
        // Create overlay background
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal card
        this.container = document.createElement('div');
        this.container.style.cssText = `
            background: rgba(255,255,255,0.06);
            border: 0.1rem solid rgba(255,255,255,0.10);
            border-radius: 1.1rem;
            box-shadow: 0 0.75rem 2.25rem rgba(0,0,0,0.35);
            padding: 2rem;
            width: 480px;
            max-width: 90vw;
            color: rgba(255,255,255,0.92);
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        `;

        const title = document.createElement('h2');
        title.style.cssText = 'margin-top: 0; font-size: 1.8rem;';
        title.textContent = `Lobby ${this.lobbyCode}`;
        this.container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.style.cssText = 'color: rgba(255,255,255,0.5); margin-top: 0;';
        subtitle.textContent = 'Waiting for players...';
        this.container.appendChild(subtitle);

        this.list = document.createElement('ul');
        this.list.style.cssText = 'padding-left: 1.2rem; font-size: 1.1rem; margin-bottom: 1.5rem;';
        this.container.appendChild(this.list);

        if (this.isHost) {
            this.startBtn = document.createElement('button');
            this.startBtn.textContent = 'Start Game';
            this.startBtn.disabled = true;
            this.startBtn.style.cssText = `
                display: block;
                width: 100%;
                padding: 0.9rem 1rem;
                border-radius: 0.75rem;
                border: 0.1rem solid rgba(0,0,0,0.12);
                background: white;
                color: #0b1020;
                font-weight: 700;
                cursor: not-allowed;
                font-size: 1rem;
                opacity: 0.4;
                transition: opacity 0.15s;
            `;

            this.startBtn.addEventListener('click', () => {
                console.log('[WaitingScreen] Start Game clicked');
                this.socket.send(JSON.stringify({ type: 'startGame' }));
            });

            this.container.appendChild(this.startBtn);
        }

        this.overlay.appendChild(this.container);
        document.body.appendChild(this.overlay);

        this.socket.addEventListener('message', (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                console.error('Invalid JSON from server:', event.data);
                return;
            }

            if (!data?.type) return;

            if (data.type === 'joinedLobby') {
                this.players = data.players || [];
                this.renderPlayers();
            }

            if (data.type === 'lobbyUpdate') {
                this.players = data.players || [];
                this.renderPlayers();
            }

            if (data.type === 'startGame') {
                this.startGame();
            }
        });

        this.renderPlayers();
    }

    renderPlayers() {
        this.list.innerHTML = '';
        this.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.clientId;
            this.list.appendChild(li);
        });

        if (this.isHost && this.startBtn) {
            this.startBtn.disabled = this.players.length < 2;
            this.startBtn.style.opacity = this.players.length < 2 ? '0.4' : '1';
            this.startBtn.style.cursor = this.players.length < 2 ? 'not-allowed' : 'pointer';
        }
    }

    startGame() {
        console.log('[WaitingScreen] Redirecting to /game');

        if (!this.username) {
            console.error('Username missing!');
            return;
        }

        this.socket.close();

        window.location.href =
            `/game?code=${encodeURIComponent(this.lobbyCode)}&username=${encodeURIComponent(this.username)}`;
    }
}