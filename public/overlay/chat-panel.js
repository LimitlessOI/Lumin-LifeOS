// Chat Panel JavaScript

class ChatOverlayManager {
    constructor() {
        this.chatPanel = document.getElementById('chatPanel');
        this.chatIcon = document.getElementById('chatIcon');
        this.isOpen = false;
        this.bindEvents();
    }

    bindEvents() {
        this.chatIcon.addEventListener('click', () => this.toggleChatPanel());
        document.addEventListener('click', (event) => this.handleClickOutside(event));
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    }

    toggleChatPanel() {
        this.isOpen = !this.isOpen;
        this.chatPanel.style.transform = this.isOpen ? 'translateX(0)' : 'translateX(100%)';
        this.chatPanel.style.transition = 'transform 0.3s ease-in-out';
    }

    handleClickOutside(event) {
        if (this.isOpen && !this.chatPanel.contains(event.target) && !this.chatIcon.contains(event.target)) {
            this.toggleChatPanel();
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Escape' && this.isOpen) {
            this.toggleChatPanel();
        }
        if ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'c') {
            this.toggleChatPanel();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatOverlayManager();
});