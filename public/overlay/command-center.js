class SecureMemorySystem {
    constructor() {
        this.systemMemory = [];
        this.maxMemoryLength = 1000;
        this.loadFromStorage();
    }

    rememberSystemEvent(userMessage, aiResponse, context = {}) {
        const memory = {
            timestamp: new Date().toISOString(),
            user: userMessage,
            ai: aiResponse,
            context: context
        };
        
        this.systemMemory.push(memory);
        
        if (this.systemMemory.length > this.maxMemoryLength) {
            this.systemMemory = this.systemMemory.slice(-this.maxMemoryLength);
        }
        
        this.saveToStorage();
    }

    getRecentContext() {
        return this.systemMemory.slice(-10);
    }

    saveToStorage() {
        try {
            localStorage.setItem('lifeos_system_memory', JSON.stringify(this.systemMemory));
        } catch (e) {
            this.systemMemory = this.systemMemory.slice(-500);
            this.saveToStorage();
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('lifeos_system_memory');
            if (stored) this.systemMemory = JSON.parse(stored);
        } catch (e) {
            this.systemMemory = [];
        }
    }
}

class LifeOSOverlay {
    constructor() {
        this.isAlwaysOnTop = false;
        this.isVoiceMode = false;
        this.isMinimized = false;
        this.currentApp = 'command-center';
        this.baseURL = window.location.origin;
        this.apiKey = 'MySecretKey2025LifeOS';
        this.systemMemory = new SecureMemorySystem();
        this.setupEventListeners();
        this.initializeSystem();
    }

    setupEventListeners() {
        document.getElementById('toggle-pin').addEventListener('click', () => this.toggleAlwaysOnTop());
        document.getElementById('toggle-voice').addEventListener('click', () => this.toggleVoiceMode());
        document.getElementById('minimize').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('council-meeting').addEventListener('click', () => this.startQuickMeeting());
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('text-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });

        document.getElementById('app-selector').addEventListener('change', (e) => {
            this.switchApp(e.target.value);
        });

        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });

