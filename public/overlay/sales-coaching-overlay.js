// public/overlay/sales-coaching-overlay.js
// Sales coaching overlay that can be injected into any page

class SalesCoachingOverlay {
  constructor(config = {}) {
    this.apiBase = config.apiBase || window.location.origin;
    this.commandKey = config.commandKey || new URLSearchParams(window.location.search).get('key') || '';
    this.agentId = config.agentId || null;
    this.currentCallId = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    
    this.init();
  }

  init() {
    this.createOverlayUI();
    this.setupEventListeners();
    this.loadAgentInfo();
  }

  createOverlayUI() {
    // Create floating overlay button
    this.overlayButton = document.createElement('div');
    this.overlayButton.id = 'sales-coaching-overlay-btn';
    this.overlayButton.innerHTML = '🎯';
    this.overlayButton.className = 'sales-coaching-btn';
    this.overlayButton.title = 'Sales Coaching Overlay';
    document.body.appendChild(this.overlayButton);

    // Create overlay panel
    this.overlayPanel = document.createElement('div');
    this.overlayPanel.id = 'sales-coaching-panel';
    this.overlayPanel.className = 'sales-coaching-panel';
    this.overlayPanel.innerHTML = this.getPanelHTML();
    document.body.appendChild(this.overlayPanel);

    // Inject styles
    this.injectStyles();
  }

  getPanelHTML() {
    return `
      <div class="coaching-panel-header">
        <h3>🎯 Sales Coaching</h3>
        <button class="coaching-close-btn" id="coachingCloseBtn">×</button>
      </div>
      <div class="coaching-panel-content">
        <div id="coachingStatus" class="coaching-status">
          <div>Status: <span id="recordingStatus">Not Recording</span></div>
          <div id="recordingTimer" style="display: none;">00:00</div>
        </div>
        
        <div class="coaching-controls">
          <button id="startRecordingBtn" class="coaching-btn coaching-btn-primary">Start Recording</button>
          <button id="stopRecordingBtn" class="coaching-btn coaching-btn-danger" style="display: none;">Stop Recording</button>
          <button id="markGoodMomentBtn" class="coaching-btn" style="display: none;">✓ Mark Good Moment</button>
          <button id="markCoachingBtn" class="coaching-btn" style="display: none;">⚠ Mark for Coaching</button>
        </div>

        <div class="coaching-section">
          <h4>Real-Time Coaching</h4>
          <div id="coachingMessages" class="coaching-messages"></div>
        </div>

        <div class="coaching-section">
          <h4>Recent Clips</h4>
          <div id="coachingClips" class="coaching-clips">Loading...</div>
        </div>

        <div class="coaching-section">
          <h4>Bad Habits Detected</h4>
          <div id="badHabits" class="bad-habits">Loading...</div>
        </div>
      </div>
    `;
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sales-coaching-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        transition: transform 0.2s;
      }
      .sales-coaching-btn:hover {
        transform: scale(1.1);
      }
      .sales-coaching-panel {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 400px;
        max-height: 600px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 12px;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        z-index: 10001;
        display: none;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .sales-coaching-panel.active {
        display: block;
      }
      .coaching-panel-header {
        padding: 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .coaching-panel-header h3 {
        margin: 0;
        font-size: 18px;
      }
      .coaching-close-btn {
        background: none;
        border: none;
        color: #e5e7eb;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      .coaching-panel-content {
        padding: 16px;
        overflow-y: auto;
        max-height: 500px;
      }
      .coaching-status {
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 8px;
      }
      .coaching-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 20px;
      }
      .coaching-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      .coaching-btn-primary {
        background: #22c55e;
        color: white;
      }
      .coaching-btn-danger {
        background: #ef4444;
        color: white;
      }
      .coaching-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .coaching-section {
        margin-bottom: 20px;
      }
      .coaching-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #94a3b8;
      }
      .coaching-messages {
        max-height: 150px;
        overflow-y: auto;
        font-size: 12px;
      }
      .coaching-message {
        padding: 8px;
        margin-bottom: 8px;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 6px;
        border-left: 3px solid #4299e1;
      }
      .coaching-message.warning {
        border-left-color: #f59e0b;
      }
      .coaching-message.error {
        border-left-color: #ef4444;
      }
      .coaching-clips, .bad-habits {
        font-size: 12px;
      }
      .coaching-clip-item, .bad-habit-item {
        padding: 8px;
        margin-bottom: 8px;
        background: rgba(30, 41, 59, 0.5);
        border-radius: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Toggle panel
    this.overlayButton.addEventListener('click', () => {
      this.overlayPanel.classList.toggle('active');
    });

    document.getElementById('coachingCloseBtn')?.addEventListener('click', () => {
      this.overlayPanel.classList.remove('active');
    });

    // Start recording
    document.getElementById('startRecordingBtn')?.addEventListener('click', () => {
      this.startRecording();
    });

    // Stop recording
    document.getElementById('stopRecordingBtn')?.addEventListener('click', () => {
      this.stopRecording();
    });

    // Mark moments
    document.getElementById('markGoodMomentBtn')?.addEventListener('click', () => {
      this.markMoment('good');
    });

    document.getElementById('markCoachingBtn')?.addEventListener('click', () => {
      this.markMoment('bad');
    });
  }

