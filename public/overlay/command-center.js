/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    COMMAND CENTER - Personal Control Interface                  ║
 * ║                    Conference-style AI communication with full control         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

// AI member identifier mapping
const AI_MEMBERS = {
  chatgpt: { label: "ChatGPT", short: "GPT" },
  gemini: { label: "Gemini", short: "Gem" },
  deepseek: { label: "DeepSeek", short: "DS" },
  grok: { label: "Grok", short: "Grok" },
  claude: { label: "Claude", short: "Cl" }
};

class CommandCenter {
  constructor() {
    this.apiBase = window.location.origin;
    
    // Get key from URL, sessionStorage, or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('key');
    this.commandKey = urlKey || sessionStorage.getItem('lifeos_cmd_key') || localStorage.getItem('lifeos_cmd_key') || '';
    
    // If no key, redirect to activation
    if (!this.commandKey) {
      window.location.href = '/activate';
      return;
    }
    
    // Store key for future use
    if (urlKey) {
      sessionStorage.setItem('lifeos_cmd_key', urlKey);
      localStorage.setItem('lifeos_cmd_key', urlKey);
    }
    
    this.conversationHistory = [];
    this.activeProjects = [];
    this.activeAIs = new Set();
    this.isRecording = false;
    this.recognition = null;
    this.selectedMember = null; // For clicking AI dots
    
    this.init();
  }

  // Normalize member ID to lowercase key
  normalizeMemberId(member) {
    if (!member) return null;
    const normalized = member.toLowerCase();
    return AI_MEMBERS[normalized] ? normalized : null;
  }

  // Get display label for member ID
  getMemberLabel(memberId) {
    if (!memberId) return memberId;
    const normalized = this.normalizeMemberId(memberId);
    return normalized ? AI_MEMBERS[normalized].label : memberId;
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
    
    // Auto-test AI council on load (silent, just updates status)
    this.checkAIStatus();
    
    // Check AI status every 30 seconds
    setInterval(() => this.checkAIStatus(), 30000);
    
    // Check for new messages periodically
    setInterval(() => this.checkForUpdates(), 5000);
  }

  async checkAIStatus() {
    // Quick status check - doesn't show in chat, just updates dots
    try {
      const response = await fetch(`${this.apiBase}/api/v1/ai-council/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey,
        },
      });

      const data = await response.json();

      if (data.ok && data.results) {
        data.results.forEach(result => {
          // Normalize member ID from result
          const memberId = this.normalizeMemberId(result.member);
          if (memberId) {
            const statusEl = document.getElementById(`status-${memberId}`);
            if (statusEl) {
              const dot = statusEl.querySelector('.ai-dot');
              if (dot) {
                if (result.success) {
                  dot.setAttribute('data-status', 'active');
                } else {
                  dot.setAttribute('data-status', 'inactive');
                }
              }
            }
          }
        });
      }
    } catch (error) {
      // Silent fail - just mark all as unknown
      Object.keys(AI_MEMBERS).forEach(memberId => {
        const statusEl = document.getElementById(`status-${memberId}`);
        if (statusEl) {
          const dot = statusEl.querySelector('.ai-dot');
          if (dot) {
            dot.setAttribute('data-status', 'unknown');
          }
        }
      });
    }
  }

  setupEventListeners() {
    // Test AI Council button
    const testBtn = document.getElementById('btnTest');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testAICouncil());
    }

    // Clickable AI status dots - chat with specific AI
    Object.keys(AI_MEMBERS).forEach(memberId => {
      const statusEl = document.getElementById(`status-${memberId}`);
      if (statusEl) {
        statusEl.style.cursor = 'pointer';
        const label = AI_MEMBERS[memberId].label;
        statusEl.title = `Click to chat with ${label}`;
        statusEl.addEventListener('click', () => this.chatWithAI(memberId));
      }
    });

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
    document.getElementById('btnChooseFile').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
    document.getElementById('fileCategory').addEventListener('change', () => this.updateUploadButtonState());

    // Settings button
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => this.showSettingsModal());
    }
    const btnSettingsClose = document.getElementById('btnSettingsClose');
    if (btnSettingsClose) {
      btnSettingsClose.addEventListener('click', () => this.hideSettingsModal());
    }
    const btnSettingsSave = document.getElementById('btnSettingsSave');
    if (btnSettingsSave) {
      btnSettingsSave.addEventListener('click', () => this.saveSettings());
    }
    const btnSettingsClear = document.getElementById('btnSettingsClear');
    if (btnSettingsClear) {
      btnSettingsClear.addEventListener('click', () => this.clearSettings());
    }
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

  chatWithAI(member) {
    // Normalize member ID
    const memberId = this.normalizeMemberId(member);
    if (!memberId) return;
    
    // Focus input and set member
    const input = document.getElementById('inputText');
    input.focus();
    const label = this.getMemberLabel(memberId);
    input.placeholder = `Chat with ${label}...`;
    
    // Store selected member (normalized ID)
    this.selectedMember = memberId;
    
    // Highlight the selected AI
    Object.keys(AI_MEMBERS).forEach(m => {
      const el = document.getElementById(`status-${m}`);
      if (el) {
        el.style.border = m === memberId ? '2px solid #60a5fa' : 'none';
      }
    });
    
    // Show message
    this.addMessage('system', `💬 Now chatting with ${label}. Type your message below.`, 'System');
    this.scrollToBottom();
  }

  async sendMessage() {
    const input = document.getElementById('inputText');
    const text = input.value.trim();
    
    if (!text) return;
    if (!this.commandKey) {
      alert('Please set your command key in settings');
      return;
    }

    // Get selected member or default
    const member = this.selectedMember || 'chatgpt';

    // Check if it's a task command
    const isTaskCommand = text.toLowerCase().startsWith('task:') || 
                         text.toLowerCase().startsWith('do:') ||
                         text.toLowerCase().startsWith('execute:');

    // Add user message to chat
    this.addMessage('user', text, 'You');
    
    // Clear input and reset placeholder
    input.value = '';
    input.style.height = 'auto';
    input.placeholder = 'Type your message or use voice input...';
    this.selectedMember = null;

    // Reset AI highlights
    Object.keys(AI_MEMBERS).forEach(m => {
      const el = document.getElementById(`status-${m}`);
      if (el) {
        el.style.border = 'none';
      }
    });

    // If it's a task, queue it
    if (isTaskCommand) {
      const taskDescription = text.replace(/^(task:|do:|execute:)\s*/i, '').trim();
      
      try {
        const taskResponse = await fetch(`${this.apiBase}/api/v1/task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-command-key': this.commandKey,
          },
          body: JSON.stringify({
            type: 'user_request',
            description: taskDescription,
          }),
        });

