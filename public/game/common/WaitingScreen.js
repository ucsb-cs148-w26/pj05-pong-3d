// public/game/common/WaitingScreen.js
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

        this.container = document.createElement("div");
        this.container.style.padding = "2rem";
        this.container.style.fontFamily = "sans-serif";
        document.body.appendChild(this.container);

        const title = document.createElement("h1");
        title.textContent = `Lobby ${this.lobbyCode}`;
        this.container.appendChild(title);

        this.list = document.createElement("ul");
        this.container.appendChild(this.list);

        if (this.isHost) {
            this.startBtn = document.createElement("button");
            this.startBtn.textContent = "Start Game";
            this.startBtn.disabled = true;
            this.startBtn.style.marginTop = "1rem";

            this.startBtn.addEventListener("click", () => {
                console.log('[WaitingScreen] Start Game clicked');
                this.socket.send(JSON.stringify({ type: "startGame" }));
            });

            this.container.appendChild(this.startBtn);
        }

        this.socket.addEventListener("message", (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                console.error("Invalid JSON from server:", event.data);
                return;
            }

            if (!data?.type) return;

            if (data.type === "lobbyUpdate") {
                this.players = data.players || [];
                this.renderPlayers();
            }

            if (data.type === "startGame") {
                this.startGame();
            }
        });

        this.renderPlayers();
    }

    renderPlayers() {
        this.list.innerHTML = "";
        this.players.forEach(player => {
            const li = document.createElement("li");
            li.textContent = player.clientId;
            this.list.appendChild(li);
        });

        if (this.isHost && this.startBtn) {
            this.startBtn.disabled = this.players.length < 2;
        }
    }

    startGame() {
        console.log('[WaitingScreen] Redirecting to /game');

        if (!this.username) {
            console.error("Username missing!");
            return;
        }
        this.socket.close();  // ← add this line

        window.location.href =
            `/game?code=${encodeURIComponent(this.lobbyCode)}&username=${encodeURIComponent(this.username)}`;
    }
}