  async loadAgentInfo() {
    // Try to get agent ID from localStorage or current page
    const savedAgentId = localStorage.getItem('boldtrail_agent_id');
    if (savedAgentId) {
      this.agentId = parseInt(savedAgentId);
      return;
    }

    // Try to get from email in localStorage
    const email = localStorage.getItem('boldtrail_email');
    if (email && this.commandKey) {
      try {
        const res = await fetch(`${this.apiBase}/api/v1/boldtrail/agent/${encodeURIComponent(email)}?key=${this.commandKey}`);
        const data = await res.json();
        if (data.ok && data.agent) {
          this.agentId = data.agent.id;
          localStorage.setItem('boldtrail_agent_id', data.agent.id);
        }
      } catch (error) {
        console.error('Failed to load agent info:', error);
      }
    }
  }

  async startRecording() {
    if (!this.agentId) {
      alert('Please register in BoldTrail Settings first');
      return;
    }

    try {
      const res = await fetch(`${this.apiBase}/api/v1/boldtrail/start-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey
        },
        body: JSON.stringify({
          agent_id: this.agentId,
          recording_type: 'phone_call' // or 'showing_presentation'
        })
      });

      const data = await res.json();
      
      if (data.ok) {
        this.currentCallId = data.call_id;
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        
        document.getElementById('recordingStatus').textContent = 'Recording...';
        document.getElementById('recordingStatus').style.color = '#ef4444';
        document.getElementById('startRecordingBtn').style.display = 'none';
        document.getElementById('stopRecordingBtn').style.display = 'block';
        document.getElementById('markGoodMomentBtn').style.display = 'block';
        document.getElementById('markCoachingBtn').style.display = 'block';
        document.getElementById('recordingTimer').style.display = 'block';
        
        this.startTimer();
        this.addCoachingMessage('Recording started', 'info');
      } else {
        alert('Failed to start recording: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Start recording error:', error);
      alert('Error starting recording: ' + error.message);
    }
  }

  async stopRecording() {
    if (!this.currentCallId) return;

    try {
      const res = await fetch(`${this.apiBase}/api/v1/boldtrail/stop-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey
        },
        body: JSON.stringify({
          call_id: this.currentCallId
        })
      });

      const data = await res.json();
      
      if (data.ok) {
        this.isRecording = false;
        this.currentCallId = null;
        
        document.getElementById('recordingStatus').textContent = 'Analysis Complete';
        document.getElementById('recordingStatus').style.color = '#22c55e';
        document.getElementById('startRecordingBtn').style.display = 'block';
        document.getElementById('stopRecordingBtn').style.display = 'none';
        document.getElementById('markGoodMomentBtn').style.display = 'none';
        document.getElementById('markCoachingBtn').style.display = 'none';
        document.getElementById('recordingTimer').style.display = 'none';
        
        this.addCoachingMessage('Recording stopped. Analysis complete.', 'info');
        this.loadCoachingClips();
        this.loadBadHabits();
      } else {
        alert('Failed to stop recording: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      alert('Error stopping recording: ' + error.message);
    }
  }

