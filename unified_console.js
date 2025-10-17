// Unified Console Implementation
class UnifiedConsole {
    constructor() {
        this.chatHistory = [];
        this.voiceCommands = [];
        this.socket = new WebSocket('ws://localhost:8080');
        this.init();
    }

    init() {
        this.socket.onmessage = this.handleMessage.bind(this);
    }

    handleMessage(event) {
        const message = JSON.parse(event.data);
        this.chatHistory.push(message);
        this.updateUI();
    }

    sendChat(message) {
        this.socket.send(JSON.stringify({ type: 'chat', content: message }));
    }

    updateUI() {
        // Update chat UI with the latest messages
    }
}

const consoleApp = new UnifiedConsole();