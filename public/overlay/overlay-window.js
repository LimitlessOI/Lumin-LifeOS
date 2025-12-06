/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OVERLAY WINDOW SYSTEM                                         ║
 * ║                    Lightweight window-like app experience                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * This creates a window-like overlay that can be downloaded and run as a standalone app.
 * Main program runs on servers, overlay provides UI access.
 */

class OverlayWindow {
  constructor(config = {}) {
    this.apiBase = config.apiBase || window.location.origin;
    this.commandKey = config.commandKey || '';
    this.windowId = `overlay_${Date.now()}`;
    this.isMinimized = false;
    this.isMaximized = false;
    this.position = { x: 100, y: 100 };
    this.size = { width: 800, height: 600 };
    this.zIndex = 1000;
    
    this.init();
  }

  init() {
    // Create overlay container
    this.container = document.createElement('div');
    this.container.id = this.windowId;
    this.container.className = 'overlay-window';
    this.applyStyles();
    document.body.appendChild(this.container);

    // Create window chrome
    this.createWindowChrome();
    
    // Create content area
    this.createContentArea();

    // Make draggable
    this.makeDraggable();

    // Load saved position/size
    this.loadSavedState();

    // Check for free trial
    this.checkTrialStatus();
  }

  createWindowChrome() {
    const chrome = document.createElement('div');
    chrome.className = 'overlay-window-chrome';
    
    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'overlay-window-titlebar';
    titleBar.innerHTML = `
      <span class="overlay-window-title">LifeOS Overlay</span>
      <div class="overlay-window-controls">
        <button class="overlay-btn-minimize" title="Minimize">−</button>
        <button class="overlay-btn-maximize" title="Maximize">□</button>
        <button class="overlay-btn-close" title="Close">×</button>
      </div>
    `;
    
    chrome.appendChild(titleBar);
    this.container.appendChild(chrome);

    // Add control handlers
    titleBar.querySelector('.overlay-btn-minimize').addEventListener('click', () => this.minimize());
    titleBar.querySelector('.overlay-btn-maximize').addEventListener('click', () => this.maximize());
    titleBar.querySelector('.overlay-btn-close').addEventListener('click', () => this.close());
  }

  createContentArea() {
    const content = document.createElement('div');
    content.className = 'overlay-window-content';
    
    // Create iframe or embed main overlay
    const iframe = document.createElement('iframe');
    iframe.src = `${this.apiBase}/overlay/index.html`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    content.appendChild(iframe);
    this.container.appendChild(content);
    this.contentArea = content;
  }

  applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .overlay-window {
        position: fixed;
        background: rgba(15, 23, 42, 0.95);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(148, 163, 184, 0.3);
        backdrop-filter: blur(20px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        resize: both;
        min-width: 400px;
        min-height: 300px;
      }

      .overlay-window-chrome {
        flex-shrink: 0;
      }

      .overlay-window-titlebar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(30, 41, 59, 0.8);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        cursor: move;
        user-select: none;
      }

      .overlay-window-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #e5e7eb;
      }

      .overlay-window-controls {
        display: flex;
        gap: 4px;
      }

      .overlay-window-controls button {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .overlay-window-controls button:hover {
        background: rgba(148, 163, 184, 0.2);
        color: #e5e7eb;
      }

      .overlay-window-content {
        flex: 1;
        overflow: hidden;
        background: #0f172a;
      }

      .overlay-window.minimized {
        height: 40px !important;
      }

      .overlay-window.minimized .overlay-window-content {
        display: none;
      }

      .overlay-window.maximized {
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0;
      }
    `;
    document.head.appendChild(style);
  }

  makeDraggable() {
    const titleBar = this.container.querySelector('.overlay-window-titlebar');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = this.container.offsetLeft;
      startTop = this.container.offsetTop;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.position.x = startLeft + deltaX;
      this.position.y = startTop + deltaY;
      
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.saveState();
    };
  }

  minimize() {
    this.isMinimized = !this.isMinimized;
    this.container.classList.toggle('minimized', this.isMinimized);
    this.saveState();
  }

  maximize() {
    this.isMaximized = !this.isMaximized;
    this.container.classList.toggle('maximized', this.isMaximized);
    
    if (this.isMaximized) {
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.container.style.left = '0';
      this.container.style.top = '0';
    } else {
      this.restoreSize();
    }
    this.saveState();
  }

  close() {
    this.container.remove();
    // Could trigger cleanup or hide instead
  }

  restoreSize() {
    this.container.style.width = `${this.size.width}px`;
    this.container.style.height = `${this.size.height}px`;
    this.container.style.left = `${this.position.x}px`;
    this.container.style.top = `${this.position.y}px`;
  }

  saveState() {
    const state = {
      position: this.position,
      size: {
        width: this.container.offsetWidth,
        height: this.container.offsetHeight,
      },
      minimized: this.isMinimized,
      maximized: this.isMaximized,
    };
    localStorage.setItem(`overlay_${this.windowId}_state`, JSON.stringify(state));
  }

  loadSavedState() {
    const saved = localStorage.getItem(`overlay_${this.windowId}_state`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.position = state.position || this.position;
        this.size = state.size || this.size;
        this.isMinimized = state.minimized || false;
        this.isMaximized = state.maximized || false;
        
        this.restoreSize();
        if (this.isMinimized) this.minimize();
        if (this.isMaximized) this.maximize();
      } catch (e) {
        console.warn('Failed to load saved state:', e);
      }
    } else {
      this.restoreSize();
    }
  }

  async checkTrialStatus() {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/trial/status`, {
        headers: {
          'x-command-key': this.commandKey,
        },
      });
      
      const data = await response.json();
      
      if (data.trialActive || data.hasAccess) {
        // Show full features
        return;
      }
      
      // Show trial offer
      if (data.canOfferTrial) {
        this.showTrialOffer();
      }
    } catch (error) {
      console.warn('Failed to check trial status:', error);
    }
  }

  showTrialOffer() {
    const offer = document.createElement('div');
    offer.className = 'overlay-trial-offer';
    offer.innerHTML = `
      <div class="trial-offer-content">
        <h3>Free Trial Available!</h3>
        <p>Try LifeOS features free for 7 days</p>
        <button class="trial-btn-start">Start Free Trial</button>
        <button class="trial-btn-dismiss">Maybe Later</button>
      </div>
    `;
    
    document.body.appendChild(offer);
    
    offer.querySelector('.trial-btn-start').addEventListener('click', () => {
      this.startTrial();
      offer.remove();
    });
    
    offer.querySelector('.trial-btn-dismiss').addEventListener('click', () => {
      offer.remove();
    });
  }

  async startTrial() {
    try {
      const response = await fetch(`${this.apiBase}/api/v1/trial/start`, {
        method: 'POST',
        headers: {
          'x-command-key': this.commandKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'overlay' }),
      });
      
      const data = await response.json();
      if (data.ok) {
        console.log('Trial started!');
        // Reload or refresh features
      }
    } catch (error) {
      console.error('Failed to start trial:', error);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayWindow;
} else {
  window.OverlayWindow = OverlayWindow;
}