  async markMoment(type) {
    if (!this.currentCallId || !this.isRecording) {
      alert('No active recording');
      return;
    }

    const currentTime = Math.floor((Date.now() - this.recordingStartTime) / 1000);
    const startTime = Math.max(0, currentTime - 30); // Last 30 seconds
    const endTime = currentTime;

    try {
      const res = await fetch(`${this.apiBase}/api/v1/boldtrail/mark-moment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-key': this.commandKey
        },
        body: JSON.stringify({
          call_id: this.currentCallId,
          moment_type: type,
          start_time: startTime,
          end_time: endTime,
          notes: type === 'good' ? 'Marked as good moment' : 'Marked for coaching'
        })
      });

      const data = await res.json();
      
      if (data.ok) {
        this.addCoachingMessage(
          type === 'good' ? '✓ Good moment marked' : '⚠ Coaching moment marked',
          type === 'good' ? 'info' : 'warning'
        );
      }
    } catch (error) {
      console.error('Mark moment error:', error);
    }
  }

  async loadCoachingClips() {
    if (!this.agentId) return;

    try {
      const res = await fetch(`${this.apiBase}/api/v1/boldtrail/coaching-clips/${this.agentId}?limit=5&key=${this.commandKey}`);
      const data = await res.json();
      
      if (data.ok) {
        const clipsDiv = document.getElementById('coachingClips');
        if (data.clips.length === 0) {
          clipsDiv.innerHTML = '<div style="color: #94a3b8; font-size: 12px;">No clips yet</div>';
        } else {
          clipsDiv.innerHTML = data.clips.map(clip => `
            <div class="coaching-clip-item">
              <div><strong>${clip.clip_type === 'good_moment' ? '✓' : '⚠'}</strong> ${clip.technique_detected || 'Moment'}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                ${clip.start_time}s - ${clip.end_time}s
                ${clip.coaching_suggestion ? ` · ${clip.coaching_suggestion.substring(0, 50)}...` : ''}
              </div>
            </div>
          `).join('');
        }
      }
    } catch (error) {
      console.error('Load clips error:', error);
    }
  }

  async loadBadHabits() {
    if (!this.agentId) return;

    try {
      const res = await fetch(`${this.apiBase}/api/v1/boldtrail/technique-patterns/${this.agentId}?pattern_type=bad_habit&key=${this.commandKey}`);
      const data = await res.json();
      
      if (data.ok) {
        const habitsDiv = document.getElementById('badHabits');
        if (data.bad_habits.length === 0) {
          habitsDiv.innerHTML = '<div style="color: #94a3b8; font-size: 12px;">No bad habits detected yet</div>';
        } else {
          habitsDiv.innerHTML = data.bad_habits.map(habit => `
            <div class="bad-habit-item">
              <div><strong>${habit.technique_name}</strong> (${habit.frequency}x detected)</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                Last: ${new Date(habit.last_detected).toLocaleDateString()}
              </div>
            </div>
          `).join('');
        }
      }
    } catch (error) {
      console.error('Load bad habits error:', error);
    }
  }

  addCoachingMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('coachingMessages');
    const messageEl = document.createElement('div');
    messageEl.className = `coaching-message ${type}`;
    messageEl.textContent = message;
    messagesDiv.insertBefore(messageEl, messagesDiv.firstChild);
    
    // Keep only last 5 messages
    while (messagesDiv.children.length > 5) {
      messagesDiv.removeChild(messagesDiv.lastChild);
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(this.timerInterval);
        return;
      }
      
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      document.getElementById('recordingTimer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
  }
}

// Auto-initialize if on BoldTrail page
if (window.location.pathname.includes('boldtrail') || window.location.search.includes('boldtrail')) {
  window.salesCoachingOverlay = new SalesCoachingOverlay({
    apiBase: window.location.origin,
    commandKey: new URLSearchParams(window.location.search).get('key') || ''
  });
}

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SalesCoachingOverlay;
}
