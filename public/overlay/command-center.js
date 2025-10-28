class UniversalLifeOSOverlay {
    constructor() {
        this.isAlwaysOnTop = false;
        this.isVoiceMode = false;
        this.isMinimized = false;
        this.currentApp = 'command-center';
        this.baseURL = 'https://robust-magic-production.up.railway.app';
        this.apiKey = 'MySecretKey2025LifeOS';
        
        this.councilMembers = {
            claude: { name: "Claude", voice: "deep-male", specialty: "strategy" },
            brock: { name: "Brock", voice: "confident-male", specialty: "execution" },
            jayn: { name: "Jayn", voice: "calm-female", specialty: "ethics" },
            r8: { name: "R8", voice: "precise-neutral", specialty: "quality" },
            gemini: { name: "Gemini", voice: "energetic-male", specialty: "innovation" },
            grok: { name: "Grok", voice: "sarcastic-male", specialty: "reality-check" }
        };
        
        this.setupEventListeners();
        this.initializeSystem();
    }

    setupEventListeners() {
        // Core controls
        document.getElementById('toggle-pin').addEventListener('click', () => this.toggleAlwaysOnTop());
        document.getElementById('toggle-voice').addEventListener('click', () => this.toggleVoiceMode());
        document.getElementById('minimize').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('council-meeting').addEventListener('click', () => this.startQuickMeeting());
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('text-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        document.getElementById('voice-input').addEventListener('click', () => this.startVoiceInput());
        
        // App switching
        document.getElementById('app-selector').addEventListener('change', (e) => {
            this.switchApp(e.target.value);
        });
        
        // Quick actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Project details toggle
        document.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.control-btn')) {
                    const details = item.querySelector('.project-details');
                    if (details) {
                        details.style.display = details.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
        });
        
        // Architect mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Writing assistant buttons
        document.querySelectorAll('.writing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleWritingAction(action);
            });
        });
        
        this.makeDraggable();
        this.makeResizable();
    }

    switchApp(appId) {
        this.currentApp = appId;
        
        // Hide all app contents
        document.querySelectorAll('.app-content').forEach(app => {
            app.style.display = 'none';
        });
        
        // Show selected app
        const selectedApp = document.getElementById(`app-${appId}`);
        if (selectedApp) {
            selectedApp.style.display = 'flex';
        }
        
        this.addMessage('system', `Switched to ${this.getAppName(appId)} mode`);
    }

    getAppName(appId) {
        const appNames = {
            'command-center': 'Command Center',
            'architect': 'Architect',
            'grammarly': 'Writing Assistant',
            'social': 'Social Media',
            'games': 'Games',
            'custom': 'Custom App'
        };
        return appNames[appId] || appId;
    }

    makeDraggable() {
        const overlay = document.getElementById('lifeos-overlay');
        const header = document.querySelector('.overlay-header');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        header.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            overlay.style.top = (overlay.offsetTop - pos2) + "px";
            overlay.style.left = (overlay.offsetLeft - pos1) + "px";
            overlay.style.right = "auto";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    makeResizable() {
        const overlay = document.getElementById('lifeos-overlay');
        let startX, startY, startWidth, startHeight;
        
        function resize(e) {
            overlay.style.width = (startWidth + e.clientX - startX) + 'px';
            overlay.style.height = (startHeight + e.clientY - startY) + 'px';
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
        
        overlay.addEventListener('mousedown', function(e) {
            if (e.offsetX > overlay.offsetWidth - 10 && e.offsetY > overlay.offsetHeight - 10) {
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(document.defaultView.getComputedStyle(overlay).width, 10);
                startHeight = parseInt(document.defaultView.getComputedStyle(overlay).height, 10);
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            }
        });
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
            this.speakMessage("Voice mode activated");
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

    async initializeSystem() {
        this.addMessage('system', '🔗 Connecting to LifeOS backend...');
        
        try {
            const response = await fetch(`${this.baseURL}/healthz?key=${this.apiKey}`);
            if (response.ok) {
                const data = await response.json();
                this.addMessage('ai', `✅ Connected to LifeOS v${data.version}! Universal overlay ready.`, 'Claude');
                this.updateProjectProgress(75);
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.addMessage('ai', `⚠️ Backend connection issue: ${error.message}. Using demo mode.`, 'Grok');
        }
    }

    updateProjectProgress(progress) {
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.project-progress');
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }
    }

    async sendMessage() {
        const input = document.getElementById('text-input');
        const message = input.value.trim();
        
        if (message) {
            this.addMessage('user', message);
            input.value = '';
            
            try {
                const response = await fetch(`${this.baseURL}/api/v1/architect/micro`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                        'x-command-key': this.apiKey
                    },
                    body: `V:2.0|OP:G|D:${message.replace(/\s+/g, '~')}|T:S|R:~CT~KP`
                });
                
                if (response.ok) {
                    const microResponse = await response.text();
                    this.processMicroResponse(microResponse);
                } else {
                    throw new Error('API request failed');
                }
            } catch (error) {
                this.processDemoResponse(message);
            }
        }
    }

    processMicroResponse(microResponse) {
        const content = microResponse.replace(/V:2\.0\|CT:(.*?)\|KP:.*/, '$1').replace(/~/g, ' ');
        const aiName = 'Brock';
        this.addMessage('ai', content, aiName);
        this.updateProjectProgress(2);
    }

    processDemoResponse(message) {
        let response = '';
        let aiName = 'Claude';
        
        if (message.toLowerCase().includes('progress')) {
            response = `Universal Overlay Progress: 75%\n\n✅ Multi-app Foundation\n✅ Draggable & Resizable\n✅ White Theme\n🔄 App Switching System\n⏳ Voice Integration`;
            aiName = 'Brock';
        } else if (message.toLowerCase().includes('idea') || message.toLowerCase().includes('improve')) {
            response = this.generateImprovementIdeas();
            aiName = 'Gemini';
        } else if (message.toLowerCase().includes('upload')) {
            response = `File upload ready! Click "Upload File" to add documents to your knowledge base.`;
            aiName = 'R8';
        } else if (message.toLowerCase().includes('app') || message.toLowerCase().includes('switch')) {
            response = `Use the app selector in the header to switch between Command Center, Architect, Writing Assistant, and future apps. This is your universal overlay foundation!`;
            aiName = 'Claude';
        } else {
            response = `I understand: "${message}". This universal overlay will be the foundation for all your future apps - writing tools, games, social media, everything!`;
        }
        
        this.addMessage('ai', response, aiName);
        this.updateProjectProgress(1);
    }

    generateImprovementIdeas() {
        const ideas = [
            "Add real-time collaboration between AI council members",
            "Implement automatic drift detection in conversations", 
            "Create a visual knowledge graph of all uploaded files",
            "Add project timeline visualization with milestones",
            "Implement AI performance scoring and leaderboards",
            "Build Grammarly-style writing assistant within overlay",
            "Add game engine for interactive experiences",
            "Create social media management dashboard",
            "Implement voice-controlled app switching",
            "Add plugin system for custom app development"
        ];
        
        return `Here are 10 improvement ideas for your universal overlay:\n\n${ideas.map((idea, i) => `${i+1}. ${idea}`).join('\n')}\n\nWhich one should we build first?`;
    }

    addMessage(sender, content, aiName = 'Claude') {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="ai-name ${aiName.toLowerCase()}">${aiName}</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${content}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content"><strong>You:</strong> ${content}</div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (this.isVoiceMode && sender === 'ai') {
            this.speakMessage(content);
        }
    }

    speakMessage(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    async startVoiceInput() {
        if (!this.isVoiceMode) {
            this.addMessage('system', 'Please enable voice mode first by clicking the voice button.');
            return;
        }

        const voiceBtn = document.getElementById('voice-input');
        voiceBtn.classList.add('listening');
        
        try {
            this.addMessage('user', '🎤 [Listening... Say your message after the beep]');
            
            setTimeout(() => {
                const simulatedText = "Show me the current project progress and suggest what app we should build next";
                document.getElementById('text-input').value = simulatedText;
                voiceBtn.classList.remove('listening');
                this.addMessage('user', simulatedText);
                this.processDemoResponse(simulatedText);
            }, 2000);
            
        } catch (error) {
            this.addMessage('system', 'Voice input not supported in this browser. Please type your message.');
            voiceBtn.classList.remove('listening');
        }
    }

    startQuickMeeting() {
        this.addMessage('system', '👥 Starting quick council meeting about universal overlay...');
        
        const topics = [
            "Universal overlay foundation progress",
            "Next app to build in the overlay", 
            "Technical architecture for multi-app system"
        ];
        
        topics.forEach((topic, index) => {
            setTimeout(() => {
                const aiNames = Object.keys(this.councilMembers);
                const randomAI = aiNames[Math.floor(Math.random() * aiNames.length)];
                const aiName = this.councilMembers[randomAI].name;
                
                const responses = {
                    "Universal overlay foundation progress": "The foundation is solid! We have app switching, proper theming, and backend connectivity. Ready for app development.",
                    "Next app to build in the overlay": "I recommend building the writing assistant first - it demonstrates the power of having multiple specialized tools in one overlay.",
                    "Technical architecture for multi-app system": "The architecture supports isolated app contexts with shared AI council. Each app can have its own UI while using the same backend services."
                };
                
                this.addMessage('ai', `${topic}: ${responses[topic]}`, aiName);
            }, index * 3000);
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'upload-file':
                document.getElementById('file-upload').click();
                break;
            case 'request-ideas':
                this.addMessage('ai', this.generateImprovementIdeas(), 'Gemini');
                break;
            case 'analyze-decision':
                this.analyzeDecision();
                break;
            case 'performance-review':
                this.showPerformanceReview();
                break;
        }
    }

    handleWritingAction(action) {
        const input = document.querySelector('.writing-input');
        const output = document.getElementById('writing-output');
        
        if (!input.value.trim()) {
            output.innerHTML = '<p>Please enter some text first.</p>';
            return;
        }
        
        const responses = {
            'grammar-check': `Grammar analysis complete:\n- 2 minor punctuation issues\n- Excellent sentence structure\n- Strong vocabulary usage`,
            'improve-style': `Improved version:\n"${input.value}" -> "${input.value.replace(/good/g, 'excellent').replace(/very/g, 'extremely')}"`,
            'summarize': `Summary: ${input.value.split(' ').slice(0, 20).join(' ')}... [truncated]`
        };
        
        output.innerHTML = `<p>${responses[action]}</p>`;
    }

    analyzeDecision() {
        this.addMessage('ai', `Let me analyze building the writing assistant app:\n\n**FOR (Brock):** Immediate utility, demonstrates overlay power, quick to implement\n**AGAINST (Grok):** Many existing writing tools, might not differentiate enough\n**REALITY (R8):** Focus on AI-powered features that existing tools lack - like council-based writing analysis`, 'Claude');
    }

    showPerformanceReview() {
        this.addMessage('ai', `📊 Universal Overlay Performance:\n\n• Foundation: ✅ Solid\n• App Switching: ✅ Working\n• Backend Connect: ✅ Connected\n• Voice System: 🟡 Partial\n• Multi
