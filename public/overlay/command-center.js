/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    COMMAND CENTER - Personal Control Interface                  ║
 * ║                    Conference-style AI communication with full control         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

class CommandCenter {
  constructor() {
    this.apiBase = window.location.origin;
    this.commandKey = localStorage.getItem('lifeos_cmd_key') || '';
    this.conversationHistory = [];
    this.activeProjects = [];
    this.activeAIs = new Set();
    this.isRecording = false;
    this.recognition = null;
    
    this.init();
  }

  async init() {
    // Load saved conversation
    this.loadConversation();
    
    // Initialize voice recognition
    this.initVoiceRecognition();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadProjects();
    await this.loadDashboard();
    await this.updateConferenceView();
    
    // Auto-scroll to bottom
    this.scrollToBottom();
    
    // Check for new messages periodically
    setInterval(() => this.checkForUpdates(), 5000);
  }

  setupEventListeners() {
    // Send button
    document.getElementById('btnSend').addEventListener('click', () => this.sendMessage());
    
    // Enter key (Shift+Enter for new line)
    document.getElementById('inputText').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    document.getElementById('inputText').addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    });

    // Voice button
    document.getElementById('btnVoice').addEventListener('mousedown', () => this.startRecording());
    document.getElementById('btnVoice').addEventListener('mouseup', () => this.stopRecording());
    document.getElementById('btnVoice').addEventListener('mouseleave', () => this.stopRecording());

    // Upload buttons
    document.getElementById('btnUpload').addEventListener('click', () => this.showUploadModal());
    document.getElementById('btnUploadInline').addEventListener('click', () => this.showUploadModal());
    document.getElementById('btnCloseModal').addEventListener('click', () => this.hideUploadModal());
    document.getElementById('btnUploadFile').addEventListener('click', () => this.uploadFile());
    document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
  }

  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        document.getElementById('inputText').value = transcript;
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    } else {
      console.warn('Speech recognition not supported');
      document.getElementById('btnVoice').style.display = 'none';
    }
  }

  startRecording() {
    if (!this.recognition) return;
    
    this.isRecording = true;
    document.getElementById('btnVoice').classList.add('recording');
    this.recognition.start();
  }

  stopRecording() {
    if (!this.recognition || !this.isRecording) return;
    
    this.isRecording = false;
    document.getElementById('btnVoice').classList.remove('recording');
    this.recognition.stop();
  }

  async sendMessage() {
    const input = document.getElementById('inputText');
    const text = input.value.trim();
    
    if (!text) return;
    if (!this.commandKey) {
      alert('Please set your command key in settings');
      return;
    }

    // Add user message to chat
    this.addMessage('user', text, 'You');
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Send to system
    try {
      const response = await fetch(`${this.apiBase}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey,
        },
        body: JSON.stringify({
          message: text,
          member: 'chatgpt', // Default, can be changed
        }),
      });

      const data = await response.json();
      
      // Extract AI member name
      const aiMember = data.member || 'System';
      const responseText = data.response || data.message || JSON.stringify(data);
      
      // Add AI response
      this.addMessage('ai', responseText, aiMember, data.symbols);
      
      // Update active AIs
      this.activeAIs.add(aiMember);
      await this.updateConferenceView();
      
      // Trigger self-evaluation
      await this.triggerSelfEvaluation(text, responseText);
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('ai', `Error: ${error.message}`, 'System');
    }

    // Save conversation
    this.saveConversation();
    this.scrollToBottom();
  }

  addMessage(type, text, sender, symbols = null) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? 'U' : sender.charAt(0).toUpperCase();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'message-sender';
    senderSpan.textContent = sender;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date().toLocaleTimeString();
    
    header.appendChild(senderSpan);
    if (type === 'ai') {
      const aiName = document.createElement('span');
      aiName.className = 'message-ai-name';
      aiName.textContent = sender;
      header.appendChild(aiName);
    }
    header.appendChild(timeSpan);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    content.appendChild(header);
    content.appendChild(textDiv);
    
    // Show symbols if provided
    if (symbols) {
      const symbolsDiv = document.createElement('div');
      symbolsDiv.className = 'message-symbols';
      symbolsDiv.textContent = `Symbols: ${symbols}`;
      content.appendChild(symbolsDiv);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesDiv.appendChild(messageDiv);
    
    // Store in history
    this.conversationHistory.push({
      type,
      text,
      sender,
      symbols,
      timestamp: new Date().toISOString(),
    });
    
    this.scrollToBottom();
  }

  async updateConferenceView() {
    const conferenceDiv = document.getElementById('conferenceView');
    conferenceDiv.innerHTML = '';
    
    const aiNames = ['ChatGPT', 'Gemini', 'DeepSeek', 'Grok'];
    
    aiNames.forEach(ai => {
      const participant = document.createElement('div');
      participant.className = `ai-participant ${this.activeAIs.has(ai) ? 'speaking' : ''}`;
      
      const indicator = document.createElement('div');
      indicator.className = `ai-indicator ${this.activeAIs.has(ai) ? 'active' : ''}`;
      
      const name = document.createElement('span');
      name.textContent = ai;
      
      participant.appendChild(indicator);
      participant.appendChild(name);
      conferenceDiv.appendChild(participant);
    });
  }

  async loadProjects() {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/tasks/queue`, {
        headers: { 'x-command-key': this.commandKey },
      });
      
      const data = await response.json();
      this.activeProjects = data.tasks || [];
      this.renderProjects();
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  renderProjects() {
    const projectsDiv = document.getElementById('projectsList');
    projectsDiv.innerHTML = '';
    
    this.activeProjects.forEach(project => {
      const item = document.createElement('div');
      item.className = 'project-item';
      item.innerHTML = `
        <div class="project-title">${project.title || project.name}</div>
        <div class="project-progress">
          <div class="project-progress-bar" style="width: ${project.progress || 0}%"></div>
        </div>
        <div class="project-meta">
          <span>${project.status || 'In Progress'}</span>
          <span>ETA: ${project.eta || 'N/A'}</span>
        </div>
      `;
      
      item.addEventListener('click', () => this.selectProject(project));
      projectsDiv.appendChild(item);
    });
  }

  selectProject(project) {
    // Show project details
    console.log('Selected project:', project);
    // Could open a modal or expand view
  }

  async loadDashboard() {
    try {
      // Load ROI data
      const roiResponse = await fetch(`${this.apiBase}/api/v1/roi/status`, {
        headers: { 'x-command-key': this.commandKey },
      });
      const roiData = await roiResponse.json();
      
      if (roiData.roi) {
        document.getElementById('metricROI').textContent = `${roiData.roi.ratio?.toFixed(2) || 0}x`;
        document.getElementById('metricAICost').textContent = `$${roiData.roi.daily_ai_cost?.toFixed(2) || 0}`;
        document.getElementById('metricRevenueGen').textContent = `$${roiData.roi.revenue_generated?.toFixed(2) || 0}`;
      }
      
      // Load financial data
      const financialResponse = await fetch(`${this.apiBase}/api/v1/dashboard`, {
        headers: { 'x-command-key': this.commandKey },
      });
      const financialData = await financialResponse.json();
      
      if (financialData.dashboard) {
        const dash = financialData.dashboard;
        document.getElementById('metricRevenue').textContent = `$${dash.monthly_revenue?.toFixed(2) || 0}`;
        document.getElementById('metricExpenses').textContent = `$${dash.monthly_expenses?.toFixed(2) || 0}`;
        document.getElementById('metricNet').textContent = `$${(dash.monthly_revenue - dash.monthly_expenses)?.toFixed(2) || 0}`;
      }
      
      // Load AI performance
      await this.loadAIPerformance();
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  async loadAIPerformance() {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/ai/performance`, {
        headers: { 'x-command-key': this.commandKey },
      });
      
      const data = await response.json();
      
      if (data.accuracy) {
        document.getElementById('metricAccuracy').textContent = `${(data.accuracy * 100).toFixed(1)}%`;
      }
      
      if (data.self_evaluation) {
        document.getElementById('metricSelfEval').textContent = `${(data.self_evaluation * 100).toFixed(1)}%`;
      }
    } catch (error) {
      // Endpoint might not exist yet
      console.warn('AI performance endpoint not available');
    }
  }

  async triggerSelfEvaluation(userInput, aiResponse) {
    // System evaluates its own response
    try {
      await fetch(`${this.apiBase}/api/v1/ai/self-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey,
        },
        body: JSON.stringify({
          user_input: userInput,
          ai_response: aiResponse,
        }),
      });
    } catch (error) {
      console.warn('Self-evaluation not available');
    }
  }

  showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
  }

  hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        // Store for upload
        this.selectedFile = { file, content };
      };
      reader.readAsText(file);
    }
  }

  async uploadFile() {
    if (!this.selectedFile) {
      alert('Please select a file first');
      return;
    }

    const category = document.getElementById('fileCategory').value;
    const description = document.getElementById('fileDescription').value;

    try {
      const response = await fetch(`${this.apiBase}/api/v1/knowledge/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey,
        },
        body: JSON.stringify({
          filename: this.selectedFile.file.name,
          content: this.selectedFile.content,
          category,
          description,
          businessIdea: category === 'business-ideas',
          securityRelated: category === 'security' || category === 'quantum-proof',
        }),
      });

      const data = await response.json();
      
      if (data.ok) {
        alert('File uploaded successfully!');
        this.hideUploadModal();
        this.selectedFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('fileDescription').value = '';
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      alert('Upload error: ' + error.message);
    }
  }

  saveConversation() {
    localStorage.setItem('lifeos_conversation', JSON.stringify(this.conversationHistory));
  }

  loadConversation() {
    const saved = localStorage.getItem('lifeos_conversation');
    if (saved) {
      try {
        this.conversationHistory = JSON.parse(saved);
        // Render last 50 messages
        const recent = this.conversationHistory.slice(-50);
        recent.forEach(msg => {
          this.addMessage(msg.type, msg.text, msg.sender, msg.symbols);
        });
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    }
  }

  scrollToBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async checkForUpdates() {
    await this.loadProjects();
    await this.loadDashboard();
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.commandCenter = new CommandCenter();
});