        this.makeDraggable();
    }

    switchApp(appId) {
        this.currentApp = appId;
        document.querySelectorAll('.app-content').forEach(app => app.style.display = 'none');
        const selectedApp = document.getElementById(`app-${appId}`);
        if (selectedApp) selectedApp.style.display = 'flex';
    }

    toggleAlwaysOnTop() {
        this.isAlwaysOnTop = !this.isAlwaysOnTop;
        const overlay = document.getElementById('lifeos-overlay');
        const button = document.getElementById('toggle-pin');
        if (this.isAlwaysOnTop) {
            overlay.classList.add('always-on-top');
            button.textContent = '📌 Pinned';
            button.classList.add('active');
        } else {
            overlay.classList.remove('always-on-top');
            button.textContent = '📌 Pin';
            button.classList.remove('active');
        }
    }

    toggleVoiceMode() {
        this.isVoiceMode = !this.isVoiceMode;
        const button = document.getElementById('toggle-voice');
        if (this.isVoiceMode) {
            button.textContent = '🎤 On';
            button.classList.add('active');
        } else {
            button.textContent = '🎤 Voice';
            button.classList.remove('active');
        }
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const overlay = document.getElementById('lifeos-overlay');
        const button = document.getElementById('minimize');
        if (this.isMinimized) {
            overlay.classList.add('minimized');
            button.textContent = '+';
        } else {
            overlay.classList.remove('minimized');
            button.textContent = '−';
        }
    }

    makeDraggable() {
        const overlay = document.getElementById('lifeos-overlay');
        const header = document.querySelector('.overlay-header');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        const dragMouseDown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            overlay.style.top = (overlay.offsetTop - pos2) + "px";
            overlay.style.left = (overlay.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };

        header.onmousedown = dragMouseDown;
    }

    async initializeSystem() {
        this.addMessage('system', '🔗 Connecting to LifeOS AI Council...');
        
        try {
            console.log(`Attempting to connect to: ${this.baseURL}/healthz?key=${this.apiKey}`);
            const response = await fetch(`${this.baseURL}/healthz?key=${this.apiKey}`);
            
            if (response.ok) {
                const data = await response.json();
                this.addMessage('ai', `✅ Connected to LifeOS v${data.version}!\n\n🤖 AI Council Online:\n• Claude\n• ChatGPT\n• Gemini\n• DeepSeek\n• Grok\n\nReady for commands!`, 'Claude');
                console.log('✅ Connected to backend', data);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.addMessage('system', `⚠️ Backend connection failed: ${error.message}\n\nMake sure your server is running at: ${this.baseURL}`);
        }
    }

    async sendMessage() {
        const input = document.getElementById('text-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';
        this.addMessage('system', '⏳ Consulting AI council...');
        
        this.systemMemory.rememberSystemEvent(message, '', { app: this.currentApp });

        try {
            console.log(`Sending to: ${this.baseURL}/api/v1/chat?key=${this.apiKey}`);
            console.log('Message:', message);

            const response = await fetch(`${this.baseURL}/api/v1/chat?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, member: 'claude' })
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Remove the loading message
            const messages = document.getElementById('chat-messages');
            const lastMessage = messages.lastChild;
            if (lastMessage && lastMessage.textContent.includes('⏳ Consulting')) {
                lastMessage.remove();
            }

            if (data.ok && data.response) {
                this.addMessage('ai', data.response, 'Claude');
                this.systemMemory.rememberSystemEvent(message, data.response, { 
                    app: this.currentApp,
                    ai: 'claude',
                    spend: data.spend
                });
            } else if (data.error) {
                this.addMessage('ai', `❌ Error: ${data.error}`, 'System');
            } else {
                this.addMessage('ai', `Unexpected response format`, 'System');
            }
        } catch (error) {
            console.error('Send error:', error);
            const messages = document.getElementById('chat-messages');
            const lastMessage = messages.lastChild;
            if (lastMessage && lastMessage.textContent.includes('⏳ Consulting')) {
                lastMessage.remove();
            }
            this.addMessage('ai', `❌ Connection error: ${error.message}\n\nMake sure server is running at ${this.baseURL}`, 'System');
        }
    }

    addMessage(sender, content, aiName = 'Claude') {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === 'user' ? 'user-message' : sender === 'system' ? 'system-message' : 'ai-message'}`;
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="ai-name">${aiName}</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${content}</div>
            `;
        } else if (sender === 'system') {
            messageDiv.innerHTML = `<div class="message-content"><em>${content}</em></div>`;
        } else {
            messageDiv.innerHTML = `<div class="message-content"><strong>You:</strong> ${content}</div>`;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    handleQuickAction(action) {
        switch (action) {
            case 'upload-file':
                document.getElementById('file-upload').click();
                break;
            case 'request-ideas':
                this.sendMessageDirect('What are 10 improvements you could make to this system?');
                break;
            case 'show-memory':
                const memories = this.systemMemory.getRecentContext();
                if (memories.length > 0) {
                    const summary = memories.map(m => `${m.timestamp.slice(11,16)}: ${m.user.slice(0,50)}`).join('\n');
                    this.addMessage('ai', `📋 Recent conversations:\n${summary}`, 'Memory');
                } else {
                    this.addMessage('ai', '📭 No conversations yet', 'Memory');
                }
                break;
        }
    }

    sendMessageDirect(text) {
        document.getElementById('text-input').value = text;
        this.sendMessage();
    }

    startQuickMeeting() {
        this.addMessage('system', '👥 Starting quick council meeting...');
        this.sendMessageDirect('What is the current system status and what should we focus on next?');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.overlay = new LifeOSOverlay();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('file-upload').addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0 && window.overlay) {
            window.overlay.addMessage('system', `📁 Uploading ${files.length} file(s)...`);
            setTimeout(() => {
                window.overlay.addMessage('ai', `Files processed successfully.`, 'System');
            }, 1500);
        }
    });
});