        const taskData = await taskResponse.json();
        
        if (taskData.ok) {
          this.addMessage('system', `✅ Task queued! ID: ${taskData.taskId}\n\nTask: ${taskDescription}\n\nStatus: The system will execute this task and report back when complete.`, 'Task Queue');
          
          // Reload projects to show new task
          await this.loadProjects();
        } else {
          this.addMessage('system', `❌ Failed to queue task: ${taskData.error}`, 'Task Queue');
        }
      } catch (error) {
        console.error('Error queueing task:', error);
        this.addMessage('system', `❌ Error: ${error.message}`, 'Task Queue');
      }
      
      this.saveConversation();
      this.scrollToBottom();
      return;
    }

    // Regular chat message
    try {
      const response = await fetch(`${this.apiBase}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey,
        },
        body: JSON.stringify({
          message: text,
          member: member,
        }),
      });

      const data = await response.json();
      
      // Extract and normalize AI member ID
      const rawMember = data.member || member;
      const aiMemberId = this.normalizeMemberId(rawMember) || this.normalizeMemberId(member) || 'chatgpt';
      const responseText = data.response || data.message || JSON.stringify(data);
      
      // Add AI response (use display label for sender)
      const memberLabel = this.getMemberLabel(aiMemberId);
      this.addMessage('ai', responseText, memberLabel, data.symbols);
      
      // Update active AIs (store normalized ID)
      this.activeAIs.add(aiMemberId);
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

  // Render a message to DOM without mutating history
  renderMessage(msg) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.type}`;
    
    // Get display label for AI messages (normalize if needed)
    const displaySender = msg.type === 'ai' ? this.getMemberLabel(msg.sender) : msg.sender;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.type === 'user' ? 'U' : displaySender.charAt(0).toUpperCase();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'message-sender';
    senderSpan.textContent = displaySender;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    // Use saved timestamp if available, otherwise use current time
    if (msg.timestamp) {
      timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString();
    } else {
      timeSpan.textContent = new Date().toLocaleTimeString();
    }
    
    header.appendChild(senderSpan);
    if (msg.type === 'ai') {
      const aiName = document.createElement('span');
      aiName.className = 'message-ai-name';
      aiName.textContent = displaySender;
      header.appendChild(aiName);
    }
    header.appendChild(timeSpan);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = msg.text;
    
    content.appendChild(header);
    content.appendChild(textDiv);
    
    // Show symbols if provided
    if (msg.symbols) {
      const symbolsDiv = document.createElement('div');
      symbolsDiv.className = 'message-symbols';
      symbolsDiv.textContent = `Symbols: ${msg.symbols}`;
      content.appendChild(symbolsDiv);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesDiv.appendChild(messageDiv);
  }

  addMessage(type, text, sender, symbols = null) {
    // Render to DOM
    this.renderMessage({ type, text, sender, symbols });
    
    // Store in history (only function that mutates conversationHistory)
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
    
    // Iterate over AI_MEMBERS to render conference view
    Object.keys(AI_MEMBERS).forEach(memberId => {
      const memberInfo = AI_MEMBERS[memberId];
      const isActive = this.activeAIs.has(memberId);
      
      const participant = document.createElement('div');
      participant.className = `ai-participant ${isActive ? 'speaking' : ''}`;
      
      const indicator = document.createElement('div');
      indicator.className = `ai-indicator ${isActive ? 'active' : ''}`;
      
      const name = document.createElement('span');
      name.textContent = memberInfo.label;
      
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
      if (data.ok) {
        this.activeProjects = data.tasks || [];
        
        // Check for newly completed tasks and notify
        const completedTasks = this.activeProjects.filter(p => p.status === 'completed');
        if (completedTasks.length > 0) {
          completedTasks.forEach(task => {
            // Only notify if we haven't seen this completion before
            const notificationKey = `notified_${task.id}`;
            if (!sessionStorage.getItem(notificationKey)) {
              this.addMessage('system', `✅ Task Completed!\n\n${task.title}\n\nStatus: ${task.status}\n\nYou can refresh to see the results.`, 'Task Complete');
              sessionStorage.setItem(notificationKey, 'true');
            }
          });
        }
      } else {
        this.activeProjects = [];
      }
      this.renderProjects();
    } catch (error) {
      console.error('Error loading projects:', error);
      this.activeProjects = [];
      this.renderProjects();
    }
  }

  renderProjects() {
    const projectsDiv = document.getElementById('projectsList');
    projectsDiv.innerHTML = '';
    
    if (this.activeProjects.length === 0) {
      projectsDiv.innerHTML = '<div style="padding: 12px; color: #9ca3af; font-size: 12px;">No active projects. System will generate ideas automatically.</div>';
      return;
    }
    
    this.activeProjects.forEach(project => {
      const item = document.createElement('div');
      item.className = 'project-item';
      item.innerHTML = `
        <div class="project-title">${this.escapeHtml(project.title || project.name || 'Task')}</div>
        <div class="project-progress">
          <div class="project-progress-bar" style="width: ${project.progress || 0}%"></div>
        </div>
        <div class="project-meta">
          <span>${project.status || 'pending'}</span>
          <span>ETA: ${project.eta || 'Calculating...'}</span>
        </div>
      `;
      
      item.addEventListener('click', () => this.selectProject(project));
      projectsDiv.appendChild(item);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      
      // Load AI effectiveness ratings
      try {
        const effectivenessResponse = await fetch(`${this.apiBase}/api/v1/ai/effectiveness`, {
          headers: { 'x-command-key': this.commandKey },
        });
        const effectivenessData = await effectivenessResponse.json();
        
        if (effectivenessData.ok && effectivenessData.ratings) {
          // Update AI status dots with effectiveness scores
          effectivenessData.ratings.forEach(rating => {
            const memberId = this.normalizeMemberId(rating.member);
            if (memberId) {
              const statusEl = document.getElementById(`status-${memberId}`);
              if (statusEl) {
                // Add effectiveness score as tooltip
                const effectiveness = (rating.effectiveness * 100).toFixed(0);
                const label = this.getMemberLabel(memberId);
                statusEl.title = `${label}: ${effectiveness}% effective (${rating.taskType})`;
              }
            }
          });
        }
      } catch (error) {
        // Effectiveness ratings optional
      }

      // Load user simulation accuracy
      try {
        const simResponse = await fetch(`${this.apiBase}/api/v1/user/simulation/accuracy`, {
          headers: { 'x-command-key': this.commandKey },
        });
        const simData = await simResponse.json();
        
        if (simData.ok) {
          // Could display accuracy somewhere in UI
          console.log(`🎯 User Simulation Accuracy: ${simData.accuracyPercent}%`);
        }
      } catch (error) {
        // User simulation optional
      }
      
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
    // Reset modal state when opening
    this.resetUploadModal();
  }

  hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    // Reset modal state when closing
    this.resetUploadModal();
  }

  resetUploadModal() {
    // Clear file selection
    this.selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileNameDisplay').textContent = 'No file selected';
    document.getElementById('fileDescription').value = '';
    document.getElementById('fileCategory').value = '';
    
    // Disable upload button
    const uploadBtn = document.getElementById('btnUploadFile');
    uploadBtn.disabled = true;
    uploadBtn.style.background = '#4b5563';
    uploadBtn.style.color = '#9ca3af';
    uploadBtn.style.cursor = 'not-allowed';
  }

  showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const baseInput = document.getElementById('settingsBase');
    const keyInput = document.getElementById('settingsKey');
    
    if (modal) {
      // Populate current values
      if (baseInput) {
        baseInput.value = this.apiBase || window.location.origin;
      }
      if (keyInput) {
        // Get from storage (localStorage first, then sessionStorage, then empty)
        keyInput.value = localStorage.getItem('lifeos_cmd_key') || sessionStorage.getItem('lifeos_cmd_key') || '';
      }
      // Clear any previous saved message
      const savedMsg = document.getElementById('settingsSavedMsg');
      if (savedMsg) {
        savedMsg.textContent = '';
        savedMsg.style.display = 'none';
      }
      modal.classList.add('active');
    }
  }

  hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  saveSettings() {
    const keyInput = document.getElementById('settingsKey');
    if (keyInput) {
      const newKey = keyInput.value.trim();
      if (newKey) {
        // Store to both storages
        localStorage.setItem('lifeos_cmd_key', newKey);
        sessionStorage.setItem('lifeos_cmd_key', newKey);
        
        // Update the main command key so app immediately uses it
        this.commandKey = newKey;
        
        // Show saved message
        let savedMsg = document.getElementById('settingsSavedMsg');
        if (!savedMsg) {
          // Create message element if it doesn't exist
          savedMsg = document.createElement('div');
          savedMsg.id = 'settingsSavedMsg';
          savedMsg.style.cssText = 'margin-top: 12px; padding: 8px; background: #1a2332; border: 1px solid #22c55e; border-radius: 6px; color: #22c55e; font-size: 13px; text-align: center;';
          const modalContent = document.querySelector('#settingsModal .modal-content');
          if (modalContent) {
            modalContent.appendChild(savedMsg);
          }
        }
        savedMsg.textContent = '✓ Settings saved';
        savedMsg.style.display = 'block';
        
        // Hide message after 2 seconds
        setTimeout(() => {
          if (savedMsg) {
            savedMsg.style.display = 'none';
          }
        }, 2000);
      }
    }
  }

  clearSettings() {
    // Remove from both storages
    localStorage.removeItem('lifeos_cmd_key');
    sessionStorage.removeItem('lifeos_cmd_key');
    
    // Redirect immediately to activation page
    window.location.href = '/activate';
  }

  updateUploadButtonState() {
    const uploadBtn = document.getElementById('btnUploadFile');
    const hasFile = this.selectedFile !== null;
    const hasCategory = document.getElementById('fileCategory').value.trim() !== '';
    
    if (hasFile && hasCategory) {
      uploadBtn.disabled = false;
      uploadBtn.style.background = '#3b82f6';
      uploadBtn.style.color = 'white';
      uploadBtn.style.cursor = 'pointer';
    } else {
      uploadBtn.disabled = true;
      uploadBtn.style.background = '#4b5563';
      uploadBtn.style.color = '#9ca3af';
      uploadBtn.style.cursor = 'not-allowed';
    }
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    
    if (file) {
      // Show filename
      fileNameDisplay.textContent = `📄 ${file.name}`;
      fileNameDisplay.style.color = '#60a5fa';
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        // Store for upload
        this.selectedFile = { file, content };
        // Update upload button state
        this.updateUploadButtonState();
      };
      reader.onerror = () => {
        fileNameDisplay.textContent = 'Error reading file';
        fileNameDisplay.style.color = '#ef4444';
        this.selectedFile = null;
        this.updateUploadButtonState();
      };
      reader.readAsText(file);
    } else {
      fileNameDisplay.textContent = 'No file selected';
      fileNameDisplay.style.color = '#9ca3af';
      this.selectedFile = null;
      this.updateUploadButtonState();
    }
  }

  async uploadFile() {
    if (!this.selectedFile) {
      alert('Please select a file first');
      return;
    }

    const category = document.getElementById('fileCategory').value.trim();
    if (!category) {
      alert('Please select a category');
      return;
    }

    const description = document.getElementById('fileDescription').value.trim();

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
        // Render last 50 messages using renderMessage (does NOT mutate history)
        const recent = this.conversationHistory.slice(-50);
        recent.forEach(msg => {
          this.renderMessage(msg);
        });
        // Scroll to bottom after rendering
        this.scrollToBottom();
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
