/**
 * SYNOPSIS: LifeOS overlay UI — Lifeos Ambient Listener.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('Web Speech API (SpeechRecognition) not supported in this browser.');
        return;
    }

    let recognition = null;
    let isListening = false;
    let autoSubmitTimeout = null;
    let lastTranscript = '';

    const createToggleButton = () => {
        const luminInputArea = document.querySelector('#lumin-input-area'); // Assuming this is the parent of #lumin-mic-btn
        const existingMicButton = document.querySelector('#lumin-mic-btn');

        if (!luminInputArea) {
            console.error('Lumin input area not found. Ambient listener cannot be initialized.');
            return null;
        }

        const toggleButton = document.createElement('button');
        toggleButton.id = 'lifeos-ambient-mic-toggle';
        toggleButton.innerHTML = `
            <svg class="mic-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.2-3c0 3.53-2.64 6.44-6.2 6.93V21h-2v-3.07c-3.56-.49-6.2-3.4-6.2-6.93h-2c0 4.19 3.34 7.63 7.5 8.16V21h3v-2.09c4.16-.53 7.5-3.97 7.5-8.16h-2z"/>
            </svg>
        `;
        toggleButton.style.cssText = `
            background: var(--color-background-secondary);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius-sm);
            padding: var(--spacing-xs);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-primary);
            transition: background 0.2s ease, border-color 0.2s ease;
            margin-left: var(--spacing-xs);
        `;
        toggleButton.querySelector('.mic-icon').style.cssText = `
            width: 20px;
            height: 20px;
            fill: currentColor;
        `;

        if (existingMicButton && existingMicButton.parentNode === luminInputArea) {
            luminInputArea.insertBefore(toggleButton, existingMicButton.nextSibling);
        } else {
            luminInputArea.appendChild(toggleButton);
        }

        return toggleButton;
    };

    const updateToggleButtonState = () => {
        const toggleButton = document.getElementById('lifeos-ambient-mic-toggle');
        if (toggleButton) {
            if (isListening) {
                toggleButton.style.background = 'var(--color-accent-primary)';
                toggleButton.style.borderColor = 'var(--color-accent-primary-dark)';
                toggleButton.style.color = 'var(--color-text-on-accent)';
            } else {
                toggleButton.style.background = 'var(--color-background-secondary)';
                toggleButton.style.borderColor = 'var(--color-border)';
                toggleButton.style.color = 'var(--color-text-primary)';
            }
        }
    };

    const sendInterimTranscript = async (transcript) => {
        try {
            const response = await fetch('/api/v1/lifeos/ambient/capture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signals: transcript }),
            });
            if (!response.ok && response.status !== 404) {
                console.warn('Failed to send interim transcript:', response.status, response.statusText);
            }
        } catch (error) {
            // Degrade silently if endpoint doesn't exist or network error
            if (error.name !== 'TypeError' || !error.message.includes('Failed to fetch')) {
                console.warn('Error sending interim transcript:', error);
            }
        }
    };

    const startListening = () => {
        if (recognition) {
            recognition.stop();
            recognition = null;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            updateToggleButtonState();
            console.log('Ambient listening started.');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (interimTranscript) {
                // Send interim transcripts to the backend
                sendInterimTranscript(interimTranscript);
            }

            if (finalTranscript) {
                const luminInput = document.querySelector('#lumin-input');
                if (luminInput) {
                    luminInput.value = finalTranscript;
                    lastTranscript = finalTranscript;
                    // Clear any existing auto-submit timeout
                    if (autoSubmitTimeout) {
                        clearTimeout(autoSubmitTimeout);
                    }
                    // Set a new auto-submit timeout
                    autoSubmitTimeout = setTimeout(() => {
                        const sendButton = document.querySelector('#lumin-send');
                        if (sendButton && luminInput.value === lastTranscript) { // Only submit if input hasn't changed
                            sendButton.click();
                            lastTranscript = ''; // Clear after submission
                        }
                    }, 2000); // 2 seconds pause
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateToggleButtonState();
            // Attempt to restart if it's not a user gesture issue
            if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
                setTimeout(startListening, 1000); // Try restarting after a short delay
            }
        };

        recognition.onend = () => {
            console.log('Ambient listening ended.');
            if (isListening) { // If it ended unexpectedly, try to restart
                startListening();
            } else {
                updateToggleButtonState();
            }
        };

        recognition.start();
    };

    const stopListening = () => {
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        isListening = false;
        updateToggleButtonState();
        if (autoSubmitTimeout) {
            clearTimeout(autoSubmitTimeout);
            autoSubmitTimeout = null;
        }
        console.log('Ambient listening stopped.');
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const toggleButton = createToggleButton();
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleListening);
            updateToggleButtonState(); // Set initial state
        }
    });

    // Expose public API
    window.LifeOSAmbientListener = {
        start: startListening,
        stop: stopListening,
        toggle: toggleListening,
        isListening: () => isListening,
    };
})();