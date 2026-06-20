const luminDrawer = document.getElementById('lumin-drawer');
        const luminDrawerChatHistory = document.getElementById('lumin-drawer-chat-history');
        const luminDrawerInput = document.getElementById('lumin-drawer-input');
        const luminDrawerSendButton = document.getElementById('lumin-drawer-send');

        let luminCurrentThreadId = 'default'; // Shared default thread ID

        function appendLuminMessage(sender, message, prepend = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('chat-message', sender === 'user' ? 'user' : 'lumin');
            messageDiv.textContent = message;
            if (prepend) {
                luminDrawerChatHistory.prepend(messageDiv);
            } else {
                luminDrawerChatHistory.appendChild(messageDiv);
                luminDrawerChatHistory.scrollTop = luminDrawerChatHistory.scrollHeight;
            }
        }

        async function loadLuminChatHistory() {
            try {
                const response = await fetch(`/api/v1/lifeos/chat/threads/${luminCurrentThreadId}/messages`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt')}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const messages = await response.json();
                // Clear existing messages before loading history, except the initial greeting
                const initialGreeting = luminDrawerChatHistory.querySelector('.chat-message.lumin');
                luminDrawerChatHistory.innerHTML = '';
                if (initialGreeting) {
                    luminDrawerChatHistory.appendChild(initialGreeting);
                }

                messages.forEach(msg => {
                    // Append historical messages above the initial greeting if it exists, otherwise just append
                    if (initialGreeting) {
                        luminDrawerChatHistory.insertBefore(appendLuminMessage(msg.sender, msg.content), initialGreeting);
                    } else {
                        appendLuminMessage(msg.sender, msg.content);
                    }
                });
                luminDrawerChatHistory.scrollTop = luminDrawerChatHistory.scrollHeight; // Scroll to bottom after loading history
            } catch (error) {
                console.error('Failed to load Lumin chat history:', error);
                appendLuminMessage('lumin', 'Failed to load chat history in drawer.');
            }
        }

        async function sendLuminMessage() {
            const messageContent = luminDrawerInput.value.trim();
            if (!messageContent) return;

            appendLuminMessage('user', messageContent);
            luminDrawerInput.value = '';

            try {
                const response = await fetch(`/api/v1/lifeos/chat/threads/${luminCurrentThreadId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('jwt')}`
                    },
                    body: JSON.stringify({ sender: 'user', content: messageContent, threadId: luminCurrentThreadId })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reply = await response.json();
                appendLuminMessage(reply.sender, reply.content);

            } catch (error) {
                console.error('Failed to send Lumin message:', error);
                appendLuminMessage('lumin', 'Failed to send message from drawer.');
            }
        }

        luminDrawerSendButton.addEventListener('click', sendLuminMessage);
        luminDrawerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendLuminMessage();
            }
        });

        // This is the extension point for luminBootThread.
        // Assuming luminBootThread is a global function or a property on a global object
        // that is called when the Lumin drawer is opened.
        // We are extending its functionality to load the default thread history.
        const originalLuminBootThread = window.luminBootThread; // Store original if it exists

        window.luminBootThread = function(threadId = 'default') {
            luminCurrentThreadId = threadId; // Ensure the drawer uses the correct thread
            loadLuminChatHistory();
            // Call original luminBootThread if it existed, to preserve other functionalities
            if (originalLuminBootThread && typeof originalLuminBootThread === 'function') {
                originalLuminBootThread(threadId);
            }
            // Also, ensure the drawer is visible (assuming this is part of the 'open' mechanism)
            luminDrawer.classList.add('open');
        };

        // Placeholder for scroll-up loading older messages
        luminDrawerChatHistory.addEventListener('scroll', () => {
            if (luminDrawerChatHistory.scrollTop === 0) {
                console.log('Lumin drawer: Reached top, potentially load older messages.');
            }
        });